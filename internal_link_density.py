import os
from pathlib import Path
from bs4 import BeautifulSoup
from collections import defaultdict
ROOT = Path(__file__).parent
SKIP_DIRS = ['word', 'images', 'mock-tests_backup']

def should_skip(filepath):
    for skip in SKIP_DIRS:
        if skip in filepath.parts:
            return True
    return False

def main():
    internal_links = defaultdict(set)
    pages = []

    for filepath in ROOT.rglob('*.html'):
        if should_skip(filepath):
            continue
        pages.append(filepath)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            continue
        soup = BeautifulSoup(content, 'html.parser')
        links = soup.find_all('a', href=True)
        for a in links:
            href = a['href']
            if href.startswith('#') or href.startswith('javascript:') or href.startswith('mailto:'):
                continue
            if href.startswith('http'):
                continue
            if href.startswith('/'):
                target = href[1:]
            else:
                target = href
            if target.endswith('.html') or '.' not in target:
                internal_links[filepath].add(target)

    orphan = []
    for page in pages:
        rel_path = str(page.relative_to(ROOT))
        # Count how many pages link to this page
        linked_by = 0
        for src, targets in internal_links.items():
            if rel_path in [t.split('#')[0] for t in targets]:
                linked_by += 1
        if linked_by == 0:
            orphan.append(rel_path)

    print(f"📊 Found {len(orphan)} orphan pages (no internal links pointing to them).\n")
    for page in orphan[:30]:
        print(f"  {page}")
    if len(orphan) > 30:
        print(f"  ... and {len(orphan)-30} more")

    with open('orphan_pages_report.txt', 'w', encoding='utf-8') as f:
        f.write("ORPHAN PAGES REPORT\n")
        f.write("="*60 + "\n\n")
        for page in orphan:
            f.write(page + "\n")

if __name__ == "__main__":
    main()