"""
Orphan Page Finder for Ovidhan
Scans all HTML files, builds an internal link graph, 
and outputs pages that have ZERO incoming internal links.
"""
import os
import csv
from pathlib import Path
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

BASE_DIR = Path(__file__).parent.parent
OUTPUT_CSV = BASE_DIR / "orphan_pages.csv"

# All HTML files to scan
SCAN_DIRS = [
    BASE_DIR,            # root pages
    BASE_DIR / "word",   # dictionary
    BASE_DIR / "tools",  # tools
]

def collect_all_html():
    files = []
    for d in SCAN_DIRS:
        if d.is_dir():
            files.extend(d.glob("*.html"))
    return files

def extract_internal_links(file_path):
    """Return set of resolved relative URLs pointing to other project pages."""
    links = set()
    try:
        soup = BeautifulSoup(file_path.read_text(encoding="utf-8"), "html.parser")
        for tag in soup.find_all("a", href=True):
            href = tag["href"].strip()
            if href.startswith("http") or href.startswith("//") or href.startswith("mailto:") or href.startswith("javascript:"):
                continue
            # Resolve relative to the file's directory, then make relative to BASE_DIR
            abs_path = (file_path.parent / href.split("#")[0].split("?")[0]).resolve()
            try:
                rel = abs_path.relative_to(BASE_DIR)
                links.add(str(rel).replace("\\", "/"))
            except ValueError:
                pass  # outside project
    except Exception:
        pass
    return links

def main():
    print("🔍 Orphan Page Finder")
    html_files = collect_all_html()
    print(f"Total HTML files: {len(html_files)}")

    # Phase 1: Build incoming link count
    incoming = defaultdict(int)
    # Also store every known page path for later checking
    all_pages = set()
    for fp in html_files:
        rel = str(fp.relative_to(BASE_DIR)).replace("\\", "/")
        all_pages.add(rel)

    print("Phase 1: Extracting internal links...")
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(extract_internal_links, fp): fp for fp in html_files}
        for future in as_completed(futures):
            links = future.result()
            for link in links:
                incoming[link] += 1

    # Phase 2: Identify orphans (pages with zero incoming links)
    orphans = []
    for page in sorted(all_pages):
        if incoming[page] == 0:
            # Ignore some utility pages you may want to exclude
            if page in {"robots.txt", "sitemap.xml", "404.html"}:
                continue
            orphans.append({"Page": page, "Incoming Links": 0})

    # Save CSV
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Page", "Incoming Links"])
        writer.writeheader()
        writer.writerows(orphans)

    print(f"✅ Found {len(orphans)} orphan pages. Saved to {OUTPUT_CSV}")
    if orphans:
        print("Sample:")
        for o in orphans[:10]:
            print(f"  {o['Page']}")

if __name__ == "__main__":
    main()