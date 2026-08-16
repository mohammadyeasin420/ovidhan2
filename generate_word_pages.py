"""Controlled static dictionary page generator.

Generation is forbidden unless one explicit mode is supplied: ``--words``,
``--batch-start`` plus ``--batch-size``, or ``--full``.
"""

import argparse
import csv
import hashlib
import html
import json
import re
from pathlib import Path


SOURCE_PATH = Path("enriched-dictionary.json")
OUTPUT_DIR = Path("word")
HEADER_PATH = Path("header.html")
FOOTER_PATH = Path("footer.html")
SLUG_RE = re.compile(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*\Z")
PHASE2F_MANIFEST_SHA256 = "48649a0157e2d6b206ba8275d5fe774c0d0609cf478aeee59bf8dd2cd3fabc7f"
PHASE2F_TREATMENT_COUNT = 72
MANIFEST_BOOLEAN_FIELDS = (
    "allowlisted", "publish_bangla", "publish_definition", "publish_part_of_speech",
    "publish_example", "publish_synonyms", "publish_antonyms", "publish_word_family",
    "publish_pronunciation", "manifest_frozen",
)


def nonempty(entry, field):
    value = entry.get(field)
    return value.strip() if isinstance(value, str) and value.strip() else None


def canonical_word(entry):
    word = entry.get("english") or entry.get("word") or entry.get("en")
    if not isinstance(word, str):
        return None
    normalized = re.sub(r"[\s_-]+", "-", word.strip().lower())
    return normalized if normalized and SLUG_RE.fullmatch(normalized) else None


def normalize_records(records):
    by_slug = {}
    duplicate_records = []
    invalid_records = []
    for index, entry in enumerate(records):
        if not isinstance(entry, dict):
            invalid_records.append({"index": index, "value_type": type(entry).__name__})
            continue
        slug = canonical_word(entry)
        if not slug:
            invalid_records.append({"index": index, "english": entry.get("english")})
            continue
        if slug in by_slug:
            duplicate_records.append({"slug": slug, "kept_index": by_slug[slug][0], "duplicate_index": index})
            continue
        by_slug[slug] = (index, entry)
    normalized = [(slug, by_slug[slug][1]) for slug in sorted(by_slug)]
    return normalized, duplicate_records, invalid_records


def is_publishable(entry):
    """A static dictionary answer needs a real definition or Bangla meaning."""
    return bool(nonempty(entry, "definition") or nonempty(entry, "bangla"))


def load_site_layout():
    """Load the authoritative production header and footer fragments."""
    header = HEADER_PATH.read_text(encoding="utf-8").strip()
    footer = FOOTER_PATH.read_text(encoding="utf-8").strip()
    if header.count('<header class="site-header">') != 1 or header.count('<footer'):
        raise ValueError(f"Invalid authoritative header fragment: {HEADER_PATH}")
    if footer.count('<footer class="site-footer">') != 1 or footer.count('<header'):
        raise ValueError(f"Invalid authoritative footer fragment: {FOOTER_PATH}")
    return header, footer


def example_candidates(entry):
    candidates = []
    example = nonempty(entry, "example")
    if example:
        candidates.append(example)
    examples = entry.get("examples")
    if isinstance(examples, list):
        candidates.extend(item.strip() for item in examples if isinstance(item, str) and item.strip())
    return candidates


def example_rejection_reason(example, word, part_of_speech):
    escaped_word = re.escape(word)
    patterns = (
        (rf"Can you use ['\"]{escaped_word}['\"] in a sentence\?", "use-in-a-sentence prompt"),
        (rf"I know the word ['\"]{escaped_word}['\"]\.", "word-knowledge filler"),
        (rf"Learning ['\"]{escaped_word}['\"] helps your vocabulary\.", "vocabulary filler"),
        (rf"['\"]{escaped_word}['\"] is common in English\.", "common-in-English filler"),
    )
    for pattern, reason in patterns:
        if re.fullmatch(pattern, example, flags=re.IGNORECASE):
            return reason

    # This source template is synthetic rather than a useful usage example. It
    # also produces obvious article, countability, and part-of-speech errors
    # (for example, "This is a academic." and "This is a against."). Reject
    # the exact template instead of attempting to rewrite or grammar-correct it.
    if re.fullmatch(rf"This is a {escaped_word}\.", example, flags=re.IGNORECASE):
        return "synthetic article template"
    return None


def select_example(entry, word):
    rejected = []
    part_of_speech = (nonempty(entry, "part_of_speech") or "").lower()
    for candidate in example_candidates(entry):
        reason = example_rejection_reason(candidate, word, part_of_speech)
        if reason:
            rejected.append({"example": candidate, "reason": reason})
        else:
            return candidate, rejected
    return None, rejected


def render_page(slug, entry, header_html=None, footer_html=None, publication=None):
    if header_html is None or footer_html is None:
        header_html, footer_html = load_site_layout()
    source_word = nonempty(entry, "english") or nonempty(entry, "word") or nonempty(entry, "en") or slug
    word = source_word.strip().lower()
    source_bangla = nonempty(entry, "bangla")
    source_part_of_speech = nonempty(entry, "part_of_speech")
    source_definition = nonempty(entry, "definition")
    source_pronunciation = nonempty(entry, "pronunciation")
    source_example, rejected_examples = select_example(entry, slug)
    if publication is None:
        bangla, part_of_speech, definition = source_bangla, source_part_of_speech, source_definition
        pronunciation, example = source_pronunciation, source_example
        synonyms = antonyms = word_family = []
    else:
        bangla = source_bangla if publication["publish_bangla"] else None
        definition = source_definition if publication["publish_definition"] else None
        part_of_speech = source_part_of_speech if publication["publish_part_of_speech"] else None
        pronunciation = source_pronunciation if publication["publish_pronunciation"] else None
        example = source_example if publication["publish_example"] else None
        synonyms = publication["publish_synonym_values"] if publication["publish_synonyms"] else []
        antonyms = publication["publish_antonym_values"] if publication["publish_antonyms"] else []
        word_family = publication["publish_word_family_values"] if publication["publish_word_family"] else []

    canonical = f"https://ovidhan.net/word/{slug}.html"
    title = f"{word} Meaning in Bangla | Ovidhan"
    if bangla:
        meta_description = f"{word} meaning in Bangla: {bangla}."
        if definition:
            meta_description += f" Definition: {definition}."
    elif definition:
        meta_description = f"Learn the definition of {word}: {definition}."
    else:
        raise ValueError(f"Refusing to publish {slug!r} without a verified definition or Bangla meaning")

    details = []
    for label, value, css_class, language in (
        ("Bangla meaning", bangla, "bangla-meaning", ' lang="bn"'),
        ("Part of speech", part_of_speech, "part-of-speech", ""),
        ("Pronunciation", pronunciation, "pronunciation", ""),
        ("Definition", definition, "definition", ""),
        ("Example", example, "example", ""),
    ):
        if value:
            details.append(
                f'        <p class="{css_class}"><strong>{label}:</strong> '
                f'<span{language}>{html.escape(value)}</span></p>'
            )
    for label, values, css_class in (
        ("Synonyms", synonyms, "synonyms"),
        ("Antonyms", antonyms, "antonyms"),
        ("Word family", word_family, "word-family"),
    ):
        if values:
            details.append(
                f'        <p class="{css_class}"><strong>{label}:</strong> '
                f'<span>{html.escape(", ".join(values))}</span></p>'
            )

    defined_term = {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        "name": word,
        "description": definition or bangla or meta_description,
        "url": canonical,
        "inLanguage": ["en", "bn"] if bangla else "en",
    }
    if bangla:
        defined_term["alternateName"] = bangla
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://ovidhan.net/"},
            {"@type": "ListItem", "position": 2, "name": "Dictionary", "item": "https://ovidhan.net/dictionary.html"},
            {"@type": "ListItem", "position": 3, "name": word, "item": canonical},
        ],
    }

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html.escape(title)}</title>
    <meta name="description" content="{html.escape(meta_description, quote=True)}">
    <link rel="stylesheet" href="../styles.css">
    <link rel="canonical" href="{canonical}">
    <script type="application/ld+json">{json.dumps(breadcrumb, ensure_ascii=False, indent=2)}</script>
    <script type="application/ld+json">{json.dumps(defined_term, ensure_ascii=False, indent=2)}</script>
</head>
<body>
{header_html}
    <main>
    <article class="dictionary-answer" style="padding:2rem;">
        <h1>{html.escape(word)} meaning in Bangla</h1>
{chr(10).join(details)}
    </article>
    <div class="explorer-container" style="padding:2rem;">
        <h2>🔍 Learning Explorer</h2>
        <div class="search-box">
            <input type="text" id="wordInput" placeholder="Type a word..." value="{html.escape(word, quote=True)}">
            <button onclick="searchWord()" class="btn-primary">Search</button>
        </div>
        <div id="resultArea"></div>
    </div>
    </main>
    <script src="../learning-explorer.js"></script>
{footer_html}
</body>
</html>
"""
    return page, rejected_examples, bool(example)


def parse_manifest_bool(row, field, row_number):
    value = str(row.get(field, "")).strip().lower()
    if value not in {"true", "false"}:
        raise SystemExit(f"Treatment manifest row {row_number}: {field} must be true or false")
    return value == "true"


def parse_approved_values(row, field):
    return [item.strip() for item in str(row.get(field, "")).split(";") if item.strip()]


def load_phase2f_manifest(path, normalized):
    manifest_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    if manifest_hash != PHASE2F_MANIFEST_SHA256:
        raise SystemExit(
            f"Phase 2F treatment manifest hash mismatch: {manifest_hash}; expected {PHASE2F_MANIFEST_SHA256}"
        )
    with path.open(encoding="utf-8-sig", newline="") as manifest_file:
        rows = list(csv.DictReader(manifest_file))
    if len(rows) != PHASE2F_TREATMENT_COUNT:
        raise SystemExit(f"Phase 2F requires exactly {PHASE2F_TREATMENT_COUNT} manifest rows")
    available = dict(normalized)
    selected = []
    seen = set()
    source_relation_fields = {
        "publish_synonym_values": "synonyms",
        "publish_antonym_values": "antonyms",
        "publish_word_family_values": "word_family",
    }
    for row_number, row in enumerate(rows, 2):
        parsed = {field: parse_manifest_bool(row, field, row_number) for field in MANIFEST_BOOLEAN_FIELDS}
        slug = str(row.get("word", "")).strip()
        expected_url = f"https://ovidhan.net/word/{slug}.html"
        expected_path = f"word/{slug}.html"
        if not SLUG_RE.fullmatch(slug) or row.get("url") != expected_url or row.get("path") != expected_path:
            raise SystemExit(f"Treatment manifest row {row_number}: invalid canonical word/url/path")
        if slug in seen or slug not in available:
            raise SystemExit(f"Treatment manifest row {row_number}: duplicate or missing source word {slug!r}")
        if not parsed["allowlisted"] or not parsed["manifest_frozen"]:
            raise SystemExit(f"Treatment manifest row {row_number}: row is not frozen and allowlisted")
        if row.get("classification") not in {"APPROVE", "APPROVE_WITH_OMISSIONS"}:
            raise SystemExit(f"Treatment manifest row {row_number}: classification is not approved")
        if parsed["publish_pronunciation"]:
            raise SystemExit(f"Treatment manifest row {row_number}: pronunciation publication is forbidden")
        entry = available[slug]
        for flag, source_field in (("publish_bangla", "bangla"), ("publish_definition", "definition"), ("publish_part_of_speech", "part_of_speech")):
            if parsed[flag] and not nonempty(entry, source_field):
                raise SystemExit(f"Treatment manifest row {row_number}: approved {source_field} is missing")
        if parsed["publish_example"]:
            example, rejected = select_example(entry, slug)
            if not example or rejected:
                raise SystemExit(f"Treatment manifest row {row_number}: approved example is missing or rejected")
        for values_field, source_field in source_relation_fields.items():
            values = parse_approved_values(row, values_field)
            parsed[values_field] = values
            flag = values_field.replace("_values", "s") if values_field == "publish_synonym_values" else values_field.replace("_values", "")
            expected_flag = {"publish_synonym_values": "publish_synonyms", "publish_antonym_values": "publish_antonyms", "publish_word_family_values": "publish_word_family"}[values_field]
            if bool(values) != parsed[expected_flag]:
                raise SystemExit(f"Treatment manifest row {row_number}: {values_field} does not match its publication flag")
            source_values = {str(item).strip().casefold() for item in entry.get(source_field, []) if isinstance(item, str)}
            if any(value.casefold() not in source_values for value in values):
                raise SystemExit(f"Treatment manifest row {row_number}: approved relation is not present in source")
        if not (parsed["publish_bangla"] or parsed["publish_definition"]):
            raise SystemExit(f"Treatment manifest row {row_number}: no approved static answer")
        parsed.update({"classification": row["classification"], "future_omissions": row.get("future_omissions", "")})
        selected.append((slug, entry, parsed))
        seen.add(slug)
    return selected, manifest_hash


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--words", nargs="+", help="Generate only these explicit canonical words.")
    parser.add_argument("--batch-start", type=int, help="Zero-based start in stable canonical-word order.")
    parser.add_argument("--batch-size", type=int, help="Number of unique pages in the controlled batch.")
    parser.add_argument("--full", action="store_true", help="Explicitly generate every valid unique record.")
    parser.add_argument(
        "--phase2f-treatment-manifest", type=Path,
        help="Generate only the frozen Phase 2F treatment manifest; its approved SHA-256 and 72-row count are mandatory.",
    )
    parser.add_argument("--report", type=Path, help="Write a JSON generation manifest and statistics report.")
    return parser.parse_args()


def select_mode(args, normalized):
    batch_supplied = args.batch_start is not None or args.batch_size is not None
    mode_count = int(bool(args.words)) + int(batch_supplied) + int(args.full) + int(bool(args.phase2f_treatment_manifest))
    if mode_count != 1:
        raise SystemExit("Supply exactly one mode: --words, --batch-start with --batch-size, --full, or --phase2f-treatment-manifest.")

    if args.phase2f_treatment_manifest:
        selected, manifest_hash = load_phase2f_manifest(args.phase2f_treatment_manifest, normalized)
        return "phase2f-treatment-manifest", selected, manifest_hash

    if args.words:
        requested = []
        seen = set()
        available = {slug: entry for slug, entry in normalized if is_publishable(entry)}
        for raw_word in args.words:
            slug = canonical_word({"english": raw_word})
            if not slug:
                raise SystemExit(f"Invalid explicit word: {raw_word!r}")
            if slug not in available:
                raise SystemExit(f"Word not found in source: {raw_word!r}")
            if slug not in seen:
                requested.append((slug, available[slug]))
                seen.add(slug)
        return "words", [(slug, entry, None) for slug, entry in requested], None

    if batch_supplied:
        if args.batch_start is None or args.batch_size is None:
            raise SystemExit("Batch mode requires both --batch-start and --batch-size.")
        if args.batch_start < 0 or args.batch_size <= 0:
            raise SystemExit("--batch-start must be >= 0 and --batch-size must be > 0.")
        end = args.batch_start + args.batch_size
        publishable = [(slug, entry) for slug, entry in normalized if is_publishable(entry)]
        selected = publishable[args.batch_start:end]
        if len(selected) != args.batch_size:
            raise SystemExit(f"Requested {args.batch_size} pages but only {len(selected)} are available in that range.")
        return "batch", [(slug, entry, None) for slug, entry in selected], None

    return "full", [(slug, entry, None) for slug, entry in normalized if is_publishable(entry)], None


def full_quality_stats(records, normalized, duplicate_records, invalid_records):
    fields = {
        "bangla_missing": "bangla",
        "definition_missing": "definition",
        "pos_missing": "part_of_speech",
        "pronunciation_missing": "pronunciation",
    }
    stats = {name: sum(not nonempty(entry, field) for entry in records if isinstance(entry, dict)) for name, field in fields.items()}
    stats["example_missing"] = sum(not example_candidates(entry) for entry in records if isinstance(entry, dict))
    rejected = 0
    for slug, entry in normalized:
        part_of_speech = (nonempty(entry, "part_of_speech") or "").lower()
        rejected += sum(bool(example_rejection_reason(example, slug, part_of_speech)) for example in example_candidates(entry))
    stats.update({
        "obvious_bad_examples": rejected,
        "duplicate_english_records": len(duplicate_records),
        "invalid_or_unsluggable_records": len(invalid_records),
    })
    return stats


def main():
    args = parse_args()
    with SOURCE_PATH.open(encoding="utf-8") as source:
        records = json.load(source)
    if not isinstance(records, list):
        raise SystemExit("Source JSON must contain a list of dictionary records.")

    normalized, duplicates, invalid = normalize_records(records)
    publishable_count = sum(is_publishable(entry) for _, entry in normalized)
    mode, selected, manifest_hash = select_mode(args, normalized)
    quality = full_quality_stats(records, normalized, duplicates, invalid)
    header_html, footer_html = load_site_layout()

    OUTPUT_DIR.mkdir(exist_ok=True)
    generated_paths = []
    rejected_in_selection = []
    published_examples = 0
    publication_decisions = {}
    for slug, entry, publication in selected:
        page, rejected, has_example = render_page(slug, entry, header_html, footer_html, publication)
        path = OUTPUT_DIR / f"{slug}.html"
        path.write_text(page, encoding="utf-8")
        generated_paths.append(path.as_posix())
        published_examples += int(has_example)
        rejected_in_selection.extend({"word": slug, **item} for item in rejected)
        if publication is not None:
            publication_decisions[slug] = publication

    report = {
        "mode": mode,
        "raw_record_count": len(records),
        "unique_canonical_word_count": len(normalized),
        "publishable_canonical_word_count": publishable_count,
        "skipped_without_verified_description_count": len(normalized) - publishable_count,
        "duplicate_count": len(duplicates),
        "invalid_or_unsluggable_count": len(invalid),
        "generated_page_count": len(generated_paths),
        "first_word": selected[0][0] if selected else None,
        "last_word": selected[-1][0] if selected else None,
        "published_example_count": published_examples,
        "rejected_example_count": len(rejected_in_selection),
        "rejected_examples": rejected_in_selection,
        "full_dataset_quality": quality,
        "generated_paths": generated_paths,
        "treatment_manifest_sha256": manifest_hash,
        "publication_decisions": publication_decisions,
    }
    print(json.dumps({key: value for key, value in report.items() if key not in {"generated_paths", "rejected_examples"}}, ensure_ascii=False, indent=2))
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Report: {args.report}")


if __name__ == "__main__":
    main()
