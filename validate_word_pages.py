"""Validate generated static dictionary pages from a generator report."""

import argparse
import html
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from generate_word_pages import example_candidates, example_rejection_reason, nonempty, normalize_records, select_example


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    return parser.parse_args()


def main():
    args = parse_args()
    report = json.loads(args.report.read_text(encoding="utf-8"))
    source_records = json.loads(Path("enriched-dictionary.json").read_text(encoding="utf-8"))
    normalized, _, _ = normalize_records(source_records)
    entries = dict(normalized)
    paths = report["generated_paths"]
    slugs = [Path(path).stem for path in paths]
    results = {"PASS": 0, "WARN": 0, "FAIL": 0}
    failures = []
    warnings = []
    seen_canonicals = set()

    def read_page(path_text):
        path = Path(path_text)
        return path.read_text(encoding="utf-8") if path.is_file() else None

    with ThreadPoolExecutor(max_workers=16) as executor:
        page_contents = dict(zip(paths, executor.map(read_page, paths)))

    if len(paths) != report["generated_page_count"] or len(slugs) != len(set(slugs)):
        failures.append("Manifest count mismatch or duplicate slug")

    for path_text, slug in zip(paths, slugs):
        entry = entries.get(slug)
        page_failures = []
        page = page_contents[path_text]
        if page is None or entry is None:
            failures.append(f"{slug}: missing file or source entry")
            continue
        word = (nonempty(entry, "english") or nonempty(entry, "word") or nonempty(entry, "en") or slug).lower()
        canonical = f"https://ovidhan.net/word/{slug}.html"
        canonical_matches = re.findall(r'<link rel="canonical" href="([^"]+)">', page)
        if canonical_matches != [canonical] or canonical in seen_canonicals:
            page_failures.append("canonical")
        seen_canonicals.add(canonical)
        if f"<h1>{html.escape(word)} meaning in Bangla</h1>" not in page:
            page_failures.append("h1")
        for field, css_class in (("bangla", "bangla-meaning"), ("definition", "definition"), ("part_of_speech", "part-of-speech"), ("pronunciation", "pronunciation")):
            value = nonempty(entry, field)
            present = f'class="{css_class}"' in page
            if present != bool(value) or (value and html.escape(value) not in page):
                page_failures.append(field)
        rejected = [candidate for candidate in example_candidates(entry) if example_rejection_reason(candidate, slug, (nonempty(entry, "part_of_speech") or "").lower())]
        if any(html.escape(candidate) in page for candidate in rejected):
            page_failures.append("rejected-example")
        banned = ("Meaning not available", "Word type: N/A", "/ ... /", "is a common word in English")
        if any(text.lower() in page.lower() for text in banned):
            page_failures.append("banned-placeholder")
        if re.search(r"\{[A-Za-z_][^}]*\}", page):
            page_failures.append("template-placeholder")
        if "../learning-explorer.js" not in page or "Learning Explorer" not in page:
            page_failures.append("learning-explorer")
        if "noindex" in page.lower():
            page_failures.append("noindex")
        scripts = re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S)
        try:
            schemas = [json.loads(script) for script in scripts]
            schema_types = {schema.get("@type") for schema in schemas}
            defined_term = next(schema for schema in schemas if schema.get("@type") == "DefinedTerm")
            expected_description = nonempty(entry, "definition") or nonempty(entry, "bangla")
            if schema_types != {"BreadcrumbList", "DefinedTerm"} or not expected_description or not defined_term.get("description"):
                page_failures.append("json-ld")
            if expected_description and defined_term["description"] != expected_description:
                page_failures.append("json-ld-description")
        except (json.JSONDecodeError, KeyError, StopIteration):
            page_failures.append("json-ld")
        if page_failures:
            failures.append(f"{slug}: {', '.join(sorted(set(page_failures)))}")
        else:
            results["PASS"] += 1

    results["FAIL"] = len(failures)
    results["WARN"] = len(warnings)
    def sample(slug):
        entry = entries[slug]
        example, rejected = select_example(entry, slug)
        return {
            "word": slug,
            "bangla": nonempty(entry, "bangla"),
            "part_of_speech": nonempty(entry, "part_of_speech"),
            "definition": nonempty(entry, "definition"),
            "pronunciation": nonempty(entry, "pronunciation"),
            "published_example": example,
            "rejected_example_count": len(rejected),
        }

    rich = [slug for slug in slugs if nonempty(entries[slug], "bangla") and nonempty(entries[slug], "definition") and nonempty(entries[slug], "part_of_speech")][:10]
    sparse = [slug for slug in slugs if nonempty(entries[slug], "bangla") and not nonempty(entries[slug], "definition") and not nonempty(entries[slug], "part_of_speech") and not example_candidates(entries[slug])][:10]
    rejected_words = list(dict.fromkeys(item["word"] for item in report["rejected_examples"]))[:10]
    qa = {
        "rich_data": [sample(slug) for slug in rich],
        "sparse_data": [sample(slug) for slug in sparse],
        "rejected_examples": [sample(slug) for slug in rejected_words],
        "first_five": [sample(slug) for slug in slugs[:5]],
        "last_five": [sample(slug) for slug in slugs[-5:]],
    }
    summary = {
        "results": results,
        "failures": failures,
        "warnings": warnings,
        "generated_bytes": sum(Path(path).stat().st_size for path in paths),
        "qa": qa,
    }
    report["validation"] = summary
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
