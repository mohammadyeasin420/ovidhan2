"""Build the repository-only Dictionary SEO Phase 2B safety audit.

This tool is deliberately diagnostic. It reads word pages, source data, and
the current sitemap, then writes reports under ``reports/``. It never edits
production HTML, source data, robots directives, or sitemap artifacts.
"""

from __future__ import annotations

import argparse
import gzip
import html
import io
import json
import math
import re
import subprocess
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from generate_word_pages import (
    canonical_word,
    example_candidates,
    nonempty,
    normalize_records,
    select_example,
)


ROOT = Path(__file__).resolve().parent
WORD_DIR = ROOT / "word"
SOURCE_PATH = ROOT / "enriched-dictionary.json"
SITEMAP_PATH = ROOT / "sitemap.xml"
BATCH_REPORT_PATH = ROOT / "reports" / "dictionary-static-seo-batch-0000-0999.json"
REPORT_PATH = ROOT / "reports" / "dictionary-seo-indexability-2b.json"
INVENTORY_PATH = ROOT / "reports" / "dictionary-seo-indexability-2b-inventory.jsonl.gz"
BASE_URL = "https://ovidhan.net"
VALID_SLUG = re.compile(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*\Z")
VALID_POS = {
    "noun",
    "verb",
    "adjective",
    "adverb",
    "pronoun",
    "preposition",
    "conjunction",
    "interjection",
    "determiner",
    "article",
    "numeral",
    "auxiliary verb",
    "modal verb",
    "phrase",
    "idiom",
}
GENERIC_TITLE = re.compile(r"\bOvidhan Learning Explorer\b", re.IGNORECASE)
GENERIC_H1 = re.compile(r"^\s*(?:🔍\s*)?Learning Explorer\s*$", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=32)
    parser.add_argument("--report", type=Path, default=REPORT_PATH)
    parser.add_argument("--inventory", type=Path, default=INVENTORY_PATH)
    parser.add_argument(
        "--reuse-inventory",
        action="store_true",
        help="Regenerate aggregates from an existing detailed inventory.",
    )
    return parser.parse_args()


def normalized_source_filename(entry: dict[str, Any]) -> str | None:
    word = entry.get("english") or entry.get("word") or entry.get("en")
    if not isinstance(word, str) or not word.strip():
        return None
    return re.sub(r"[\s_-]+", "-", word.strip().lower())


def tier_for(entry: dict[str, Any] | None, slug: str) -> tuple[str, int, list[str]]:
    """Return the provisional Phase 2A tier, score, and deterministic flags."""
    if entry is None:
        return "D", 0, ["source-record-missing"]
    if not VALID_SLUG.fullmatch(slug):
        return "D", 0, ["invalid-canonical-slug"]

    bangla = nonempty(entry, "bangla")
    definition = nonempty(entry, "definition")
    pos = (nonempty(entry, "part_of_speech") or "").lower()
    example, _ = select_example(entry, slug)
    if not (bangla or definition):
        return "D", 0, ["no-meaning-or-definition"]

    score = 0
    flags: list[str] = []
    if bangla:
        if bangla.casefold() == slug.replace("-", " ").casefold():
            score += 1
            flags.append("bangla-exactly-duplicates-english")
        else:
            score += 3
    if definition:
        score += 3
        if len(definition) < 20:
            flags.append("short-definition-review")
    if pos in VALID_POS:
        score += 1
    elif pos:
        flags.append("unknown-or-unrecognized-pos")
    else:
        flags.append("pos-missing")
    if example:
        score += 1
    elif example_candidates(entry):
        flags.append("all-source-examples-rejected")
    if len(slug) <= 2:
        flags.append("short-token-review")
    if any(character.isdigit() for character in slug):
        flags.append("digit-bearing-token-review")
    if (nonempty(entry, "editorial_status") or "").lower() == "draft":
        flags.append("editorial-status-draft")

    if score >= 7:
        return "A", score, flags
    if score >= 3:
        return "B", score, flags
    return "C", score, flags


def first_tag_text(page: str, tag: str) -> str | None:
    match = re.search(rf"<{tag}\b[^>]*>(.*?)</{tag}>", page, re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    return html.unescape(re.sub(r"<[^>]+>", "", match.group(1))).strip() or None


def meta_content(page: str, name: str) -> str | None:
    for tag in re.findall(r"<meta\b[^>]*>", page, re.IGNORECASE):
        attrs = dict(
            (key.lower(), html.unescape(value))
            for key, _, value in re.findall(
                r"([:\w-]+)\s*=\s*(['\"])(.*?)\2", tag, re.IGNORECASE | re.DOTALL
            )
        )
        if attrs.get("name", "").lower() == name.lower():
            return attrs.get("content", "").strip()
    return None


def canonical_values(page: str) -> list[str]:
    values = []
    for tag in re.findall(r"<link\b[^>]*>", page, re.IGNORECASE):
        attrs = dict(
            (key.lower(), html.unescape(value))
            for key, _, value in re.findall(
                r"([:\w-]+)\s*=\s*(['\"])(.*?)\2", tag, re.IGNORECASE | re.DOTALL
            )
        )
        if "canonical" in attrs.get("rel", "").lower().split():
            values.append(attrs.get("href", ""))
    return values


def json_ld_status(page: str) -> tuple[bool, str | None, bool]:
    descriptions: list[str] = []
    parse_error = False
    for raw in re.findall(
        r"<script\b[^>]*type=['\"]application/ld\+json['\"][^>]*>(.*?)</script>",
        page,
        re.IGNORECASE | re.DOTALL,
    ):
        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            parse_error = True
            continue
        objects = value if isinstance(value, list) else [value]
        for item in objects:
            if isinstance(item, dict) and item.get("@type") == "DefinedTerm":
                description = item.get("description")
                descriptions.append(description.strip() if isinstance(description, str) else "")
    description = next((value for value in descriptions if value), None)
    return bool(description), description, parse_error


def inspect_word_page(
    path: Path,
    sitemap_urls: set[str],
    batch_paths: set[str],
    source_by_filename: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    rel_path = path.relative_to(ROOT).as_posix()
    slug = path.stem
    url = f"{BASE_URL}/{rel_path}"
    entry = source_by_filename.get(slug)
    tier, score, tier_flags = tier_for(entry, slug)
    item: dict[str, Any] = {
        "path": rel_path,
        "url": url,
        "slug": slug,
        "file_exists": True,
        "in_sitemap": url in sitemap_urls,
        "batch_1": rel_path in batch_paths,
        "tier": tier,
        "tier_score": score,
        "tier_flags": tier_flags,
    }

    try:
        page = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        item.update(
            {
                "read_error": str(exc),
                "migration_class": "MISSING/BROKEN",
                "classification_reasons": ["file-unreadable"],
            }
        )
        return item

    title = first_tag_text(page, "title")
    h1 = first_tag_text(page, "h1")
    canonicals = canonical_values(page)
    robots = meta_content(page, "robots")
    noindex = bool(robots and "noindex" in robots.lower())
    json_ld_description_valid, json_ld_description, json_ld_parse_error = json_ld_status(page)
    static_bangla = 'class="bangla-meaning"' in page or "class='bangla-meaning'" in page
    static_definition = 'class="definition"' in page or "class='definition'" in page
    static_pos = 'class="part-of-speech"' in page or "class='part-of-speech'" in page
    new_static_page = 'class="dictionary-answer"' in page or "class='dictionary-answer'" in page
    useful_without_js = new_static_page and (static_bangla or static_definition)
    self_canonical = canonicals == [url]
    generic_title = not title or bool(GENERIC_TITLE.search(title))
    generic_h1 = not h1 or bool(GENERIC_H1.fullmatch(h1))
    indexability_signals_pass = (
        useful_without_js
        and self_canonical
        and not noindex
        and json_ld_description_valid
        and not generic_title
        and not generic_h1
    )

    implementation_flags = []
    if not self_canonical:
        implementation_flags.append("canonical-missing-or-not-self")
    if noindex:
        implementation_flags.append("noindex")
    if generic_title:
        implementation_flags.append("generic-title")
    if generic_h1:
        implementation_flags.append("generic-h1")
    if not static_bangla:
        implementation_flags.append("static-bangla-missing")
    if not static_definition:
        implementation_flags.append("static-definition-missing")
    if not static_pos:
        implementation_flags.append("static-pos-missing")
    if not json_ld_description_valid:
        implementation_flags.append("json-ld-description-empty-or-missing")
    if json_ld_parse_error:
        implementation_flags.append("json-ld-parse-error")
    if not useful_without_js:
        implementation_flags.append("javascript-only-or-no-static-answer")

    reasons: list[str] = []
    if item["batch_1"]:
        if indexability_signals_pass:
            migration_class = "KEEP-INDEXED"
            reasons.append("batch-1-protected-and-static-validation-signals-pass")
        else:
            migration_class = "REVIEW"
            reasons.append("batch-1-protected-but-page-signal-needs-review")
    elif tier in {"A", "B"}:
        if indexability_signals_pass:
            migration_class = "KEEP-INDEXED"
            reasons.append("tier-a-b-and-static-validation-signals-pass")
        else:
            migration_class = "REVIEW"
            reasons.append("tier-a-b-data-but-legacy-rendering-needs-upgrade")
    elif tier in {"C", "D"} and VALID_SLUG.fullmatch(slug) and entry is not None:
        migration_class = "THIN-LEGACY" if not useful_without_js else "REVIEW"
        reasons.append("tier-c-d-valid-slug-insufficient-data-external-data-required")
    else:
        migration_class = "INVALID/NOISE"
        reasons.append("tier-d-or-invalid-slug-repository-quality-only")

    item.update(
        {
            "legacy_page": not new_static_page,
            "self_canonical": self_canonical,
            "canonical_values": canonicals,
            "robots": robots,
            "noindex": noindex,
            "title": title,
            "h1": h1,
            "generic_title": generic_title,
            "generic_h1": generic_h1,
            "static_bangla": static_bangla,
            "static_definition": static_definition,
            "static_pos": static_pos,
            "json_ld_description_valid": json_ld_description_valid,
            "json_ld_description": json_ld_description,
            "json_ld_parse_error": json_ld_parse_error,
            "useful_without_javascript": useful_without_js,
            "indexability_signals_pass": indexability_signals_pass,
            "implementation_flags": implementation_flags,
            "migration_class": migration_class,
            "classification_reasons": reasons,
        }
    )
    return item


def safe_related_counts(
    entries: dict[str, dict[str, Any]],
    tier_by_slug: dict[str, str],
    file_slugs: set[str],
) -> dict[str, Any]:
    publishable = {
        slug
        for slug, tier in tier_by_slug.items()
        if tier in {"A", "B"} and slug in file_slugs
    }
    fields = ("synonyms", "antonyms", "word_family")
    counts: dict[str, Counter[str]] = {field: Counter() for field in fields}
    source_words_with_safe_links: dict[str, set[str]] = {
        field: set() for field in fields
    }

    for source_slug, entry in entries.items():
        if source_slug not in publishable:
            continue
        for field in fields:
            values = entry.get(field)
            if not isinstance(values, list):
                continue
            seen: set[str] = set()
            for raw in values:
                counts[field]["raw"] += 1
                target = canonical_word({"english": raw}) if isinstance(raw, str) else None
                if not target:
                    counts[field]["invalid"] += 1
                elif target == source_slug:
                    counts[field]["self"] += 1
                elif target in seen:
                    counts[field]["duplicate"] += 1
                elif target not in entries:
                    counts[field]["unresolved"] += 1
                elif target not in publishable:
                    counts[field]["target-not-tier-a-b"] += 1
                else:
                    seen.add(target)
                    counts[field]["safe"] += 1
                    source_words_with_safe_links[field].add(source_slug)

    return {
        field: dict(counts[field])
        | {"source_words_with_safe_links": len(source_words_with_safe_links[field])}
        for field in fields
    }


def az_simulation(
    tier_by_slug: dict[str, str], batch_tiers: dict[str, str], file_slugs: set[str]
) -> dict[str, Any]:
    words = sorted(
        slug
        for slug, tier in tier_by_slug.items()
        if tier in {"A", "B"} and slug in file_slugs
    )
    by_letter: dict[str, list[str]] = defaultdict(list)
    unassigned = []
    for slug in words:
        if slug and "a" <= slug[0] <= "z":
            by_letter[slug[0]].append(slug)
        else:
            unassigned.append(slug)
    per_letter = {}
    for letter in "abcdefghijklmnopqrstuvwxyz":
        count = len(by_letter[letter])
        pages_at_100 = math.ceil(count / 100) if count else 0
        pages_at_150 = math.ceil(count / 150) if count else 0
        pages_at_200 = math.ceil(count / 200) if count else 0
        per_letter[letter] = {
            "words": count,
            "pages_at_100": pages_at_100,
            "pages_at_150": pages_at_150,
            "pages_at_200": pages_at_200,
        }
    protected_outside_ab = sorted(slug for slug, tier in batch_tiers.items() if tier not in {"A", "B"})
    return {
        "letter_hubs": sum(bool(by_letter[letter]) for letter in "abcdefghijklmnopqrstuvwxyz"),
        "tier_a_b_words": len(words),
        "target_links_per_page": "100-200",
        "recommended_150_link_directory_pages": sum(
            item["pages_at_150"] for item in per_letter.values()
        ),
        "minimum_200_link_directory_pages": sum(
            item["pages_at_200"] for item in per_letter.values()
        ),
        "maximum_100_link_directory_pages": sum(
            item["pages_at_100"] for item in per_letter.values()
        ),
        "per_letter": per_letter,
        "unassigned_tier_a_b_words": unassigned,
        "batch_1_tier_c_d_protected_exceptions": protected_outside_ab,
        "orphan_risk": len(unassigned) + len(protected_outside_ab),
    }


def write_inventory(path: Path, inventory: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    buffer = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", fileobj=buffer, mtime=0) as stream:
        for item in inventory:
            stream.write(
                (json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
            )
    path.write_bytes(buffer.getvalue())


def read_inventory(path: Path) -> list[dict[str, Any]]:
    with gzip.open(path, mode="rt", encoding="utf-8") as stream:
        return [json.loads(line) for line in stream if line.strip()]


def main() -> None:
    args = parse_args()
    if args.workers < 1 or args.workers > 64:
        raise SystemExit("--workers must be between 1 and 64")

    source_records = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    normalized, duplicates, invalid_records = normalize_records(source_records)
    canonical_entries = dict(normalized)
    source_by_filename: dict[str, dict[str, Any]] = {}
    for entry in source_records:
        if isinstance(entry, dict):
            filename = normalized_source_filename(entry)
            if filename and filename not in source_by_filename:
                source_by_filename[filename] = entry

    sitemap_xml = SITEMAP_PATH.read_text(encoding="utf-8")
    sitemap_urls = set(re.findall(r"<loc>(.*?)</loc>", sitemap_xml))
    sitemap_loc_count = len(re.findall(r"<loc>(.*?)</loc>", sitemap_xml))
    batch_report = json.loads(BATCH_REPORT_PATH.read_text(encoding="utf-8"))
    batch_paths = set(batch_report["generated_paths"])
    word_paths = sorted(WORD_DIR.glob("*.html"), key=lambda path: path.name)

    if args.reuse_inventory:
        if not args.inventory.is_file():
            raise SystemExit(f"Cannot reuse missing inventory: {args.inventory}")
        print(f"Reusing detailed inventory: {args.inventory}", flush=True)
        inventory = read_inventory(args.inventory)
        # Reapply class semantics when report logic evolves without rereading
        # tens of thousands of unchanged production files. A valid-slug source
        # record with insufficient data is thin, not automatically noise.
        for item in inventory:
            item["indexability_signals_pass"] = bool(
                item.get("useful_without_javascript")
                and item.get("self_canonical")
                and not item.get("noindex")
                and item.get("json_ld_description_valid")
                and not item.get("generic_title")
                and not item.get("generic_h1")
            )
            if (
                not item.get("batch_1")
                and item.get("tier") == "D"
                and VALID_SLUG.fullmatch(item["slug"])
                and "source-record-missing" not in item.get("tier_flags", [])
                and item.get("migration_class") != "MISSING/BROKEN"
            ):
                item["migration_class"] = "THIN-LEGACY"
                item["classification_reasons"] = [
                    "tier-d-valid-slug-insufficient-data-external-data-required"
                ]
    else:
        print(f"Inspecting {len(word_paths)} word files with {args.workers} workers...", flush=True)
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            inventory = list(
                executor.map(
                    lambda path: inspect_word_page(path, sitemap_urls, batch_paths, source_by_filename),
                    word_paths,
                )
            )

    inventory.sort(key=lambda item: item["path"])
    inventory_by_path = {item["path"]: item for item in inventory}
    class_counts = Counter(item["migration_class"] for item in inventory)
    for migration_class in (
        "KEEP-INDEXED",
        "REVIEW",
        "THIN-LEGACY",
        "INVALID/NOISE",
        "MISSING/BROKEN",
    ):
        class_counts[migration_class] += 0
    tier_counts = Counter(item["tier"] for item in inventory)
    for tier in "ABCD":
        tier_counts[tier] += 0
    batch_inventory = [item for item in inventory if item["batch_1"]]
    batch_tier_counts = Counter(item["tier"] for item in batch_inventory)
    batch_class_counts = Counter(item["migration_class"] for item in batch_inventory)
    for tier in "ABCD":
        batch_tier_counts[tier] += 0
    implementation_counts = Counter(
        flag for item in inventory for flag in item.get("implementation_flags", [])
    )
    legacy_inventory = [item for item in inventory if item.get("legacy_page")]
    legacy_implementation_counts = Counter(
        flag for item in legacy_inventory for flag in item.get("implementation_flags", [])
    )

    tier_by_slug = {
        slug: tier_for(entry, slug)[0] for slug, entry in canonical_entries.items()
    }
    file_slugs = {item["slug"] for item in inventory}
    batch_tiers = {item["slug"]: item["tier"] for item in batch_inventory}
    relation_counts = safe_related_counts(canonical_entries, tier_by_slug, file_slugs)
    az = az_simulation(tier_by_slug, batch_tiers, file_slugs)

    sitemap_word_urls = {url for url in sitemap_urls if url.startswith(f"{BASE_URL}/word/")}
    inventory_urls = {item["url"] for item in inventory}
    sitemap_missing_word_urls = sorted(sitemap_word_urls - inventory_urls)
    word_files_not_in_sitemap = sorted(inventory_urls - sitemap_word_urls)
    sitemap_nonword_urls = sorted(sitemap_urls - sitemap_word_urls)
    missing_nonword_urls = []
    for url in sitemap_nonword_urls:
        parsed = urlparse(url)
        rel = parsed.path.lstrip("/") or "index.html"
        if not (ROOT / rel).is_file():
            missing_nonword_urls.append(url)

    keep_urls = sorted(item["url"] for item in inventory if item["migration_class"] == "KEEP-INDEXED")
    review_urls = sorted(item["url"] for item in inventory if item["migration_class"] == "REVIEW")
    a_urls = sorted(item["url"] for item in inventory if item["tier"] == "A")
    ab_urls = sorted(item["url"] for item in inventory if item["tier"] in {"A", "B"})
    protected_urls = sorted(item["url"] for item in batch_inventory)
    ab_plus_protected = sorted(set(ab_urls) | set(protected_urls))

    def word_children(urls: list[str], target: int = 15000) -> dict[str, Any]:
        return {
            "word_urls": len(urls),
            "target_urls_per_child": target,
            "required_children": math.ceil(len(urls) / target) if urls else 0,
            "child_sizes": [len(urls[index : index + target]) for index in range(0, len(urls), target)],
            "duplicates": len(urls) - len(set(urls)),
        }

    preferred_samples = {
        "A": ("a", "about", "are", "academic", "bank", "beautiful"),
        "B": ("ab", "abacus", "abandon", "against", "the", "you"),
        "C": ("abalone", "acclimate", "alex", "bmw", "boisterous", "brusque"),
        "D": ("0", "1million", "diggs", "www", "x000", ".html"),
    }
    by_slug = {item["slug"]: item for item in inventory}
    suspicious_samples = {}
    for tier, slugs in preferred_samples.items():
        suspicious_samples[tier] = [
            {
                "word": item["slug"],
                "score": item["tier_score"],
                "class": item["migration_class"],
                "tier_flags": item["tier_flags"],
                "implementation_flags": item.get("implementation_flags", []),
            }
            for slug in slugs
            if (item := by_slug.get(slug)) is not None and item["tier"] == tier
        ]

    commit_sha = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    branch = subprocess.check_output(
        ["git", "branch", "--show-current"], cwd=ROOT, text=True
    ).strip()

    report = {
        "report": "Ovidhan Dictionary SEO Phase 2B Indexability and Sitemap Migration Safety Audit",
        "repository": "mohammadyeasin420/ovidhan2",
        "starting_sha": commit_sha,
        "branch": branch,
        "external_data_status": "EXTERNAL DATA REQUIRED",
        "inventory": {
            "word_files": len(inventory),
            "read_errors": sum(bool(item.get("read_error")) for item in inventory),
            "new_static_seo_pages": sum(not item.get("legacy_page", True) for item in inventory),
            "legacy_pages": len(legacy_inventory),
            "in_current_sitemap": sum(item["in_sitemap"] for item in inventory),
            "not_in_current_sitemap": sum(not item["in_sitemap"] for item in inventory),
            "sitemap_word_urls_without_file": len(sitemap_missing_word_urls),
            "sitemap_word_urls_without_file_examples": sitemap_missing_word_urls[:100],
            "word_files_not_in_sitemap_examples": word_files_not_in_sitemap[:100],
            "detailed_inventory": args.inventory.relative_to(ROOT).as_posix(),
        },
        "migration_classes": {
            "definitions": {
                "KEEP-INDEXED": "Batch 1 protected or Tier A/B page with static useful content, self canonical, no noindex, and a nonempty DefinedTerm description.",
                "REVIEW": "Potentially useful data or protected URL, but rendering, metadata, tier anomaly, or another repository-only signal requires review.",
                "THIN-LEGACY": "Tier C or valid-slug Tier D legacy page with weak/absent repository content; no indexability action without external performance/link data.",
                "INVALID/NOISE": "Invalid slug or missing-source repository signal; external data still required before URL action.",
                "MISSING/BROKEN": "Sitemap target missing on disk or page unreadable.",
            },
            "counts": dict(class_counts),
            "manifests": {
                migration_class: [item["url"] for item in inventory if item["migration_class"] == migration_class]
                for migration_class in (
                    "KEEP-INDEXED",
                    "REVIEW",
                    "THIN-LEGACY",
                    "INVALID/NOISE",
                    "MISSING/BROKEN",
                )
            },
        },
        "tiers": {
            "scoring": {
                "bangla_distinct": 3,
                "bangla_exact_english": 1,
                "definition": 3,
                "recognized_pos": 1,
                "accepted_example": 1,
                "A": "score >= 7",
                "B": "score 3-6",
                "C": "score 1-2",
                "D": "invalid/duplicate/no meaning and no definition",
            },
            "counts_for_word_files": dict(tier_counts),
            "manual_review_samples": suspicious_samples,
            "manual_review_conclusions": [
                "Tier A can still overrate questionable primary senses or POS assignments; completeness is not editorial correctness.",
                "Tier B mixes useful Bangla-only learner entries with abbreviations and unknown-POS records.",
                "Tier C includes useful words with exact English/Bangla duplication or incomplete source fields, including protected Batch 1 pages.",
                "Tier D mixes obvious invalid/noise tokens with valid words that merely lack repository content; those cases must not share automatic SEO treatment.",
            ],
            "conclusion": "Scoring is a prioritization input, not sufficient for indexability. Deterministic risk flags and human review remain required.",
            "additional_safeguards": [
                "Require supported canonical slug and unique source record.",
                "Protect Batch 1 URLs from automatic exclusion regardless of provisional tier.",
                "Require static useful content, self canonical, valid nonempty JSON-LD, and no noindex for KEEP-INDEXED.",
                "Flag exact English/Bangla duplication, missing or unknown POS, short tokens, digit-bearing tokens, short definitions, and draft editorial status.",
                "Reject synthetic examples rather than rewriting them.",
                "Require human review for abbreviations, proper names, obscure/noise terms, transliterations, questionable primary senses, and questionable POS.",
                "Require external search/backlink evidence before mass noindex, removal, or sitemap exclusion.",
            ],
        },
        "batch_1_protection": {
            "expected_pages": 1000,
            "found_pages": len(batch_inventory),
            "tier_counts": dict(batch_tier_counts),
            "migration_class_counts": dict(batch_class_counts),
            "indexability_signal_failure_counts": dict(
                Counter(
                    flag
                    for item in batch_inventory
                    for flag in item.get("implementation_flags", [])
                    if flag
                    in {
                        "canonical-missing-or-not-self",
                        "noindex",
                        "generic-title",
                        "generic-h1",
                        "json-ld-description-empty-or-missing",
                        "json-ld-parse-error",
                        "javascript-only-or-no-static-answer",
                    }
                )
            ),
            "all_indexability_signals_pass": all(
                item.get("indexability_signals_pass") for item in batch_inventory
            ),
            "non_keep_urls": [item["url"] for item in batch_inventory if item["migration_class"] != "KEEP-INDEXED"],
            "policy": "All Batch 1 URLs are protected from automatic exclusion; Tier C/D results are REVIEW signals, not removal instructions.",
        },
        "legacy_quality": {
            "legacy_pages": len(legacy_inventory),
            "implementation_problem_counts": dict(legacy_implementation_counts),
            "all_page_implementation_problem_counts": dict(implementation_counts),
            "data_quality_counts": {
                "tier_C": tier_counts.get("C", 0),
                "tier_D": tier_counts.get("D", 0),
                "source_record_missing": sum(
                    "source-record-missing" in item["tier_flags"] for item in inventory
                ),
                "bangla_exactly_duplicates_english": sum(
                    "bangla-exactly-duplicates-english" in item["tier_flags"] for item in inventory
                ),
                "unknown_or_unrecognized_pos": sum(
                    "unknown-or-unrecognized-pos" in item["tier_flags"] for item in inventory
                ),
            },
        },
        "sitemap_simulation": {
            "current": {
                "loc_count": sitemap_loc_count,
                "unique_urls": len(sitemap_urls),
                "duplicates": sitemap_loc_count - len(sitemap_urls),
                "word_urls": len(sitemap_word_urls),
                "nonword_urls": len(sitemap_nonword_urls),
                "missing_word_urls": len(sitemap_missing_word_urls),
                "missing_nonword_urls": len(missing_nonword_urls),
                "missing_nonword_url_examples": missing_nonword_urls[:100],
            },
            "threshold_A_only": word_children(a_urls),
            "threshold_A_B": word_children(ab_urls),
            "threshold_A_B_plus_batch_1_protection": word_children(ab_plus_protected),
            "currently_keep_indexed": word_children(keep_urls),
            "requiring_review": len(review_urls),
            "potentially_excluded_A_only": len(inventory_urls - set(a_urls)),
            "potentially_excluded_A_B": len(inventory_urls - set(ab_urls)),
            "potentially_excluded_A_B_plus_batch_1": len(inventory_urls - set(ab_plus_protected)),
            "pages_child_urls": len(sitemap_nonword_urls),
            "production_artifacts_written": False,
        },
        "az_directory_simulation": az,
        "related_link_simulation": relation_counts,
        "external_data_requirements": [
            {
                "data": "Google Search Console URL-level clicks, impressions, CTR, average position, and queries",
                "decision_use": "Protect URLs with demonstrated search demand and identify query-to-content mismatches before exclusion.",
            },
            {
                "data": "Google indexed-page counts and URL Inspection coverage states",
                "decision_use": "Separate indexed, discovered-not-indexed, crawled-not-indexed, duplicate, and canonicalized URLs.",
            },
            {
                "data": "Googlebot crawl statistics and server/CDN logs",
                "decision_use": "Measure crawl waste and determine whether thin legacy URLs consume meaningful crawl capacity.",
            },
            {
                "data": "External backlink and referring-domain data",
                "decision_use": "Prevent removal/noindex of URLs carrying external authority; design redirects only with evidence.",
            },
            {
                "data": "Analytics landing-page engagement and conversions",
                "decision_use": "Retain pages that serve learners even when search impressions are low.",
            },
            {
                "data": "Reliable keyword demand for Bangladesh and target exam audiences",
                "decision_use": "Prioritize future upgrades without fabricating search volume.",
            },
        ],
        "risks": [
            "Repository quality is not evidence of current Google value, rankings, backlinks, or historical demand.",
            "Legacy JavaScript-only pages can have useful source data but weak initial HTML and empty structured-data descriptions.",
            "Tier scoring can overrate questionable definitions/POS and underrate useful short or transliterated entries.",
            "Mass sitemap exclusion or noindex based only on this report could destroy unknown search or link value.",
            "Directory generation from unreviewed tiers could amplify thin or noisy URLs.",
        ],
        "recommended_migration_policy": [
            "Freeze automatic indexability changes.",
            "Keep all Batch 1 URLs protected.",
            "Combine repository classes with Search Console, backlink, crawl, and analytics evidence.",
            "Upgrade reviewed Tier A/B legacy pages to static answers before adding them to the future word sitemap.",
            "Pilot exclusions/noindex only on a small externally verified zero-value cohort with monitoring and rollback.",
            "Generate sitemap index/children only from an approved URL manifest; do not infer approval from file existence.",
        ],
        "validation": {
            "inventory_urls_unique": len(inventory_urls) == len(inventory),
            "inventory_count_matches_files": len(inventory) == len(word_paths),
            "batch_1_count_is_1000": len(batch_inventory) == 1000,
            "class_counts_sum_to_inventory": sum(class_counts.values()) == len(inventory),
            "tier_counts_sum_to_inventory": sum(tier_counts.values()) == len(inventory),
            "current_sitemap_has_no_duplicates": sitemap_loc_count == len(sitemap_urls),
            "no_production_artifacts_written": True,
        },
        "exact_files_changed": [
            "audit_dictionary_indexability.py",
            args.report.relative_to(ROOT).as_posix(),
            args.inventory.relative_to(ROOT).as_posix(),
        ],
        "commit_sha": "See the containing Git commit and final handoff; a commit cannot embed its own final SHA.",
        "push_status": "Pending at report generation; final handoff is authoritative.",
        "recommended_phase_2c": "Join repository classes with external evidence, approve a protected URL manifest, then pilot static upgrades and sitemap splitting without mass indexability changes.",
    }

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_inventory(args.inventory, inventory)
    print(
        json.dumps(
            {
                "word_files": len(inventory),
                "classes": dict(class_counts),
                "tiers": dict(tier_counts),
                "batch_1_tiers": dict(batch_tier_counts),
                "legacy_pages": len(legacy_inventory),
                "report": args.report.relative_to(ROOT).as_posix(),
                "inventory": args.inventory.relative_to(ROOT).as_posix(),
            },
            ensure_ascii=False,
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
