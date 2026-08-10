import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

DATA_FILE = ROOT / "5000-common-words-data.json"
OVERRIDES_FILE = ROOT / "data" / "vocabulary-primary-senses.json"

ALLOWED_POS = {
    "noun",
    "verb",
    "adjective",
    "adverb",
    "pronoun",
    "preposition",
    "conjunction",
    "determiner",
    "article",
    "modal",
    "auxiliary",
    "interjection",
    "other",
}


def load_json(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def main():
    rows = load_json(DATA_FILE)
    overrides = load_json(OVERRIDES_FILE)

    if len(rows) != 5000:
        raise ValueError(f"Expected 5000 rows, found {len(rows)}")

    seen_words = set()
    seen_ranks = set()
    applied = 0

    for row in rows:
        word = str(row.get("word", "")).strip().lower()
        rank = row.get("rank")

        if not word:
            raise ValueError("Found row with empty word")

        if word in seen_words:
            raise ValueError(f"Duplicate word found: {word}")

        if rank in seen_ranks:
            raise ValueError(f"Duplicate rank found: {rank}")

        seen_words.add(word)
        seen_ranks.add(rank)

        override = overrides.get(word)

        if override:
            row["bangla"] = override["bangla"].strip()
            row["pos"] = override["pos"].strip().lower()
            row["definition"] = override["definition"].strip()
            row["synonyms"] = override.get("synonyms", [])
            applied += 1

        pos = str(row.get("pos", "other")).strip().lower()

        if pos not in ALLOWED_POS:
            row["pos"] = "other"

        if not str(row.get("bangla", "")).strip():
            raise ValueError(f"Missing Bangla meaning: {word}")

    expected_ranks = set(range(1, 5001))

    if seen_ranks != expected_ranks:
        missing = sorted(expected_ranks - seen_ranks)
        extra = sorted(seen_ranks - expected_ranks)
        raise ValueError(
            f"Rank mismatch. Missing={missing[:10]} Extra={extra[:10]}"
        )

    stage_counts = {}

    for row in rows:
        stage = int(row.get("stage", 0))
        stage_counts[stage] = stage_counts.get(stage, 0) + 1

    expected_stage_counts = {
        1: 1000,
        2: 1000,
        3: 1000,
        4: 1000,
        5: 1000,
    }

    if stage_counts != expected_stage_counts:
        raise ValueError(
            f"Stage counts invalid: {stage_counts}"
        )

    forbidden_words = {"con", "aux"}

    found_forbidden = forbidden_words.intersection(seen_words)

    if found_forbidden:
        raise ValueError(
            f"Forbidden reserved words found: {sorted(found_forbidden)}"
        )

    with DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(
            rows,
            f,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    print(f"Primary-sense overrides applied: {applied}")
    print("Rows: 5000")
    print("Unique words: 5000")
    print("Ranks: 1-5000")
    print("Stages: 1000 each")
    print("Validation: PASS")


if __name__ == "__main__":
    main()
