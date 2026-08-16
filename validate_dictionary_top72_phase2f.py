#!/usr/bin/env python3
"""Validate the frozen Phase 2F treatment and unchanged control cohort."""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import re
from pathlib import Path

from generate_word_pages import (
    PHASE2F_MANIFEST_SHA256,
    load_phase2f_manifest,
    load_site_layout,
    nonempty,
    normalize_records,
)


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--generation-report", type=Path, required=True)
    parser.add_argument("--treatment-manifest", type=Path, required=True)
    parser.add_argument("--control-manifest", type=Path, required=True)
    parser.add_argument("--control-prestate", type=Path, required=True)
    parser.add_argument("--editorial-review", type=Path, required=True)
    args = parser.parse_args()

    report = json.loads(args.generation_report.read_text(encoding="utf-8"))
    source_records = json.loads(Path("enriched-dictionary.json").read_text(encoding="utf-8"))
    normalized, _, _ = normalize_records(source_records)
    entries = dict(normalized)
    selected, manifest_hash = load_phase2f_manifest(args.treatment_manifest, normalized)
    manifest = read_csv(args.treatment_manifest)
    manifest_by_word = {row["word"]: row for row in manifest}
    decisions = {slug: decision for slug, _, decision in selected}
    paths = report.get("generated_paths", [])
    slugs = [Path(path).stem for path in paths]
    failures, warnings = [], []
    header_html, footer_html = load_site_layout()

    if report.get("mode") != "phase2f-treatment-manifest": failures.append("generation mode is not Phase 2F manifest mode")
    if manifest_hash != PHASE2F_MANIFEST_SHA256 or report.get("treatment_manifest_sha256") != PHASE2F_MANIFEST_SHA256: failures.append("manifest hash")
    if len(paths) != 72 or len(set(paths)) != 72 or set(slugs) != set(manifest_by_word): failures.append("treatment path set/count")

    page_results = []
    for path_text in paths:
        path, slug = Path(path_text), Path(path_text).stem
        page_failures = []
        if not path.is_file() or path.as_posix() != f"word/{slug}.html":
            failures.append(f"{slug}: missing/wrong path"); continue
        page = path.read_text(encoding="utf-8")
        entry, decision = entries[slug], decisions[slug]
        word = (nonempty(entry, "english") or slug).lower()
        bangla = nonempty(entry, "bangla") if decision["publish_bangla"] else None
        definition = nonempty(entry, "definition") if decision["publish_definition"] else None
        pos = nonempty(entry, "part_of_speech") if decision["publish_part_of_speech"] else None
        canonical = f"https://ovidhan.net/word/{slug}.html"
        title = f"{word} Meaning in Bangla | Ovidhan"
        description = f"{word} meaning in Bangla: {bangla}." if bangla else f"Learn the definition of {word}: {definition}."
        if bangla and definition: description += f" Definition: {definition}."
        if re.findall(r"<title>(.*?)</title>", page, re.S) != [html.escape(title)]: page_failures.append("title")
        if re.findall(r'<meta name="description" content="([^"]+)">', page) != [html.escape(description, quote=True)]: page_failures.append("meta-description")
        if re.findall(r'<link rel="canonical" href="([^"]+)">', page) != [canonical]: page_failures.append("canonical")
        if page.count(f"<h1>{html.escape(word)} meaning in Bangla</h1>") != 1: page_failures.append("h1")
        article_match = re.search(r'<article class="dictionary-answer".*?</article>', page, re.S)
        if not article_match: page_failures.append("static-answer"); article = ""
        else: article = article_match.group(0)
        expected_scalars = {
            "bangla-meaning": bangla, "definition": definition, "part-of-speech": pos,
            "pronunciation": None, "example": None,
        }
        for css_class, value in expected_scalars.items():
            present = f'class="{css_class}"' in article
            if present != bool(value) or (value and html.escape(value) not in article): page_failures.append(css_class)
        relations = {
            "synonyms": decision["publish_synonym_values"],
            "antonyms": decision["publish_antonym_values"],
            "word-family": decision["publish_word_family_values"],
        }
        for css_class, values in relations.items():
            present = f'class="{css_class}"' in article
            expected_text = html.escape(", ".join(values)) if values else None
            if present != bool(values) or (expected_text and expected_text not in article): page_failures.append(css_class)
        banned_examples = [str(entry.get("example", "") or "")] + [str(x) for x in entry.get("examples", [])]
        if any(example and html.escape(example) in article for example in banned_examples): page_failures.append("example-not-approved")
        banned = ("Meaning not available", "Word type: N/A", "/ ... /", "Not available")
        if any(text.lower() in page.lower() for text in banned): page_failures.append("placeholder")
        if re.search(r"\{[A-Za-z_][^}]*\}", page): page_failures.append("template-placeholder")
        if "noindex" in page.lower(): page_failures.append("noindex")
        if page.count(header_html) != 1 or page.count('<header class="site-header">') != 1: page_failures.append("header")
        if page.count(footer_html) != 1 or page.count('<footer class="site-footer">') != 1: page_failures.append("footer")
        if page.count('id="megaMenu"') != 1 or page.count('<ul class="mega-menu"') != 1: page_failures.append("menu")
        if page.count('<link rel="stylesheet" href="../styles.css">') != 1: page_failures.append("styles")
        if page.count('<script src="../learning-explorer.js"></script>') != 1 or page.count("Learning Explorer") != 1: page_failures.append("learning-explorer")
        scripts = re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S)
        try:
            schemas = [json.loads(script) for script in scripts]
            breadcrumb = next(x for x in schemas if x.get("@type") == "BreadcrumbList")
            term = next(x for x in schemas if x.get("@type") == "DefinedTerm")
            expected_term_description = definition or bangla
            if len(schemas) != 2 or term.get("name") != word or term.get("url") != canonical or term.get("description") != expected_term_description: page_failures.append("defined-term")
            if (term.get("alternateName") if bangla else None) != bangla or (not bangla and "alternateName" in term): page_failures.append("alternate-name")
            breadcrumb_items = breadcrumb.get("itemListElement", [])
            if [x.get("name") for x in breadcrumb_items] != ["Home", "Dictionary", word] or breadcrumb_items[-1].get("item") != canonical: page_failures.append("breadcrumb")
        except (json.JSONDecodeError, StopIteration, IndexError): page_failures.append("json-ld")
        if page_failures: failures.append(f"{slug}: {', '.join(sorted(set(page_failures)))}")
        page_results.append({"word": slug, "status": "FAIL" if page_failures else "PASS", "failures": sorted(set(page_failures)), "visible": {"bangla": bangla, "definition": definition, "part_of_speech": pos, "example": None, "synonyms": relations["synonyms"], "antonyms": relations["antonyms"], "word_family": relations["word-family"]}})

    prestate = json.loads(args.control_prestate.read_text(encoding="utf-8"))
    control_rows = read_csv(args.control_manifest)
    treatment_urls = {row["url"] for row in manifest}
    control_urls = {row["url"] for row in control_rows}
    control_changed = []
    for row in control_rows:
        path_text = f"word/{row['word']}.html"
        current = sha256(Path(path_text))
        if prestate["controls"].get(path_text) != current: control_changed.append(path_text)
    if len(control_rows) != 72 or treatment_urls & control_urls: failures.append("control count/overlap")
    if control_changed: failures.append(f"changed controls: {control_changed}")
    unchanged_guards = {
        "source": sha256(Path("enriched-dictionary.json")) == prestate["source_sha256"],
        "sitemap": sha256(Path("sitemap.xml")) == prestate["sitemap_sha256"],
        "robots": sha256(Path("robots.txt")) == prestate["robots_sha256"],
    }
    if not all(unchanged_guards.values()): failures.append(f"guard file changed: {unchanged_guards}")

    editorial = read_csv(args.editorial_review)
    approved = [row for row in editorial if row["classification"] in {"APPROVE", "APPROVE_WITH_OMISSIONS"}]
    strongest = sorted(approved, key=lambda x: (-int(x["BD_IMPRESSIONS"]), float(x["BD_POSITION"]), x["word"]))[:10]
    high_ranking = sorted([x for x in approved if float(x["BD_POSITION"]) <= 20], key=lambda x: float(x["BD_POSITION"]))[:10]
    sparse = [x for x in approved if int(x["BD_IMPRESSIONS"]) == 1 and int(x["source_completeness_score"]) == 1][:10]
    tier_a = [x for x in approved if x["tier"] == "A"]
    tier_b = [x for x in approved if x["tier"] == "B"][:10]
    by_word_result = {x["word"]: x for x in page_results}
    qa_words = {
        "approve_with_omissions": [x["word"] for x in approved if x["classification"] == "APPROVE_WITH_OMISSIONS"],
        "strongest_bd_evidence": [x["word"] for x in strongest],
        "high_ranking": [x["word"] for x in high_ranking],
        "sparse": [x["word"] for x in sparse],
        "tier_a": [x["word"] for x in tier_a],
        "tier_b": [x["word"] for x in tier_b],
    }
    qa = {group: [by_word_result[word] for word in words] for group, words in qa_words.items()}
    validation = {
        "results": {"PASS": sum(x["status"] == "PASS" for x in page_results), "WARN": len(warnings), "FAIL": len(failures)},
        "failures": failures, "warnings": warnings, "control_unchanged": len(control_rows) - len(control_changed),
        "control_changed": control_changed, "guard_files_unchanged": unchanged_guards,
        "generated_bytes": sum(Path(path).stat().st_size for path in paths), "page_results": page_results, "human_readable_qa": qa,
    }
    report["validation"] = validation
    args.generation_report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in validation.items() if k not in {"page_results", "human_readable_qa"}}, ensure_ascii=False, indent=2))
    if failures: raise SystemExit(1)


if __name__ == "__main__":
    main()
