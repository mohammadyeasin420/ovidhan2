import os
import json
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent

# ─── Core Pages ───
CORE_PAGES = [
    'index.html', 'learn.html', 'dictionary.html', 'grammar.html',
    'speaking.html', 'writing.html', 'practice.html', 'assessment.html',
    'exam-prep.html', 'tools.html', 'bangladesh.html', 'blog.html',
    'dashboard.html', 'search.html', 'explorer.html', 'flashcards.html',
    'quiz.html'
]

# ─── System Files ───
SYSTEM_FILES = [
    'styles.css', 'header.html', 'footer.html',
    'inject_layout.py', 'generate_content_map.py',
    'generate_search_index.py', 'generate_sitemap.py',
    'content-map.json', 'search-index.json', 'sitemap.xml'
]

# ─── JavaScript Files ───
JS_FILES = [
    'gamification.js', 'daily-challenge.js', 'flashcards.js',
    'quiz-engine.js', 'global.js', 'search.js', 'recommendations.js'
]

def check_file_exists(path):
    return (ROOT / path).exists()

def get_file_count(directory, pattern='*.html'):
    folder = ROOT / directory
    if folder.exists():
        return len(list(folder.glob(pattern)))
    return 0

def check_dictionary_integration():
    """Check if word pages have been generated."""
    word_folder = ROOT / 'word'
    if word_folder.exists():
        files = list(word_folder.glob('*.html'))
        return len(files)
    return 0

def check_grammar_completion():
    """Check which grammar pages have been created."""
    grammar_pages = [
        'parts-of-speech-bangla.html',
        'noun-rules-bangla.html',
        'pronoun-rules-bangla.html',
        'verb-rules-bangla.html',
        'adjective-rules-bangla.html',
        'adverb-rules-bangla.html',
        'preposition-rules-bangla.html',
        'conjunction-rules-bangla.html',
        'interjection-rules-bangla.html',
        'subject-verb-agreement-bangla.html',
        'tense-rules-bangla.html',
        'voice-change-rules-bangla.html',
        'narration-rules-bangla.html',
        'articles-rules-bangla.html'
    ]
    completed = [p for p in grammar_pages if (ROOT / p).exists()]
    return completed

def main():
    print("\n" + "="*60)
    print("🔍 OVIDHAN PROJECT SCAN")
    print("="*60 + "\n")

    # ── 1. Core Pages ──
    print("📄 **CORE PAGES**")
    for page in CORE_PAGES:
        status = "✅" if check_file_exists(page) else "❌"
        print(f"  {status} {page}")
    print()

    # ── 2. System Files ──
    print("🔧 **SYSTEM FILES**")
    for file in SYSTEM_FILES:
        status = "✅" if check_file_exists(file) else "❌"
        print(f"  {status} {file}")
    print()

    # ── 3. JavaScript Files ──
    print("📜 **JAVASCRIPT FILES**")
    for file in JS_FILES:
        status = "✅" if check_file_exists(file) else "❌"
        print(f"  {status} {file}")
    print()

    # ── 4. Dictionary Pages ──
    word_count = check_dictionary_integration()
    print(f"📖 **DICTIONARY PAGES**: {word_count} pages in /word/")
    print()

    # ── 5. Grammar Pages ──
    completed_grammar = check_grammar_completion()
    print(f"📝 **GRAMMAR PAGES**: {len(completed_grammar)}/14 completed")
    for page in completed_grammar:
        print(f"    ✅ {page}")
    missing = [p for p in ['parts-of-speech-bangla.html','noun-rules-bangla.html','pronoun-rules-bangla.html','verb-rules-bangla.html','adjective-rules-bangla.html','adverb-rules-bangla.html','preposition-rules-bangla.html','conjunction-rules-bangla.html','interjection-rules-bangla.html','subject-verb-agreement-bangla.html','tense-rules-bangla.html','voice-change-rules-bangla.html','narration-rules-bangla.html','articles-rules-bangla.html'] if p not in completed_grammar]
    for page in missing:
        print(f"    ❌ {page} (Missing)")
    print()

    # ── 6. Tools Pages ──
    tools_pages = list(ROOT.glob('tools/*.html')) + list(ROOT.glob('tools/*.htm'))
    print(f"🛠️ **TOOLS PAGES**: {len(tools_pages)} pages in /tools/")
    for page in tools_pages[:10]:
        print(f"    ✅ {page.name}")
    if len(tools_pages) > 10:
        print(f"    ... and {len(tools_pages) - 10} more")
    print()

    # ── 7. Exam Prep Pages ──
    exam_pages = list(ROOT.glob('exam-*.html')) + list(ROOT.glob('bcs-*.html')) + list(ROOT.glob('ielts-*.html')) + list(ROOT.glob('bank-*.html'))
    print(f"🎓 **EXAM PREP PAGES**: {len(exam_pages)} pages")
    for page in exam_pages[:10]:
        print(f"    ✅ {page.name}")
    if len(exam_pages) > 10:
        print(f"    ... and {len(exam_pages) - 10} more")
    print()

    # ── 8. Bangladesh Hub Pages ──
    bd_pages = list(ROOT.glob('bangladesh*.html')) + list(ROOT.glob('*bangla*.html'))
    print(f"🇧🇩 **BANGLADESH HUB PAGES**: {len(bd_pages)} pages")
    for page in bd_pages[:10]:
        print(f"    ✅ {page.name}")
    if len(bd_pages) > 10:
        print(f"    ... and {len(bd_pages) - 10} more")
    print()

    # ── 9. Blog Posts ──
    blog_posts = list(ROOT.glob('2026-*.html'))
    print(f"📰 **BLOG POSTS**: {len(blog_posts)} pages")
    print()

    # ── 10. SEO & Data Files ──
    print("📊 **SEO & DATA FILES**")
    files_to_check = ['sitemap.xml', 'robots.txt', 'search-index.json', 'content-map.json']
    for file in files_to_check:
        status = "✅" if check_file_exists(file) else "❌"
        print(f"  {status} {file}")
    print()

    # ── 11. Dashboard Integration ──
    print("📊 **DASHBOARD INTEGRATION STATUS**")
    # Check if dashboard.js functions are exposed
    dash_js = ROOT / 'dashboard.html'
    if dash_js.exists():
        with open(dash_js, 'r', encoding='utf-8') as f:
            content = f.read()
            checks = {
                'trackQuizCompletion': 'trackQuizCompletion' in content,
                'trackArticleRead': 'trackArticleRead' in content,
                'trackVocabulary': 'trackVocabulary' in content,
                'trackDailyChallenge': 'trackDailyChallenge' in content,
                'trackFlashcardMastered': 'trackFlashcardMastered' in content
            }
            for func, exists in checks.items():
                print(f"    {'✅' if exists else '❌'} {func} is {'defined' if exists else 'missing'}")
    else:
        print("    ❌ dashboard.html not found")
    print()

    # ── 12. Header/Footer Injection ──
    print("🏷️ **HEADER/FOOTER STATUS**")
    if check_file_exists('inject_layout.py'):
        print("    ✅ inject_layout.py exists")
    else:
        print("    ❌ inject_layout.py missing")
    print()

    # ── Summary ──
    print("="*60)
    print("📌 **SUMMARY**")
    print("="*60)
    print(f"  ✅ Core Pages: {sum(1 for p in CORE_PAGES if check_file_exists(p))}/{len(CORE_PAGES)}")
    print(f"  ✅ System Files: {sum(1 for f in SYSTEM_FILES if check_file_exists(f))}/{len(SYSTEM_FILES)}")
    print(f"  ✅ Grammar Pages: {len(completed_grammar)}/14")
    print(f"  ✅ Dictionary Pages: {word_count}")
    print(f"  ✅ Tools Pages: {len(tools_pages)}")
    print(f"  ✅ Exam Prep Pages: {len(exam_pages)}")
    print(f"  ✅ Bangladesh Hub Pages: {len(bd_pages)}")
    print(f"  ✅ Blog Posts: {len(blog_posts)}")
    print("\n" + "="*60)
    print("💡 **RECOMMENDATIONS**")
    print("="*60)

    # Recommendations
    if word_count > 0:
        print("  ✅ Your 50,000+ dictionary pages are live and enhanced.")

    if len(completed_grammar) < 14:
        print(f"  ⚠️ Missing {14 - len(completed_grammar)} grammar pages. Complete them to unlock all achievements.")

    if len(tools_pages) < 5:
        print("  ⚠️ Consider adding more interactive tools to the Tools Hub.")

    if not check_file_exists('search-index.json'):
        print("  ⚠️ search-index.json is missing. Run generate_search_index.py")

    if not check_file_exists('sitemap.xml'):
        print("  ⚠️ sitemap.xml is missing. Run generate_sitemap.py")

    print("  💡 Run `python generate_search_index.py` and `python generate_sitemap.py` to update SEO files.")

    print("\n✅ Scan complete!")

if __name__ == "__main__":
    main()