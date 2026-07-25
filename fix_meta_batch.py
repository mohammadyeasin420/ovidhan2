import os
import re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent

# ── All pages missing meta descriptions (from SEO scan) ──
MISSING_META_PAGES = [
    'mock-tests/daily-challenge.html',
    'mock-tests/grammar-test-1.html',
    'mock-tests/grammar-test-2.html',
    'mock-tests/grammar-test-3.html',
    'mock-tests/index.html',
    'mock-tests/reading-test-1.html',
    'mock-tests/ssc-test-1.html',
    'mock-tests/university-test-1.html',
    'mock-tests/university-test-2.html',
    'mock-tests/vocabulary-test-1.html',
    'mock-tests/vocabulary-test-2.html',
    'mock-tests/ielts-test-1.html',
    'mock-tests/writing-test-1.html',
    'mock-tests/listening-test-1.html',
    # Add other missing pages if known
]

# ── Pages missing titles ──
MISSING_TITLE_PAGES = [
    'mock-tests/daily-challenge.html',
    'mock-tests/grammar-test-1.html',
    'mock-tests/index.html',
]

def generate_title(filepath):
    """Generate a title based on the filename."""
    name = filepath.stem.replace('-', ' ').replace('_', ' ').title()
    return f"{name} – Free English Practice | Ovidhan"

def generate_desc(filepath):
    """Generate a meta description based on the filename."""
    name = filepath.stem.replace('-', ' ').replace('_', ' ').title()
    return f"Practice {name} with our free English mock test. Perfect for BCS, IELTS, and Bank Jobs preparation. Free for Bangladeshi learners."

def fix_meta(filepath, title=None, desc=None):
    if not filepath.exists():
        print(f"❌ Not found: {filepath}")
        return

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return

    soup = BeautifulSoup(content, 'html.parser')

    # Ensure head exists
    if not soup.head:
        head = soup.new_tag('head')
        soup.html.insert(0, head)

    # Fix title
    if title is None:
        title = generate_title(filepath)
    title_tag = soup.find('title')
    if title_tag:
        title_tag.string = title
    else:
        new_title = soup.new_tag('title')
        new_title.string = title
        soup.head.append(new_title)

    # Fix meta description
    if desc is None:
        desc = generate_desc(filepath)
    meta = soup.find('meta', attrs={'name': 'description'})
    if meta:
        meta['content'] = desc
    else:
        new_meta = soup.new_tag('meta', attrs={'name': 'description', 'content': desc})
        soup.head.append(new_meta)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"✅ Fixed: {filepath}")

def main():
    print("🔧 Fixing missing meta data...\n")

    # Fix missing titles
    for path in MISSING_TITLE_PAGES:
        full_path = ROOT / path
        fix_meta(full_path)

    # Fix missing meta descriptions (skip those already fixed by title function)
    for path in MISSING_META_PAGES:
        full_path = ROOT / path
        # If the page was already processed, skip to avoid duplication
        if path in MISSING_TITLE_PAGES:
            continue
        fix_meta(full_path)

    print("\n🎉 Done! All missing titles and meta descriptions added.")
    print("\n📌 Next: Run SEO scan again to verify.")

if __name__ == "__main__":
    main()