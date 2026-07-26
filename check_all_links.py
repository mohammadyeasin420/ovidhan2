import os
import re
from pathlib import Path
from urllib.parse import urlparse
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent
SKIP_DIRS = ['word', 'images', 'mock-tests_backup']
EXCLUDE_EXTS = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.json', '.xml']

def should_skip(filepath):
    for skip in SKIP_DIRS:
        if skip in filepath.parts:
            return True
    return False

def is_html_file(filepath):
    return filepath.suffix in ['.html', '.htm']

def resolve_link(href, current_path):
    parsed = urlparse(href)
    if parsed.scheme in ('http', 'https'):
        return None  # external
    if href.startswith('#'):
        return None  # same-page anchor
    if href.startswith('javascript:') or href.startswith('mailto:'):
        return None
    # Resolve relative path
    if href.startswith('/'):
        target = ROOT / href[1:]
    else:
        target = current_path.parent / href
    return target.resolve()

def check_anchor(filepath, anchor):
    if not anchor:
        return True
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        soup = BeautifulSoup(content, 'html.parser')
        return bool(soup.find(id=anchor) or soup.find(attrs={'name': anchor}))
    except:
        return False

def main():
    print("🔍 Scanning all HTML files for broken links...\n")
    broken = []
    total_links = 0

    for filepath in ROOT.rglob('*'):
        if not is_html_file(filepath) or should_skip(filepath):
            continue
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            continue
        soup = BeautifulSoup(content, 'html.parser')
        links = soup.find_all('a', href=True)
        for a in links:
            href = a.get('href')
            if not href:
                continue
            total_links += 1
            # Parse link
            if '#' in href:
                path_part, anchor = href.split('#', 1)
            else:
                path_part, anchor = href, None

            if not path_part:
                # Same-page anchor
                if anchor and not check_anchor(filepath, anchor):
                    broken.append((str(filepath), href, "Anchor '{}' not found".format(anchor)))
                continue

            target = resolve_link(path_part, filepath)
            if target is None:
                continue

            if not target.exists():
                broken.append((str(filepath), href, "File not found: {}".format(target)))
                continue

            if anchor and not check_anchor(target, anchor):
                broken.append((str(filepath), href, "Anchor '{}' not found in {}".format(anchor, target.name)))

    print(f"Total links checked: {total_links}")
    print(f"Broken links found: {len(broken)}\n")

    if broken:
        print("💔 BROKEN LINKS:")
        for page, href, reason in broken[:20]:
            print(f"  {page} -> href='{href}' ({reason})")
        if len(broken) > 20:
            print(f"  ... and {len(broken)-20} more")
    else:
        print("✅ No broken links found!")

    # Save report
    with open('broken_links_report.txt', 'w', encoding='utf-8') as f:
        f.write("BROKEN LINKS REPORT\n")
        f.write("="*60 + "\n\n")
        for page, href, reason in broken:
            f.write(f"{page} -> {href} ({reason})\n")
    print("\n📄 Full report saved to: broken_links_report.txt")

if __name__ == "__main__":
    main()