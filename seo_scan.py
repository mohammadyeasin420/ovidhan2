import os
import re
from pathlib import Path
from collections import defaultdict
from bs4 import BeautifulSoup
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).parent

# Skip these directories (to avoid scanning 50k word pages every time)
SKIP_DIRS = ['word', 'tools', 'blog', 'images', 'mock-tests_backup']

# SEO thresholds
MAX_TITLE_LENGTH = 60
MIN_TITLE_LENGTH = 30
MAX_DESC_LENGTH = 160
MIN_DESC_LENGTH = 70

class SEOAudit:
    def __init__(self):
        self.issues = defaultdict(list)
        self.stats = {
            'total_pages': 0,
            'pages_with_title': 0,
            'pages_with_meta': 0,
            'pages_with_h1': 0,
            'pages_with_multiple_h1': 0,
            'pages_missing_h1': 0,
            'pages_missing_title': 0,
            'pages_missing_meta': 0,
            'broken_links': [],
            'duplicate_titles': {},
            'duplicate_descriptions': {},
            'title_too_long': [],
            'title_too_short': [],
            'desc_too_long': [],
            'desc_too_short': [],
        }
        self.all_titles = defaultdict(list)
        self.all_descriptions = defaultdict(list)
        self.internal_links = {}  # page -> list of links

    def should_skip(self, filepath):
        for skip in SKIP_DIRS:
            if skip in filepath.parts:
                return True
        return False

    def check_anchor(self, filepath, anchor):
        """Check if an anchor (id or name) exists in the target file."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
            # Check for id or name attribute matching the anchor
            if soup.find(id=anchor) or soup.find(attrs={'name': anchor}):
                return True
            return False
        except:
            return False

    def check_file(self, filepath):
        if not filepath.suffix == '.html':
            return
        if self.should_skip(filepath):
            return
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return
        soup = BeautifulSoup(content, 'html.parser')

        # ---- Title ----
        title_tag = soup.find('title')
        title = title_tag.string.strip() if title_tag and title_tag.string else None
        self.stats['total_pages'] += 1

        if title:
            self.stats['pages_with_title'] += 1
            self.all_titles[title].append(str(filepath))
            if len(title) > MAX_TITLE_LENGTH:
                self.stats['title_too_long'].append((str(filepath), title, len(title)))
            elif len(title) < MIN_TITLE_LENGTH:
                self.stats['title_too_short'].append((str(filepath), title, len(title)))
        else:
            self.stats['pages_missing_title'] += 1
            self.issues['Missing Title'].append(str(filepath))

        # ---- Meta Description ----
        meta_tag = soup.find('meta', attrs={'name': 'description'})
        meta = meta_tag.get('content', '').strip() if meta_tag else None
        if meta:
            self.stats['pages_with_meta'] += 1
            self.all_descriptions[meta].append(str(filepath))
            if len(meta) > MAX_DESC_LENGTH:
                self.stats['desc_too_long'].append((str(filepath), meta, len(meta)))
            elif len(meta) < MIN_DESC_LENGTH:
                self.stats['desc_too_short'].append((str(filepath), meta, len(meta)))
        else:
            self.stats['pages_missing_meta'] += 1
            self.issues['Missing Meta Description'].append(str(filepath))

        # ---- H1 Tags ----
        h1s = soup.find_all('h1')
        if h1s:
            self.stats['pages_with_h1'] += 1
            if len(h1s) > 1:
                self.stats['pages_with_multiple_h1'] += 1
                self.issues['Multiple H1'].append((str(filepath), [h.get_text(strip=True) for h in h1s]))
        else:
            self.stats['pages_missing_h1'] += 1
            self.issues['Missing H1'].append(str(filepath))

        # ---- Internal Links & Broken Checks ----
        links = [a.get('href') for a in soup.find_all('a', href=True)]
        for href in links:
            if not href or href.startswith('javascript:') or href.startswith('mailto:'):
                continue
            parsed = urlparse(href)
            if parsed.scheme in ('http', 'https'):
                continue  # external link, skip for now

            # Handle fragment links
            # Split on '#' to separate file path and anchor
            if '#' in href:
                path_part, anchor = href.split('#', 1)
            else:
                path_part, anchor = href, None

            # If path_part is empty, it's a same-page anchor (e.g., '#section')
            if not path_part:
                # Check if anchor exists on the current page
                if anchor and not self.check_anchor(filepath, anchor):
                    self.stats['broken_links'].append((str(filepath), href, "Anchor '{}' not found".format(anchor)))
                continue

            # Resolve the target file
            if path_part.startswith('/'):
                target = ROOT / path_part[1:]
            else:
                target = filepath.parent / path_part

            # Resolve to absolute (and remove any '..' etc.)
            try:
                target = target.resolve()
            except:
                continue

            # Check if the file exists
            if not target.exists():
                self.stats['broken_links'].append((str(filepath), href, "File not found: {}".format(target)))
                continue

            # If there is an anchor, check it in the target file
            if anchor:
                if not self.check_anchor(target, anchor):
                    self.stats['broken_links'].append((str(filepath), href, "Anchor '{}' not found in {}".format(anchor, target.name)))

    def run_report(self):
        print("\n" + "="*70)
        print("🔍 SEO AUDIT REPORT – OVIDHAN")
        print("="*70 + "\n")

        print("📊 **PAGE STATISTICS**")
        print(f"  Total pages scanned: {self.stats['total_pages']}")
        print(f"  Pages with <title>: {self.stats['pages_with_title']}")
        print(f"  Pages with meta description: {self.stats['pages_with_meta']}")
        print(f"  Pages with <h1>: {self.stats['pages_with_h1']}")
        print(f"  Pages with multiple <h1>: {self.stats['pages_with_multiple_h1']}")
        print(f"  Pages missing <title>: {self.stats['pages_missing_title']}")
        print(f"  Pages missing meta description: {self.stats['pages_missing_meta']}")
        print(f"  Pages missing <h1>: {self.stats['pages_missing_h1']}")
        print(f"  Broken internal links found: {len(self.stats['broken_links'])}")

        # Duplicate titles
        dups = {t: paths for t, paths in self.all_titles.items() if len(paths) > 1}
        if dups:
            print(f"\n⚠️ **DUPLICATE TITLES ({len(dups)} titles duplicated)**")
            for title, paths in list(dups.items())[:10]:
                print(f"    '{title}' appears on {len(paths)} pages")
                for p in paths[:3]:
                    print(f"      - {p}")
                if len(paths) > 3:
                    print(f"      ... and {len(paths)-3} more")
        else:
            print("\n✅ No duplicate titles found.")

        # Duplicate descriptions
        dups_desc = {desc: paths for desc, paths in self.all_descriptions.items() if len(paths) > 1}
        if dups_desc:
            print(f"\n⚠️ **DUPLICATE META DESCRIPTIONS ({len(dups_desc)} descriptions duplicated)**")
            for desc, paths in list(dups_desc.items())[:5]:
                print(f"    '{desc[:60]}...' appears on {len(paths)} pages")
        else:
            print("\n✅ No duplicate meta descriptions found.")

        # Title length issues
        if self.stats['title_too_long']:
            print(f"\n⚠️ **TITLE TOO LONG (> {MAX_TITLE_LENGTH} chars): {len(self.stats['title_too_long'])} pages**")
            for page, title, length in self.stats['title_too_long'][:5]:
                print(f"    {page} – {length} chars: '{title[:60]}...'")
        if self.stats['title_too_short']:
            print(f"\n⚠️ **TITLE TOO SHORT (< {MIN_TITLE_LENGTH} chars): {len(self.stats['title_too_short'])} pages**")
            for page, title, length in self.stats['title_too_short'][:5]:
                print(f"    {page} – {length} chars: '{title}'")

        # Description length issues
        if self.stats['desc_too_long']:
            print(f"\n⚠️ **META DESCRIPTION TOO LONG (> {MAX_DESC_LENGTH}): {len(self.stats['desc_too_long'])} pages**")
            for page, desc, length in self.stats['desc_too_long'][:3]:
                print(f"    {page} – {length} chars")
        if self.stats['desc_too_short']:
            print(f"\n⚠️ **META DESCRIPTION TOO SHORT (< {MIN_DESC_LENGTH}): {len(self.stats['desc_too_short'])} pages**")
            for page, desc, length in self.stats['desc_too_short'][:3]:
                print(f"    {page} – {length} chars")

        # Broken internal links
        if self.stats['broken_links']:
            print(f"\n💔 **BROKEN INTERNAL LINKS ({len(self.stats['broken_links'])} found)**")
            for page, href, target in self.stats['broken_links'][:10]:
                print(f"    {page} -> href='{href}' (target: {target})")
            if len(self.stats['broken_links']) > 10:
                print(f"    ... and {len(self.stats['broken_links'])-10} more")
        else:
            print("\n✅ No broken internal links found.")

        # Missing elements summary
        print(f"\n📌 **MISSING ELEMENTS SUMMARY**")
        print(f"  Missing <title>: {len(self.issues.get('Missing Title', []))}")
        print(f"  Missing meta description: {len(self.issues.get('Missing Meta Description', []))}")
        print(f"  Missing <h1>: {len(self.issues.get('Missing H1', []))}")
        print(f"  Multiple <h1>: {len(self.issues.get('Multiple H1', []))}")

        print("\n" + "="*70)
        print("✅ SEO scan complete!")

def main():
    print("🔍 Scanning HTML files for SEO issues...")
    auditor = SEOAudit()
    for file in ROOT.rglob('*.html'):
        auditor.check_file(file)
    auditor.run_report()

if __name__ == "__main__":
    main()