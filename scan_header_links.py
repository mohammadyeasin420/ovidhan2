import os
import re
from pathlib import Path
from urllib.parse import urlparse
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent
HEADER_FILE = ROOT / "header.html"

def extract_links_from_header():
    """Parse header.html and return all href attributes."""
    if not HEADER_FILE.exists():
        print("❌ header.html not found!")
        return []

    with open(HEADER_FILE, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    links = []
    for a in soup.find_all('a', href=True):
        href = a['href']
        # Skip empty or anchor-only links
        if href.startswith('#') or href == '':
            continue
        links.append(href)
    return links

def check_internal_link(href, root=ROOT):
    """
    Resolve an internal URL to a file path and check if it exists.
    Returns (exists, resolved_path, note)
    """
    # Remove leading slash for root-relative links
    if href.startswith('/'):
        href = href[1:]

    # Handle query strings (e.g., ?word=xxx) – remove them
    if '?' in href:
        href = href.split('?')[0]

    # Handle fragments (e.g., #section)
    if '#' in href:
        href = href.split('#')[0]

    if not href:
        return False, None, "Empty link"

    # Try exact file match
    file_path = root / href
    if file_path.exists():
        return True, file_path, "Exact match"

    # Try adding .html if missing
    if not href.endswith('.html') and not href.endswith('/'):
        file_path = root / (href + '.html')
        if file_path.exists():
            return True, file_path, "Added .html"

    # Try index.html if href ends with /
    if href.endswith('/'):
        file_path = root / href / 'index.html'
        if file_path.exists():
            return True, file_path, "Index file"

    # Try directory with index.html
    file_path = root / href / 'index.html'
    if file_path.exists():
        return True, file_path, "Index file in dir"

    return False, None, "File not found"

def main():
    print("🔍 Scanning header links...\n")
    links = extract_links_from_header()
    if not links:
        print("No links found in header.")
        return

    print(f"Found {len(links)} links in header.\n")
    print("=" * 80)
    print(f"{'Link':<40} {'Status':<15} {'Path'}")
    print("=" * 80)

    internal_ok = 0
    internal_missing = 0
    external = 0

    for href in links:
        parsed = urlparse(href)
        if parsed.scheme in ('http', 'https'):
            # External link
            print(f"{href:<40} 🌐 External")
            external += 1
        else:
            # Internal link
            exists, path, note = check_internal_link(href)
            if exists:
                print(f"{href:<40} ✅ OK      {path.relative_to(ROOT)}")
                internal_ok += 1
            else:
                print(f"{href:<40} ❌ MISSING {note}")
                internal_missing += 1

    print("=" * 80)
    print(f"\n📊 SUMMARY:")
    print(f"  Internal links: {internal_ok + internal_missing}")
    print(f"    ✅ OK: {internal_ok}")
    print(f"    ❌ Missing: {internal_missing}")
    print(f"  External links: {external}")
    print(f"  Total: {len(links)}")

if __name__ == "__main__":
    main()