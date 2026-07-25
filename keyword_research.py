import os
import re
import json
from pathlib import Path
from collections import Counter, defaultdict
from bs4 import BeautifulSoup
import math

ROOT = Path(__file__).parent

# Skip these directories
SKIP_DIRS = ['word', 'tools', 'blog', 'images', 'mock-tests_backup']

# Common stopwords (Bangla + English)
STOPWORDS = set([
    'a', 'an', 'the', 'of', 'to', 'for', 'with', 'on', 'at', 'from', 'by',
    'in', 'is', 'it', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'about', 'above',
    'across', 'after', 'against', 'along', 'among', 'around', 'before',
    'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'by',
    'down', 'during', 'except', 'for', 'from', 'in', 'inside', 'into',
    'like', 'near', 'of', 'off', 'on', 'onto', 'out', 'outside', 'over',
    'since', 'through', 'throughout', 'to', 'toward', 'under', 'until',
    'up', 'upon', 'with', 'within', 'without',
    # Bangla common words
    'এবং', 'এই', 'যে', 'সে', 'তা', 'তারা', 'আমি', 'তুমি', 'আপনি',
    'এটি', 'ও', 'কি', 'কী', 'না', 'হয়', 'ছিল', 'আছে', 'হবে',
    'করতে', 'করেন', 'করেছে', 'করে', 'থেকে', 'জন্য', 'মধ্যে', 'পর্যন্ত',
    'বলে', 'সাথে', 'বিরুদ্ধে', 'সম্পর্কে', 'ছাড়া', 'মতো', 'সহ'
])

# High-value keyword patterns (Bangladesh-specific)
BANGLADESH_TOPICS = [
    'bcs', 'bank job', 'ielts', 'ssc', 'hsc', 'university admission',
    'job interview', 'visa interview', 'immigration', 'rmg', 'garments',
    'call center', 'customer service', 'hospitality', 'restaurant',
    'airport', 'shopping', 'travel', 'office english', 'business english',
    'academic english', 'spoken english', 'grammar', 'vocabulary',
    'pronunciation', 'writing', 'speaking', 'listening', 'reading'
]

class KeywordResearch:
    def __init__(self):
        self.all_keywords = []
        self.page_keywords = {}
        self.domain_keywords = defaultdict(list)
        self.keyword_counts = Counter()
        self.page_count = 0

    def should_skip(self, filepath):
        for skip in SKIP_DIRS:
            if skip in filepath.parts:
                return True
        return False

    def extract_keywords_from_text(self, text):
        """Extract keywords from text using simple NLP."""
        if not text:
            return []
        # Clean text
        text = text.lower()
        # Remove punctuation
        text = re.sub(r'[^\w\s\u0980-\u09FF]', ' ', text)
        # Split into words
        words = text.split()
        # Remove stopwords
        words = [w for w in words if w not in STOPWORDS and len(w) > 2]
        # Remove numbers
        words = [w for w in words if not w.isdigit()]
        return words

    def extract_ngrams(self, words, n=2):
        """Extract n-grams (phrases) from words."""
        if len(words) < n:
            return []
        return [' '.join(words[i:i+n]) for i in range(len(words)-n+1)]

    def analyze_page(self, filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return

        soup = BeautifulSoup(content, 'html.parser')

        # Extract title
        title_tag = soup.find('title')
        title = title_tag.string.strip() if title_tag and title_tag.string else ''

        # Extract H1s
        h1s = [h.get_text(strip=True) for h in soup.find_all('h1')]

        # Extract H2s
        h2s = [h.get_text(strip=True) for h in soup.find_all('h2')]

        # Extract meta keywords (if any)
        meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
        meta_keywords = meta_keywords.get('content', '').split(',') if meta_keywords else []

        # Extract text content (from paragraphs)
        paragraphs = [p.get_text(strip=True) for p in soup.find_all('p')]
        body_text = ' '.join(paragraphs)

        # Combine all text sources
        all_text = f"{title} { ' '.join(h1s)} {' '.join(h2s)} {body_text}"

        # Extract keywords
        words = self.extract_keywords_from_text(all_text)

        # Add meta keywords
        for kw in meta_keywords:
            kw = kw.strip().lower()
            if kw and len(kw) > 2:
                words.append(kw)

        # Extract phrases (bigrams and trigrams)
        bigrams = self.extract_ngrams(words, 2)
        trigrams = self.extract_ngrams(words, 3)

        # Combine all keywords
        all_keywords = words + bigrams + trigrams

        # Filter for meaningful keywords (min length 3 chars, no single letters)
        all_keywords = [kw for kw in all_keywords if len(kw) >= 3 and kw not in STOPWORDS]

        # Count
        for kw in all_keywords:
            self.keyword_counts[kw] += 1

        # Store page data
        rel_path = str(filepath.relative_to(ROOT))
        self.page_keywords[rel_path] = {
            'title': title,
            'keywords': all_keywords,
            'count': len(all_keywords)
        }
        self.page_count += 1

    def generate_recommendations(self):
        """Generate keyword recommendations based on frequency and relevance."""
        recommendations = []

        # Get most common keywords
        common_keywords = self.keyword_counts.most_common(100)

        # Score each keyword
        for keyword, count in common_keywords:
            if len(keyword) < 3:
                continue

            # Frequency score (higher = more important)
            freq_score = count / self.page_count

            # Topic relevance score
            topic_score = 0
            for topic in BANGLADESH_TOPICS:
                if topic in keyword or keyword in topic:
                    topic_score += 1

            # Keyword length bonus (longer phrases = more specific)
            length_bonus = len(keyword.split()) * 0.5

            # Competition indicator (more common words = higher competition)
            competition = min(1.0, count / 20)

            # Overall score
            score = (freq_score * 2) + (topic_score * 0.5) + length_bonus

            # Predict search volume (rough estimate)
            search_volume = int((count * 100) + (topic_score * 500))

            recommendations.append({
                'keyword': keyword,
                'frequency': count,
                'relevance_score': round(score, 2),
                'estimated_volume': search_volume,
                'competition': 'High' if competition > 0.6 else ('Medium' if competition > 0.3 else 'Low'),
                'topic': 'Bangladesh' if any(t in keyword for t in BANGLADESH_TOPICS) else 'General'
            })

        # Sort by relevance score
        recommendations.sort(key=lambda x: x['relevance_score'], reverse=True)
        return recommendations

    def generate_content_gaps(self):
        """Identify content gaps based on Bangladesh topics not covered."""
        gaps = []
        page_texts = ' '.join([' '.join(data['keywords']) for data in self.page_keywords.values()])

        for topic in BANGLADESH_TOPICS:
            if topic not in page_texts.lower():
                gaps.append(topic)

        return gaps

    def run_report(self):
        print("\n" + "="*70)
        print("🔍 SEO KEYWORD RESEARCH – OVIDHAN")
        print("="*70 + "\n")

        print(f"📊 **PAGES ANALYZED**: {self.page_count}")

        print("\n📈 **TOP 25 KEYWORDS (by relevance)**")
        print("-" * 70)
        recommendations = self.generate_recommendations()
        for i, rec in enumerate(recommendations[:25], 1):
            print(f"  {i:2}. {rec['keyword']:<30} | Freq: {rec['frequency']:3} | Vol: {rec['estimated_volume']:5} | Comp: {rec['competition']:<6} | Score: {rec['relevance_score']}")

        print("\n" + "="*70)
        print("📌 **KEYWORD GROUPS**")
        print("="*70)

        # Group by topic
        groups = defaultdict(list)
        for rec in recommendations:
            groups[rec['topic']].append(rec['keyword'])

        for topic, keywords in sorted(groups.items()):
            print(f"\n  {topic.upper()}: {', '.join(keywords[:10])}")

        print("\n" + "="*70)
        print("🧩 **CONTENT GAPS (Missing Topics)**")
        print("="*70)

        gaps = self.generate_content_gaps()
        if gaps:
            for gap in gaps[:10]:
                print(f"  ❌ {gap}")
        else:
            print("  ✅ All major topics covered!")

        print("\n" + "="*70)
        print("💡 **RECOMMENDATIONS**")
        print("="*70)

        # Suggested focus keywords
        focus = [rec['keyword'] for rec in recommendations[:5]]
        print(f"\n  🎯 Focus on these keywords: {', '.join(focus)}")

        # Suggested new pages
        if gaps:
            print(f"\n  📄 Create pages for: {', '.join(gaps[:5])}")

        print("\n  🔗 Use these keywords in:")
        print("    - Page titles (H1)")
        print("    - Meta descriptions")
        print("    - URL slugs")
        print("    - Internal anchor text")

        print("\n" + "="*70)
        print("✅ Keyword research complete!")

def main():
    print("🔍 Scanning HTML files for keyword research...")
    researcher = KeywordResearch()

    for file in ROOT.rglob('*.html'):
        if researcher.should_skip(file):
            continue
        researcher.analyze_page(file)

    researcher.run_report()

if __name__ == "__main__":
    main()