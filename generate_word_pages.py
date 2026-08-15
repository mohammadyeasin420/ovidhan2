"""Generate the explicitly approved Dictionary Static SEO Pilot pages only."""

import argparse
import html
import json
from pathlib import Path


PILOT_WORDS = frozenset({
    "apple", "beautiful", "education", "grammar", "knowledge",
    "language", "opportunity", "technology", "water", "zebra",
})

PROHIBITED_EXAMPLES = {
    "beautiful": "This is a beautiful.",
    "opportunity": "This is a opportunity.",
    "water": "This is a water.",
}


def nonempty(entry, field):
    value = entry.get(field)
    return value.strip() if isinstance(value, str) and value.strip() else None


def render_page(entry):
    word = nonempty(entry, "english")
    meaning = nonempty(entry, "bangla")
    if not word or not meaning:
        raise ValueError("Every pilot entry must have an English word and Bangla meaning")

    part_of_speech = nonempty(entry, "part_of_speech")
    definition = nonempty(entry, "definition")
    pronunciation = nonempty(entry, "pronunciation")
    example = nonempty(entry, "example")
    if not example:
        examples = entry.get("examples")
        if isinstance(examples, list):
            example = next((item.strip() for item in examples if isinstance(item, str) and item.strip()), None)
    if example == PROHIBITED_EXAMPLES.get(word):
        example = None

    canonical = f"https://ovidhan.net/word/{word}.html"
    title = f"{word} Meaning in Bangla | Ovidhan"
    description = f"{word} meaning in Bangla: {meaning}."
    if definition:
        description += f" Definition: {definition}."

    details = [f'        <p><strong>Bangla meaning:</strong> <span lang="bn">{html.escape(meaning)}</span></p>']
    for label, value, css_class in (
        ("Part of speech", part_of_speech, "part-of-speech"),
        ("Pronunciation", pronunciation, "pronunciation"),
        ("Definition", definition, "definition"),
        ("Example", example, "example"),
    ):
        if value:
            details.append(f'        <p class="{css_class}"><strong>{label}:</strong> {html.escape(value)}</p>')

    structured_data = {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        "name": word,
        "description": description,
        "inLanguage": ["en", "bn"],
        "url": canonical,
    }

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html.escape(title)}</title>
    <meta name="description" content="{html.escape(description, quote=True)}">
    <link rel="stylesheet" href="../styles.css">
    <link rel="canonical" href="{canonical}">
    <script type="application/ld+json">{json.dumps(structured_data, ensure_ascii=False, indent=2)}</script>
</head>
<body>
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
</body>
</html>
"""


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--allowlist", nargs="+", required=True,
        help="Mandatory explicit word allowlist; must exactly match the approved pilot.",
    )
    return parser.parse_args()


def main():
    requested = set(parse_args().allowlist)
    if requested != PILOT_WORDS:
        missing = sorted(PILOT_WORDS - requested)
        unapproved = sorted(requested - PILOT_WORDS)
        raise SystemExit(
            f"Refusing generation: allowlist must exactly match the pilot. "
            f"Missing={missing}; unapproved={unapproved}"
        )

    with Path("enriched-dictionary.json").open(encoding="utf-8") as source:
        dictionary_data = json.load(source)

    entries = {entry.get("english"): entry for entry in dictionary_data if entry.get("english") in PILOT_WORDS}
    missing_entries = PILOT_WORDS - entries.keys()
    if missing_entries:
        raise SystemExit(f"Missing pilot source entries: {sorted(missing_entries)}")

    output_dir = Path("word")
    output_dir.mkdir(exist_ok=True)
    for word in sorted(requested):
        path = output_dir / f"{word}.html"
        path.write_text(render_page(entries[word]), encoding="utf-8")
        print(f"Generated: {path}")


if __name__ == "__main__":
    main()
