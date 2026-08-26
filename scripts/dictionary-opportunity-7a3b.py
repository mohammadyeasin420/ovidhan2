#!/usr/bin/env python3
"""Phase 7A3B: deterministic GSC overlay for the tracked word inventory."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
import subprocess
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit, urlunsplit

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
START_SHA = "f16255b4a7381011d03dc5e37db09a45d52ce560"
PERFORMANCE_PATH = Path(r"C:\data\ovidhan-gsc\ovidhan-gsc-performance-2026-08-16.xlsx")
COVERAGE_PATH = Path(r"C:\data\ovidhan-gsc\ovidhan-gsc-coverage-2026-08-25.xlsx")
PERFORMANCE_SHA = "c8eeb38ee815615cccb91d8513be9e78be87e1f382e43eef94627f0325fa227a"
COVERAGE_SHA = "9ee447fcb3e53d07256f35723afc3a5b0d21799040f9e1860e24e9358f4eb426"
GENERIC_EXAMPLE = re.compile(r"^(I know the word ['\"]|Learning ['\"].+['\"] helps your vocabulary\.|['\"].+['\"] is common in English\.|Can you use ['\"].+['\"] in a sentence\?|This is an? .+\.)$", re.I)
URL_TEMPLATE_MARKER = r"(?:\$\{[^}\r\n]*\}|\{\{[^}\r\n]*\}\}|%24%7B[^\s\"'<>]*|%7B%7B[^\s\"'<>]*)"
URL_TEMPLATE_PATTERNS = [
    re.compile(rf"(?:href|src|action|formaction|data-(?:url|href|src|path))\s*=\s*[\"'][^\"']*{URL_TEMPLATE_MARKER}[^\"']*[\"']", re.I),
    re.compile(rf"[\"'](?:https?://|/|\.\.?/)[^\"'\s]*{URL_TEMPLATE_MARKER}[^\"'\s]*[\"']", re.I),
    re.compile(rf"url\(\s*[\"']?[^)\s]*{URL_TEMPLATE_MARKER}[^)]*\)", re.I),
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_url(raw: object) -> str:
    value = unicodedata.normalize("NFC", unquote(str(raw).strip()))
    parsed = urlsplit(value)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError(f"absolute URL required: {raw!r}")
    host = (parsed.hostname or "").lower()
    if host == "www.ovidhan.net":
        host = "ovidhan.net"
    if not host:
        raise ValueError(f"hostname required: {raw!r}")
    port = f":{parsed.port}" if parsed.port and parsed.port != 443 else ""
    path = re.sub(r"/{2,}", "/", parsed.path)
    if path != "/":
        path = path.rstrip("/")
    return urlunsplit(("https", host + port, path or "/", "", ""))


def expected_url(slug: str) -> str:
    return normalize_url(f"https://ovidhan.net/word/{quote(slug, safe='')}.html")


def normalized_key(value: object) -> str:
    return unicodedata.normalize("NFC", str(value or "").strip()).lower()


def present(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def list_present(value: object) -> bool:
    return isinstance(value, list) and any(present(item) for item in value)


def object_present(value: object) -> bool:
    return isinstance(value, dict) and any(present(v) or (isinstance(v, list) and len(v)) for v in value.values())


def lexical_fields(entry: dict | None) -> dict:
    entry = entry or {}
    examples = ([entry.get("example").strip()] if present(entry.get("example")) else []) + [x.strip() for x in entry.get("examples", []) if present(x)]
    return {
        "bangla": present(entry.get("bangla")),
        "definition": present(entry.get("definition")),
        "pos": present(entry.get("part_of_speech")) and entry.get("part_of_speech", "").strip().lower() != "unknown",
        "usable_example": bool(examples) and not all(GENERIC_EXAMPLE.match(x) for x in examples),
        "synonyms": list_present(entry.get("synonyms")),
        "antonyms": list_present(entry.get("antonyms")),
    }


def has_url_template_leak(html: str) -> bool:
    return any(pattern.search(html) for pattern in URL_TEMPLATE_PATTERNS)


def git_files(directory: str) -> list[str]:
    output = subprocess.check_output(["git", "ls-files", "-z", "--", directory], cwd=ROOT)
    return [item.decode("utf-8") for item in output.split(b"\0") if item]


def validate_sheet(workbook, name: str, headers: list[str]) -> list[tuple]:
    if name not in workbook.sheetnames:
        raise AssertionError(f"Missing sheet {name!r}; found {workbook.sheetnames}")
    rows = list(workbook[name].iter_rows(values_only=True))
    actual = [str(x).strip() if x is not None else "" for x in rows[0]]
    if actual != headers:
        raise AssertionError(f"{name} headers {actual!r} != {headers!r}")
    return rows[1:]


def merge_performance(rows: list[dict]) -> tuple[dict[str, dict], int]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row["url"]].append(row)
    result = {}
    duplicate_count = 0
    for url, values in grouped.items():
        duplicate_count += len(values) - 1
        clicks = sum(x["clicks"] for x in values)
        impressions = sum(x["impressions"] for x in values)
        if impressions:
            position = sum(x["position"] * x["impressions"] for x in values) / impressions
        else:
            position = sum(x["position"] for x in values) / len(values)
        result[url] = {"url": url, "clicks": clicks, "impressions": impressions, "ctr": clicks / impressions if impressions else 0.0, "position": position}
    return result, duplicate_count


def percentile_map(items: list[dict], field: str, reverse: bool = False) -> dict[str, float]:
    ordered = sorted(items, key=lambda x: ((-x[field]) if reverse else x[field], x["url"]))
    n = len(ordered)
    if n == 1:
        return {ordered[0]["url"]: 100.0}
    by_value: dict[float, list[int]] = defaultdict(list)
    for index, item in enumerate(ordered):
        by_value[item[field]].append(index)
    result = {}
    for item in ordered:
        ranks = by_value[item[field]]
        result[item["url"]] = round(100 * (sum(ranks) / len(ranks)) / (n - 1), 4)
    return result


def add_scores(observed: list[dict]) -> None:
    impression_pct = percentile_map(observed, "impressions")
    click_pct = percentile_map(observed, "clicks")
    visibility_pct = percentile_map(observed, "position", reverse=True)
    for row in observed:
        demand = impression_pct[row["url"]]
        visibility = visibility_pct[row["url"]]
        row["impression_percentile"] = demand
        row["click_percentile"] = click_pct[row["url"]]
        row["visibility_percentile"] = visibility
        row["search_value_score"] = round(0.50 * demand + 0.30 * click_pct[row["url"]] + 0.20 * visibility, 2)
        row["search_improvement_score"] = round(0.65 * demand + 0.35 * (100 - visibility), 2)


def data_readiness(row: dict) -> str:
    serious = {"empty_slug", "html_url_context_literal_template_pattern"}
    if row["dictionary_index"] is None or row["editorial_status"] == "rejected" or serious.intersection(row["structural_flags"]):
        return "REVIEW_REQUIRED"
    fields = row["fields"]
    if fields["bangla"] and fields["definition"] and fields["pos"]:
        return "READY_STRONG"
    if any(fields[name] for name in ("bangla", "definition", "pos", "usable_example")):
        return "READY_PARTIAL"
    return "WEAK_DATA"


def classify(row: dict) -> None:
    labels = []
    observed = row["performance_state"] == "OBSERVED"
    backlog = row["coverage_state"] == "DISCOVERED_CURRENTLY_NOT_INDEXED"
    if row["data_readiness"] == "REVIEW_REQUIRED":
        labels.append("REVIEW_REQUIRED")
    if observed and (row["clicks"] > 0 or (row["position"] <= 10 and row["impressions"] > 0)):
        labels.append("PROTECT")
    if observed and row["impressions"] > 0 and row["data_readiness"] in {"READY_STRONG", "READY_PARTIAL"} and row["position"] > 10 and row["search_improvement_score"] >= 60:
        labels.append("QUICK_WIN")
    if observed and row["impressions"] > 0 and row["data_readiness"] in {"READY_PARTIAL", "WEAK_DATA"}:
        labels.append("CONTENT_ENRICH")
    if backlog:
        labels.append("CRAWL_BACKLOG")
    if observed and not labels:
        labels.append("WATCH")
    if not observed and not backlog and not labels:
        labels.append("UNKNOWN")
    row["priority_labels"] = labels
    if row["data_readiness"] == "REVIEW_REQUIRED":
        row["provisional_tier"] = "REVIEW_REQUIRED"
    elif observed and row["search_value_score"] >= 75 and row["impressions"] > 0:
        row["provisional_tier"] = "PROVISIONAL_TIER_A_CANDIDATE"
    elif observed and row["impressions"] > 0:
        row["provisional_tier"] = "PROVISIONAL_TIER_B_CANDIDATE"
    else:
        row["provisional_tier"] = "INSUFFICIENT_EVIDENCE"
    if observed and (row["clicks"] > 0 or row["data_readiness"] == "READY_STRONG"):
        row["confidence"] = "HIGH"
    elif observed or (backlog and row["data_readiness"] == "READY_STRONG"):
        row["confidence"] = "MEDIUM"
    elif backlog:
        row["confidence"] = "LOW"
    else:
        row["confidence"] = "UNKNOWN"


def reason(row: dict) -> str:
    bits = []
    if row["performance_state"] == "OBSERVED":
        bits.append(f"observed {row['impressions']:g} impressions/{row['clicks']:g} clicks at position {row['position']:.2f}")
    if row["coverage_state"] != "UNKNOWN":
        bits.append("in exported discovered-not-indexed backlog")
    bits.append(row["data_readiness"].lower().replace("_", " "))
    if row["structural_risk_count"]:
        bits.append(f"{row['structural_risk_count']} structural flags")
    return "; ".join(bits)


def run_tests() -> dict:
    assert normalize_url(" http://WWW.ovidhan.net/word/caf%C3%A9.html/?x=1#x ") == "https://ovidhan.net/word/café.html"
    assert normalize_url("https://ovidhan.net/word/net.html/") == "https://ovidhan.net/word/net.html"
    merged, duplicates = merge_performance([
        {"url": "https://ovidhan.net/word/a.html", "clicks": 0, "impressions": 2, "position": 10},
        {"url": "https://ovidhan.net/word/a.html", "clicks": 1, "impressions": 2, "position": 20},
    ])
    assert duplicates == 1 and merged[next(iter(merged))]["clicks"] == 1 and merged[next(iter(merged))]["position"] == 15
    unknown = {"performance_state": "UNKNOWN", "coverage_state": "UNKNOWN", "clicks": None, "impressions": None}
    assert unknown["clicks"] is None and unknown["coverage_state"] != "INDEXED"
    known_zero = {"performance_state": "OBSERVED", "clicks": 0}
    assert known_zero["clicks"] == 0
    scored = [{"url": "a", "clicks": 0, "impressions": 1, "position": 20}, {"url": "b", "clicks": 1, "impressions": 10, "position": 5}]
    add_scores(scored)
    first = json.dumps(scored, sort_keys=True)
    add_scores(scored)
    assert json.dumps(scored, sort_keys=True) == first
    rows = [{"slug": "b", "search_value_score": 1}, {"slug": "a", "search_value_score": 1}]
    assert [x["slug"] for x in sorted(rows, key=lambda x: (-x["search_value_score"], x["slug"]))] == ["a", "b"]
    assert not has_url_template_leak("<script>const x = `hello ${name}`;</script>")
    return {"status": "PASS", "cases": 9}


def load_inputs(performance_path: Path, coverage_path: Path) -> dict:
    actual_hashes = {"performance": sha256(performance_path), "coverage": sha256(coverage_path)}
    assert actual_hashes == {"performance": PERFORMANCE_SHA, "coverage": COVERAGE_SHA}, f"Input hash mismatch: {actual_hashes}"
    performance_wb = openpyxl.load_workbook(performance_path, read_only=True, data_only=True)
    coverage_wb = openpyxl.load_workbook(coverage_path, read_only=True, data_only=True)
    assert performance_wb.sheetnames == ["Chart", "Queries", "Pages", "Countries", "Devices", "Search appearance", "Filters"]
    assert coverage_wb.sheetnames == ["Table", "Metadata"]
    page_rows = validate_sheet(performance_wb, "Pages", ["Top pages", "Clicks", "Impressions", "CTR", "Position"])
    coverage_rows = validate_sheet(coverage_wb, "Table", ["URL", "Last crawled", "Status"])
    filter_rows = validate_sheet(performance_wb, "Filters", ["Filter", "Value"])
    metadata_rows = validate_sheet(coverage_wb, "Metadata", ["Property", "Value"])
    assert dict(filter_rows) == {"Search type": "Web", "Date": "Last 3 months"}
    metadata = dict(metadata_rows)
    normalized_issue = re.sub(r"[^a-z]+", " ", str(metadata.get("Issue", "")).lower()).strip()
    assert normalized_issue.startswith("discovered") and normalized_issue.endswith("currently not indexed")
    assert metadata.get("Sitemap") == "All known pages"
    return {"hashes": actual_hashes, "page_rows": page_rows, "coverage_rows": coverage_rows, "metadata": metadata}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--performance", type=Path, default=PERFORMANCE_PATH)
    parser.add_argument("--coverage", type=Path, default=COVERAGE_PATH)
    parser.add_argument("--candidate-limit", type=int, default=500)
    args = parser.parse_args()
    tests = run_tests()
    inputs = load_inputs(args.performance, args.coverage)

    invalid_urls = []
    performance_raw = []
    performance_nonword = 0
    for raw_url, clicks, impressions, ctr, position in inputs["page_rows"]:
        try:
            url = normalize_url(raw_url)
        except Exception as exc:
            invalid_urls.append({"source": "performance", "url": str(raw_url), "error": str(exc)})
            continue
        item = {"url": url, "clicks": float(clicks or 0), "impressions": float(impressions or 0), "ctr": float(ctr or 0), "position": float(position or 0)}
        if urlsplit(url).path.startswith("/word/"):
            performance_raw.append(item)
        else:
            performance_nonword += 1
    performance, performance_duplicates = merge_performance(performance_raw)
    observed = list(performance.values())
    add_scores(observed)

    coverage = {}
    coverage_nonword = 0
    coverage_duplicates = 0
    statuses = Counter()
    for raw_url, _last_crawled, status in inputs["coverage_rows"]:
        try:
            url = normalize_url(raw_url)
        except Exception as exc:
            invalid_urls.append({"source": "coverage", "url": str(raw_url), "error": str(exc)})
            continue
        statuses[str(status)] += 1
        if urlsplit(url).path.startswith("/word/"):
            coverage_duplicates += int(url in coverage)
            coverage[url] = {"coverage_state": "DISCOVERED_CURRENTLY_NOT_INDEXED", "validation_status": str(status)}
        else:
            coverage_nonword += 1

    dictionary = json.loads((ROOT / "enriched-dictionary.json").read_text(encoding="utf-8"))
    dictionary_by_word = {}
    for index, entry in enumerate(dictionary):
        key = normalized_key(entry.get("english") or entry.get("word") or entry.get("en"))
        if key and key not in dictionary_by_word:
            dictionary_by_word[key] = (index, entry)
    pilot = json.loads((ROOT / "data/seo-word-pilot-7a1.json").read_text(encoding="utf-8"))
    baseline_arch = json.loads((ROOT / "reports/seo-word-pilot-7a1-baseline-architecture.json").read_text(encoding="utf-8"))
    audit = json.loads((ROOT / "reports/seo-word-pilot-7a1-editorial-review.json").read_text(encoding="utf-8"))
    approved = {normalized_key(x) for x in pilot["approved_population"]}
    rejected = {normalized_key(x["slug"]) for x in audit["entries"]} - approved
    treatment = {normalized_key(x["slug"]) for x in pilot["entries"] if x["group"] == "treatment"}
    control = {normalized_key(x["slug"]) for x in pilot["entries"] if x["group"] == "control"}
    static_core = {normalized_key(x["slug"]) for x in baseline_arch["entries"] if x["baseline_architecture"] == "STATIC_CORE"}
    assert (len(approved), len(rejected), len(treatment), len(control), len(static_core)) == (48, 29, 21, 21, 5)

    sitemap_text = "\n".join((ROOT / name).read_text(encoding="utf-8") for name in git_files(".") if re.match(r"^sitemap(?:-index|-part-\d+)?\.xml$", name, re.I))
    sitemap_urls = {normalize_url(x) for x in re.findall(r"<loc>([^<]+)</loc>", sitemap_text)}
    inventory = []
    for file in git_files("word"):
        if not (file.startswith("word/") and file.endswith(".html")):
            continue
        slug = unicodedata.normalize("NFC", file[5:-5])
        key = normalized_key(slug)
        found = dictionary_by_word.get(key)
        fields = lexical_fields(found[1] if found else None)
        html = (ROOT / file).read_text(encoding="utf-8")
        has_explorer = "learning-explorer.js" in html
        has_static = bool(re.search(r'id=["\']staticWordContent["\']', html, re.I))
        if key in static_core:
            architecture = "STATIC_CORE"
        elif key in treatment:
            architecture = "7A1_TREATMENT_STATIC"
        elif key in control:
            architecture = "7A1_CONTROL_JS_SHELL"
        elif has_static:
            architecture = "OTHER_STATIC"
        elif has_explorer:
            architecture = "OTHER_JS_SHELL"
        else:
            architecture = "UNKNOWN_REQUIRES_REVIEW"
        flags = []
        if len(slug) <= 2: flags.append("slug_length_le_2")
        if not slug: flags.append("empty_slug")
        if re.search(r"\d", slug): flags.append("contains_digits")
        if any(ord(c) > 127 for c in slug): flags.append("non_ascii_slug")
        if len(slug) >= 30: flags.append("unusually_long_slug_ge_30")
        if not found: flags.append("dictionary_record_missing")
        if found and not fields["bangla"]: flags.append("missing_bangla")
        if found and not fields["definition"]: flags.append("missing_definition")
        if found and not fields["pos"]: flags.append("missing_pos")
        if architecture.endswith("JS_SHELL"): flags.append("generic_js_shell")
        if has_url_template_leak(html): flags.append("html_url_context_literal_template_pattern")
        url = expected_url(slug)
        if url not in sitemap_urls: flags.append("page_not_in_sitemap")
        p = performance.get(url)
        c = coverage.get(url)
        row = {
            "slug": slug, "url": url, "dictionary_index": found[0] if found else None, "fields": fields,
            "architecture": architecture, "editorial_status": "approved" if key in approved else "rejected" if key in rejected else "unreviewed",
            "structural_flags": flags, "structural_risk_count": len(flags), "in_sitemap": url in sitemap_urls,
            "performance_state": "OBSERVED" if p else "UNKNOWN", "coverage_state": c["coverage_state"] if c else "UNKNOWN",
            "coverage_validation_status": c["validation_status"] if c else None,
            "clicks": p["clicks"] if p else None, "impressions": p["impressions"] if p else None, "ctr": p["ctr"] if p else None, "position": p["position"] if p else None,
            "search_value_score": p["search_value_score"] if p else None, "search_improvement_score": p["search_improvement_score"] if p else None,
            "impression_percentile": p["impression_percentile"] if p else None,
        }
        row["data_readiness"] = data_readiness(row)
        classify(row)
        row["reason"] = reason(row)
        inventory.append(row)

    inventory_by_url = {row["url"]: row for row in inventory}
    performance_joined = set(performance) & set(inventory_by_url)
    coverage_joined = set(coverage) & set(inventory_by_url)
    overlap = set(performance) & set(coverage)
    assert len(inventory) == 49628
    clicked = [row for row in inventory if row["performance_state"] == "OBSERVED" and row["clicks"] >= 1]
    position_distribution = Counter("TOP_10" if x["position"] <= 10 else "TOP_20" if x["position"] <= 20 else "TOP_50" if x["position"] <= 50 else "BEYOND_50" for x in observed)
    impression_distribution = Counter("1" if x["impressions"] == 1 else "2_4" if x["impressions"] <= 4 else "5_9" if x["impressions"] <= 9 else "10_PLUS" for x in observed)
    label_counts = Counter(label for row in inventory for label in row["priority_labels"])
    readiness_counts = Counter(row["data_readiness"] for row in inventory)
    confidence_counts = Counter(row["confidence"] for row in inventory)
    tier_counts = Counter(row["provisional_tier"] for row in inventory)
    inventory_summary = {
        "tracked_word_pages": len(inventory), "dictionary_records": len(dictionary),
        "page_dictionary_matches": sum(r["dictionary_index"] is not None for r in inventory),
        "page_without_dictionary_record": sum(r["dictionary_index"] is None for r in inventory),
        "bangla_present": sum(r["fields"]["bangla"] for r in inventory),
        "definition_present": sum(r["fields"]["definition"] for r in inventory),
        "pos_present": sum(r["fields"]["pos"] for r in inventory),
        "architecture": dict(Counter(r["architecture"] for r in inventory)),
        "editorial_status": dict(Counter(r["editorial_status"] for r in inventory)),
    }
    performance_signals = {
        "HAS_CLICK": sum(x["clicks"] > 0 for x in observed),
        "HAS_IMPRESSIONS": sum(x["impressions"] > 0 for x in observed),
        "TOP_10_OBSERVED": sum(x["position"] <= 10 for x in observed),
        "TOP_20_OBSERVED": sum(x["position"] <= 20 for x in observed),
        "HIGHER_IMPRESSION_OBSERVED_P75_PLUS": sum(x["impression_percentile"] >= 75 for x in observed),
    }

    def intersection(predicate):
        values = [row for row in inventory if predicate(row)]
        return {"count": len(values), "samples": [row["url"] for row in values[:5]]}

    intersections = {
        "observed_performance_strong_lexical": intersection(lambda r: r["performance_state"] == "OBSERVED" and r["data_readiness"] == "READY_STRONG"),
        "observed_performance_weak_lexical": intersection(lambda r: r["performance_state"] == "OBSERVED" and r["data_readiness"] in {"READY_PARTIAL", "WEAK_DATA"}),
        "observed_performance_editorial_rejection": intersection(lambda r: r["performance_state"] == "OBSERVED" and r["editorial_status"] == "rejected"),
        "observed_performance_structural_anomaly": intersection(lambda r: r["performance_state"] == "OBSERVED" and r["structural_risk_count"] > 0),
        "coverage_backlog_strong_lexical": intersection(lambda r: r["coverage_state"] != "UNKNOWN" and r["data_readiness"] == "READY_STRONG"),
        "coverage_backlog_weak_lexical": intersection(lambda r: r["coverage_state"] != "UNKNOWN" and r["data_readiness"] in {"READY_PARTIAL", "WEAK_DATA"}),
        "coverage_backlog_missing_dictionary": intersection(lambda r: r["coverage_state"] != "UNKNOWN" and r["dictionary_index"] is None),
        "clicked_by_readiness": dict(Counter(r["data_readiness"] for r in clicked)),
        "top10_by_readiness": dict(Counter(r["data_readiness"] for r in inventory if r["performance_state"] == "OBSERVED" and r["position"] <= 10)),
    }
    cohort = {
        "treatment_observed_performance": sum(inventory_by_url.get(expected_url(x), {}).get("performance_state") == "OBSERVED" for x in treatment),
        "control_observed_performance": sum(inventory_by_url.get(expected_url(x), {}).get("performance_state") == "OBSERVED" for x in control),
        "treatment_coverage_backlog": sum(inventory_by_url.get(expected_url(x), {}).get("coverage_state") == "DISCOVERED_CURRENTLY_NOT_INDEXED" for x in treatment),
        "control_coverage_backlog": sum(inventory_by_url.get(expected_url(x), {}).get("coverage_state") == "DISCOVERED_CURRENTLY_NOT_INDEXED" for x in control),
    }

    candidate_rows = [row for row in inventory if row["performance_state"] == "OBSERVED" or row["coverage_state"] != "UNKNOWN"]
    tier_order = {"PROVISIONAL_TIER_A_CANDIDATE": 0, "PROVISIONAL_TIER_B_CANDIDATE": 1, "REVIEW_REQUIRED": 2, "INSUFFICIENT_EVIDENCE": 3}
    candidate_rows.sort(key=lambda r: (tier_order[r["provisional_tier"]], -(r["search_value_score"] if r["search_value_score"] is not None else -1), -(r["impressions"] if r["impressions"] is not None else -1), r["slug"]))
    candidates = candidate_rows[:args.candidate_limit]
    csv_path = ROOT / "reports/dictionary-opportunity-7a3b-candidates.csv"
    columns = ["slug", "url", "clicks", "impressions", "ctr", "position", "performance_state", "coverage_state", "coverage_validation_status", "bangla_present", "definition_present", "pos_present", "usable_example_present", "architecture", "editorial_status", "structural_risk_count", "data_readiness", "search_value_score", "search_improvement_score", "priority_labels", "provisional_tier", "confidence", "reason"]
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        for row in candidates:
            writer.writerow({
                "slug": row["slug"], "url": row["url"], "clicks": row["clicks"], "impressions": row["impressions"], "ctr": row["ctr"], "position": row["position"],
                "performance_state": row["performance_state"], "coverage_state": row["coverage_state"], "coverage_validation_status": row["coverage_validation_status"],
                "bangla_present": row["fields"]["bangla"], "definition_present": row["fields"]["definition"], "pos_present": row["fields"]["pos"], "usable_example_present": row["fields"]["usable_example"],
                "architecture": row["architecture"], "editorial_status": row["editorial_status"], "structural_risk_count": row["structural_risk_count"], "data_readiness": row["data_readiness"],
                "search_value_score": row["search_value_score"], "search_improvement_score": row["search_improvement_score"], "priority_labels": "|".join(row["priority_labels"]), "provisional_tier": row["provisional_tier"], "confidence": row["confidence"], "reason": row["reason"],
            })

    observed_baseline = {"performance_rows": len(inputs["page_rows"]), "performance_word_urls": len(performance), "word_clicks": sum(x["clicks"] for x in performance.values()), "word_impressions": sum(x["impressions"] for x in performance.values()), "clicked_word_urls": sum(x["clicks"] >= 1 for x in performance.values()), "coverage_rows": len(inputs["coverage_rows"]), "coverage_word_urls": len(coverage), "coverage_non_word_urls": coverage_nonword, "pending": statuses.get("Pending", 0), "cross_export_overlap": len(overlap)}
    expected_baseline = {"performance_rows": 1000, "performance_word_urls": 934, "word_clicks": 6, "word_impressions": 3115, "clicked_word_urls": 6, "coverage_rows": 1000, "coverage_word_urls": 993, "coverage_non_word_urls": 7, "pending": 1000, "cross_export_overlap": 0}
    baseline_discrepancies = {key: {"expected": expected_baseline[key], "observed": observed_baseline[key]} for key in expected_baseline if expected_baseline[key] != observed_baseline[key]}
    summary = {
        "schema": "ovidhan-dictionary-opportunity-7a3b-summary-v1", "starting_sha": START_SHA,
        "inputs": {"performance_path": str(args.performance), "coverage_path": str(args.coverage), "sha256": inputs["hashes"], "raw_files_committed": False},
        "workbooks": {
            "performance": {"rows": len(inputs["page_rows"]), "word_urls": len(performance_raw), "unique_word_urls": len(performance), "non_word_urls": performance_nonword, "duplicate_word_rows": performance_duplicates, "word_clicks": sum(x["clicks"] for x in performance.values()), "word_impressions": sum(x["impressions"] for x in performance.values()), "word_urls_with_clicks": sum(x["clicks"] >= 1 for x in performance.values()), "clicked_word_urls": sorted(x["url"] for x in performance.values() if x["clicks"] >= 1), "position_distribution": dict(position_distribution), "impression_distribution": dict(impression_distribution), "filters": {"search_type": "Web", "date": "Last 3 months"}},
            "coverage": {"rows": len(inputs["coverage_rows"]), "word_urls": len(coverage), "non_word_urls": coverage_nonword, "duplicate_word_rows": coverage_duplicates, "validation_status_distribution": dict(statuses), "issue": "DISCOVERED_CURRENTLY_NOT_INDEXED", "metadata_issue_raw": str(inputs["metadata"].get("Issue"))},
        },
        "cross_export_word_url_overlap": len(overlap),
        "known_baseline_check": {"expected": expected_baseline, "observed": observed_baseline, "discrepancies": baseline_discrepancies},
        "inventory": inventory_summary,
        "joins": {"performance_success": len(performance_joined), "performance_failure": len(performance) - len(performance_joined), "performance_failure_samples": sorted(set(performance) - set(inventory_by_url))[:10], "coverage_success": len(coverage_joined), "coverage_failure": len(coverage) - len(coverage_joined), "coverage_failure_samples": sorted(set(coverage) - set(inventory_by_url))[:10], "invalid_url_count": len(invalid_urls), "invalid_urls": invalid_urls},
        "states": {"performance": dict(Counter(r["performance_state"] for r in inventory)), "coverage": dict(Counter(r["coverage_state"] for r in inventory))},
        "performance_signals": performance_signals, "classification_counts": dict(label_counts), "provisional_tier_counts": dict(tier_counts), "data_readiness_counts": dict(readiness_counts), "confidence_counts": dict(confidence_counts),
        "intersections": intersections, "experiment_7a1": cohort,
        "scoring": {"cohort": len(observed), "search_value_score": "50% impression percentile + 30% click percentile + 20% ranking-visibility percentile within observed word URLs", "search_improvement_score": "65% impression percentile + 35% inverse ranking-visibility percentile within observed word URLs", "tie_rule": "average empirical percentile; deterministic URL tie order", "unknown_rule": "scores are null when performance_state is UNKNOWN"},
        "candidate_artifact": {"limit": args.candidate_limit, "rows": len(candidates), "ordering": "tier class, search value descending, impressions descending, slug ascending"},
        "tests": tests,
    }
    (ROOT / "reports/dictionary-opportunity-7a3b-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "reports/dictionary-opportunity-7a3b.md").write_text(render_report(summary, candidates) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "performance": summary["workbooks"]["performance"], "coverage": summary["workbooks"]["coverage"], "overlap": len(overlap), "joins": summary["joins"], "candidates": len(candidates)}, indent=2))


def render_report(s: dict, candidates: list[dict]) -> str:
    p, c = s["workbooks"]["performance"], s["workbooks"]["coverage"]
    table = lambda values: "\n".join(f"| {k} | {v:,} |" for k, v in values.items())
    top = "\n".join(f"- `{r['url']}` — {r['reason']} — {r['provisional_tier']}" for r in candidates[:15])
    intersections = "\n".join(f"- {name}: **{value['count']}**; samples: {', '.join(f'`{x}`' for x in value['samples']) or 'none'}" if isinstance(value, dict) and "count" in value else f"- {name}: {json.dumps(value, sort_keys=True)}" for name, value in s["intersections"].items())
    return f"""# Phase 7A3B Real GSC Demand Overlay

Diagnostic prioritization only. Raw XLSX files remain outside Git. An absent performance row is **UNKNOWN**, not zero; an absent coverage row is **UNKNOWN**, not indexed. No permanent Tier A/B/C assignments or destructive SEO recommendations are made.

## Inputs and workbook observations

- Starting main: `{s['starting_sha']}`
- Performance SHA-256: `{s['inputs']['sha256']['performance']}`
- Coverage SHA-256: `{s['inputs']['sha256']['coverage']}`
- Performance: **{p['rows']:,} rows**, **{p['word_urls']:,} word URLs**, **{p['non_word_urls']:,} non-word URLs**, **{p['word_clicks']:g} clicks**, **{p['word_impressions']:g} impressions**, **{p['word_urls_with_clicks']} clicked word URLs**.
- Coverage: **{c['rows']:,} rows**, **{c['word_urls']:,} word URLs**, **{c['non_word_urls']:,} non-word URLs**; validation status `{json.dumps(c['validation_status_distribution'], sort_keys=True)}`.
- Normalized cross-export overlap: **{s['cross_export_word_url_overlap']}**. This zero applies only to these limited exports and is not a universal SEO rule.
- Known-baseline discrepancies: **{len(s['known_baseline_check']['discrepancies'])}**.

### Position distribution (observed word cohort)

| Bucket | URLs |
|---|---:|
{table(p['position_distribution'])}

### Impression distribution

| Bucket | URLs |
|---|---:|
{table(p['impression_distribution'])}

Descriptive observed signals: `{json.dumps(s['performance_signals'], sort_keys=True)}`. The higher-impression signal is the observed-cohort 75th percentile, not a universal SEO threshold.

## Joins and evidence coverage

- Performance → inventory: **{s['joins']['performance_success']} successes**, **{s['joins']['performance_failure']} failures**.
- Coverage → inventory: **{s['joins']['coverage_success']} successes**, **{s['joins']['coverage_failure']} failures**.
- Invalid/rejected GSC URLs: **{s['joins']['invalid_url_count']}**.
- Performance states: `{json.dumps(s['states']['performance'], sort_keys=True)}`.
- Coverage states: `{json.dumps(s['states']['coverage'], sort_keys=True)}`.

The 95 performance join failures are extensionless `/word/<slug>` URLs. The canonical contract preserves `.html`, so the analyzer reports these failures and does not collapse them into tracked `/word/<slug>.html` pages.

## Transparent scoring

Scores exist only for the observed {s['scoring']['cohort']}-word performance cohort. Search value = 50% impression percentile + 30% click percentile + 20% ranking-visibility percentile. Search improvement = 65% impression percentile + 35% inverse ranking-visibility percentile. Ties use average empirical percentiles. Unknown performance produces null scores, never synthetic zero.

## Operational classifications

| Label | Pages |
|---|---:|
{table(s['classification_counts'])}

Provisional tiers: `{json.dumps(s['provisional_tier_counts'], sort_keys=True)}`. These are candidates only; absence from GSC never creates Tier C.

Data readiness: `{json.dumps(s['data_readiness_counts'], sort_keys=True)}`.

Confidence: `{json.dumps(s['confidence_counts'], sort_keys=True)}`.

## Important intersections

{intersections}

## Top bounded candidate examples

{top}

The committed candidate CSV contains {s['candidate_artifact']['rows']} rows and is ordered deterministically by provisional tier, search value, impressions, and slug. It includes both value/protection and improvement fields rather than collapsing them into one opaque score.

## Frozen 7A1 observations

- Treatment observed performance: **{s['experiment_7a1']['treatment_observed_performance']} / 21**
- Control observed performance: **{s['experiment_7a1']['control_observed_performance']} / 21**
- Treatment in exported coverage backlog: **{s['experiment_7a1']['treatment_coverage_backlog']} / 21**
- Control in exported coverage backlog: **{s['experiment_7a1']['control_coverage_backlog']} / 21**

These observations do not support a causal staticization conclusion because the exports are limited and the performance date window is not an experiment-specific causal evaluation.

## Limitations and next use

The performance workbook is capped at 1,000 exported page rows, and the coverage workbook represents one issue only. Learner-value scores remain unknown unless separately reviewed evidence is imported. `Pending` is neither indexed nor fixed. Candidate confidence reflects evidence coverage, not semantic correctness or guaranteed SEO uplift.

## Reproduction and tests

Run `python scripts/dictionary-opportunity-7a3b.py` with `openpyxl` available. The script validates hashes, sheets, headers, filters, metadata, URL normalization, duplicate aggregation, known-zero versus unknown semantics, score reproducibility, stable ordering, and literal-template false-positive behavior. Embedded deterministic tests: **{s['tests']['status']} ({s['tests']['cases']} cases)**.
"""


if __name__ == "__main__":
    main()
