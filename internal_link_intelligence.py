"""
Internal Link Intelligence - Debug Version
"""
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
WORD_DIR = BASE_DIR / "word"
OUTPUT_MAP = BASE_DIR / "related_links_map.json"

print(f"Base dir: {BASE_DIR}")
print(f"Word dir: {WORD_DIR}")
print(f"Word dir exists: {WORD_DIR.is_dir()}")

if WORD_DIR.is_dir():
    files = list(WORD_DIR.glob("*.html"))
    print(f"Number of .html files: {len(files)}")
    if files:
        print("First 5 files:", [f.name for f in files[:5]])
else:
    print("word/ directory not found")

POS_GRAMMAR = {
    "noun": "/grammar.html#nouns",
    "verb": "/grammar.html#verbs",
    "adjective": "/grammar.html#adjectives",
    "adverb": "/grammar.html#adverbs",
}

POS_BY_SUFFIX = {
    "tion": "noun", "sion": "noun", "ment": "noun", "ness": "noun", "ity": "noun",
    "ous": "adjective", "ful": "adjective", "less": "adjective", "able": "adjective", "ible": "adjective",
    "ise": "verb", "ize": "verb", "ate": "verb", "ify": "verb",
    "ly": "adverb"
}

def guess_pos(word):
    for suffix, pos in POS_BY_SUFFIX.items():
        if word.lower().endswith(suffix):
            return pos
    return None

def main():
    if not WORD_DIR.is_dir():
        return
    word_files = list(WORD_DIR.glob("*.html"))
    link_map = {}
    for fp in word_files:
        word = fp.stem
        links = []
        pos = guess_pos(word)
        if pos:
            links.append({"text": f"Grammar: {pos}", "url": POS_GRAMMAR[pos]})
        links.append({"text": "Dictionary Home", "url": "/dictionary.html"})
        link_map[word] = links
    with open(OUTPUT_MAP, "w", encoding="utf-8") as f:
        json.dump(link_map, f, indent=2, ensure_ascii=False)
    print(f"✅ Created link map with {len(link_map)} words")

if __name__ == "__main__":
    main()