from pathlib import Path
from bs4 import BeautifulSoup
import re

BASE_DIR = Path(__file__).parent if '__file__' in dir() else Path('.')
HTML_EXT = '*.html'
IGNORE_DIRS = {'word', 'tools', 'seo_suite', 'scripts'}  # optional speed-up

def find_js_in_file(filepath):
    try:
        soup = BeautifulSoup(filepath.read_text(encoding='utf-8', errors='ignore'), 'html.parser')
        scripts = set()
        for tag in soup.find_all('script', src=True):
            src = tag['src']
            if src.endswith('.js'):
                scripts.add(src.split('/')[-1])  # just filename
        return scripts
    except:
        return set()

files = {}
for fp in BASE_DIR.rglob(HTML_EXT):
    if any(part in IGNORE_DIRS for part in fp.parts):
        continue
    rel = str(fp.relative_to(BASE_DIR))
    files[rel] = find_js_in_file(fp)

# Build reverse index: js_file -> list of pages
js_usage = {}
for page, scripts in files.items():
    for s in scripts:
        js_usage.setdefault(s, []).append(page)

# Print results
print("JavaScript usage by page:\n")
for js_file, pages in sorted(js_usage.items()):
    print(f"{js_file} used on {len(pages)} page(s): {', '.join(pages[:5])}{'...' if len(pages)>5 else ''}")

# Show JS files that are never referenced
all_js_files = {p.name for p in BASE_DIR.glob('*.js')}
used_js = set(js_usage.keys())
unused = all_js_files - used_js
if unused:
    print(f"\nUnused JS files (not referenced in any HTML): {', '.join(sorted(unused))}")