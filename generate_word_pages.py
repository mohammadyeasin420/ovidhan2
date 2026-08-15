"""Controlled static dictionary page generator.

Generation is forbidden unless one explicit mode is supplied: ``--words``,
``--batch-start`` plus ``--batch-size``, or ``--full``.
"""

import argparse
import html
import json
import re
from pathlib import Path


SOURCE_PATH = Path("enriched-dictionary.json")
OUTPUT_DIR = Path("word")
HEADER_PATH = Path("header.html")
FOOTER_PATH = Path("footer.html")
SLUG_RE = re.compile(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*\Z")


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


def render_page(slug, entry, header_html=None, footer_html=None):
    if header_html is None or footer_html is None:
        header_html, footer_html = load_site_layout()
    source_word = nonempty(entry, "english") or nonempty(entry, "word") or nonempty(entry, "en") or slug
    word = source_word.strip().lower()
    bangla = nonempty(entry, "bangla")
    part_of_speech = nonempty(entry, "part_of_speech")
    definition = nonempty(entry, "definition")
    pronunciation = nonempty(entry, "pronunciation")
    example, rejected_examples = select_example(entry, slug)

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


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--words", nargs="+", help="Generate only these explicit canonical words.")
    parser.add_argument("--batch-start", type=int, help="Zero-based start in stable canonical-word order.")
    parser.add_argument("--batch-size", type=int, help="Number of unique pages in the controlled batch.")
    parser.add_argument("--full", action="store_true", help="Explicitly generate every valid unique record.")
    parser.add_argument("--report", type=Path, help="Write a JSON generation manifest and statistics report.")
    return parser.parse_args()


def select_mode(args, normalized):
    batch_supplied = args.batch_start is not None or args.batch_size is not None
    mode_count = int(bool(args.words)) + int(batch_supplied) + int(args.full)
    if mode_count != 1:
        raise SystemExit("Supply exactly one mode: --words, --batch-start with --batch-size, or --full.")

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
        return "words", requested

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
        return "batch", selected

    return "full", [(slug, entry) for slug, entry in normalized if is_publishable(entry)]


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
    mode, selected = select_mode(args, normalized)
    quality = full_quality_stats(records, normalized, duplicates, invalid)
    header_html, footer_html = load_site_layout()

    OUTPUT_DIR.mkdir(exist_ok=True)
    generated_paths = []
    rejected_in_selection = []
    published_examples = 0
    for slug, entry in selected:
        page, rejected, has_example = render_page(slug, entry, header_html, footer_html)
        path = OUTPUT_DIR / f"{slug}.html"
        path.write_text(page, encoding="utf-8")
        generated_paths.append(path.as_posix())
        published_examples += int(has_example)
        rejected_in_selection.extend({"word": slug, **item} for item in rejected)

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
    }
    print(json.dumps({key: value for key, value in report.items() if key not in {"generated_paths", "rejected_examples"}}, ensure_ascii=False, indent=2))
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Report: {args.report}")


if __name__ == "__main__":
    main()
