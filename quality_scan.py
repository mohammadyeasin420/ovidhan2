import os
import re
from pathlib import Path
from bs4 import BeautifulSoup
from collections import defaultdict

ROOT = Path(__file__).parent

# Skip these directories
SKIP_DIRS = ['word', 'tools', 'blog', 'images', 'mock-tests_backup']

class QualityAudit:
    def __init__(self):
        self.results = []

    def should_skip(self, filepath):
        for skip in SKIP_DIRS:
            if skip in filepath.parts:
                return True
        return False

    def analyze_page(self, filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return

        soup = BeautifulSoup(content, 'html.parser')
        rel_path = str(filepath.relative_to(ROOT))

        # ---- Extract metrics ----
        title_tag = soup.find('title')
        title = title_tag.string.strip() if title_tag and title_tag.string else ''
        title_len = len(title)

        meta = soup.find('meta', attrs={'name': 'description'})
        meta_content = meta.get('content', '').strip() if meta else ''
        meta_len = len(meta_content)

        h1s = [h.get_text(strip=True) for h in soup.find_all('h1')]
        h1_count = len(h1s)
        has_h1 = h1_count > 0
        multiple_h1 = h1_count > 1

        # Get all text content (excluding script/style)
        text_content = soup.get_text(separator=' ', strip=True)
        word_count = len(text_content.split())

        # Internal links count (excluding external)
        links = [a.get('href') for a in soup.find_all('a', href=True)]
        internal_links = [l for l in links if l and not l.startswith('http') and not l.startswith('#')]
        internal_count = len(internal_links)

        # Images with alt text
        imgs = soup.find_all('img')
        imgs_with_alt = [i for i in imgs if i.get('alt') and i['alt'].strip()]
        img_alt_ratio = len(imgs_with_alt) / len(imgs) if imgs else 1.0

        # Content freshness (approximate from meta or file date)
        # We'll use file modification time
        try:
            mtime = filepath.stat().st_mtime
            from datetime import datetime
            last_modified = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')
        except:
            last_modified = 'unknown'

        # Calculate quality score (0-100)
        score = 0
        # Title: ideal 30-60 chars
        if 30 <= title_len <= 60:
            score += 20
        elif 20 <= title_len <= 70:
            score += 10
        # Meta: ideal 70-160 chars
        if 70 <= meta_len <= 160:
            score += 20
        elif 50 <= meta_len <= 200:
            score += 10
        # H1: one H1
        if has_h1 and not multiple_h1:
            score += 15
        elif has_h1 and multiple_h1:
            score += 5
        # Word count: at least 500 words
        if word_count >= 500:
            score += 20
        elif word_count >= 200:
            score += 10
        # Internal links: at least 5
        if internal_count >= 5:
            score += 15
        elif internal_count >= 2:
            score += 8
        # Image alt: at least 80% have alt
        if img_alt_ratio >= 0.8:
            score += 10
        elif img_alt_ratio >= 0.5:
            score += 5

        self.results.append({
            'path': rel_path,
            'title': title[:50] + '...' if len(title) > 50 else title,
            'title_len': title_len,
            'meta_len': meta_len,
            'h1_count': h1_count,
            'word_count': word_count,
            'internal_links': internal_count,
            'img_alt_ratio': round(img_alt_ratio * 100, 1),
            'last_modified': last_modified,
            'score': score
        })

    def run_scan(self):
        for filepath in ROOT.rglob('*.html'):
            if self.should_skip(filepath):
                continue
            self.analyze_page(filepath)

        # Sort by score (ascending)
        self.results.sort(key=lambda x: x['score'])

        # Print report
        print("\n" + "="*80)
        print("📊 QUALITY SCAN REPORT – OVIDHAN")
        print("="*80 + "\n")

        print(f"Total pages analyzed: {len(self.results)}\n")

        print("📌 **PAGES WITH LOWEST QUALITY SCORE (Need Improvement)**")
        print("-"*80)
        print(f"{'Score':<6} {'Page':<50} {'Words':<8} {'TitleLen':<8} {'MetaLen':<8} {'H1'}")
        print("-"*80)

        # Show bottom 30
        for item in self.results[:30]:
            print(f"{item['score']:<6} {item['path'][:50]:<50} {item['word_count']:<8} {item['title_len']:<8} {item['meta_len']:<8} {item['h1_count']}")

        # Summary stats
        avg_score = sum(r['score'] for r in self.results) / len(self.results) if self.results else 0
        print("\n" + "="*80)
        print("📈 **SUMMARY STATISTICS**")
        print(f"  Average quality score: {avg_score:.1f}/100")
        print(f"  Pages with score < 50: {sum(1 for r in self.results if r['score'] < 50)}")
        print(f"  Pages with score >= 80: {sum(1 for r in self.results if r['score'] >= 80)}")
        print(f"  Pages missing title: {sum(1 for r in self.results if r['title_len'] == 0)}")
        print(f"  Pages missing meta description: {sum(1 for r in self.results if r['meta_len'] == 0)}")
        print(f"  Pages without H1: {sum(1 for r in self.results if r['h1_count'] == 0)}")
        print(f"  Pages with < 200 words: {sum(1 for r in self.results if r['word_count'] < 200)}")

        print("\n💡 **RECOMMENDATIONS**")
        print("  - Prioritize pages with the lowest score (top of the list).")
        print("  - Improve content length (aim for 500+ words).")
        print("  - Optimize titles (30-60 chars) and meta descriptions (70-160).")
        print("  - Add more internal links to related pages.")
        print("  - Ensure each page has one H1 heading.")

        print("\n🔍 **NEXT STEP:** Check Google Search Console for actual ranking positions.")
        print("  - Go to Search Console > Performance > Pages")
        print("  - Filter by 'Average position' to see which pages rank best.")
        print("  - Compare with this quality report to find low-quality pages that rank poorly.")

        print("="*80)

def main():
    print("🔍 Scanning for quality metrics...")
    audit = QualityAudit()
    audit.run_scan()

if __name__ == "__main__":
    main()