"""
Duplicate / Thin Content Detector for Ovidhan
Compares dictionary word pages by their text fingerprint.
Outputs CSV of suspiciously similar page pairs.
"""
import csv
import hashlib
from pathlib import Path
from collections import defaultdict
from bs4 import BeautifulSoup
import re

BASE_DIR = Path(__file__).parent.parent
WORD_DIR = BASE_DIR / "word"
OUTPUT_CSV = BASE_DIR / "duplicate_content.csv"

def get_fingerprint(html_file):
    """Extract clean text, take first 500 chars, and hash it."""
    try:
        soup = BeautifulSoup(html_file.read_text(encoding="utf-8"), "html.parser")
        # Remove scripts and styles
        for tag in soup(["script", "style"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        # Only consider first 500 chars for rough similarity
        snippet = text[:500]
        return hashlib.md5(snippet.encode('utf-8')).hexdigest()
    except Exception:
        return None

def main():
    print("🔎 Duplicate Content Detector")
    word_files = list(WORD_DIR.glob("*.html"))
    print(f"Scanning {len(word_files)} word pages...")

    # Map fingerprint -> list of file names
    groups = defaultdict(list)
    for fp in word_files:
        fp_hash = get_fingerprint(fp)
        if fp_hash:
            groups[fp_hash].append(fp.name)

    # Collect all groups with more than one member
    duplicates = []
    for fp_hash, files in groups.items():
        if len(files) > 1:
            duplicates.append({
                "Fingerprint": fp_hash[:8],
                "Files": ", ".join(sorted(files)),
                "Count": len(files)
            })

    # Sort by count descending (most duplicates first)
    duplicates.sort(key=lambda x: x["Count"], reverse=True)

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Fingerprint", "Files", "Count"])
        writer.writeheader()
        writer.writerows(duplicates)

    print(f"✅ Found {len(duplicates)} duplicate/near-duplicate groups.")
    print(f"   Total affected pages: {sum(d['Count'] for d in duplicates)}")
    if duplicates:
        print("Top groups:")
        for d in duplicates[:10]:
            print(f"  {d['Count']} pages: {d['Files']}")

if __name__ == "__main__":
    main()