import os
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent

def categorize_file(filename):
    name = filename.lower()
    if "grammar" in name or "tense" in name or "voice" in name or "narration" in name or "preposition" in name or "article" in name or "conjunction" in name or "verb" in name or "noun" in name or "adjective" in name or "adverb" in name or "pronoun" in name or "subject-verb" in name:
        return "📝 Grammar"
    elif "speak" in name or "conversation" in name or "dialogue" in name or "pronunciation" in name or "interview" in name or "travel" in name or "office" in name or "restaurant" in name or "shopping" in name or "airport" in name or "introduction" in name:
        return "🗣 Speaking"
    elif "write" in name or "essay" in name or "email" in name or "letter" in name or "sentence" in name or "paragraph" in name or "rewriter" in name or "checker" in name:
        return "✍ Writing"
    elif "vocabulary" in name or "dictionary" in name or "word" in name or "synonym" in name or "antonym" in name or "idiom" in name or "collocation" in name or "phrasal" in name:
        return "📖 Dictionary / Words"
    elif "bcs" in name or "ielts" in name or "bank" in name or "exam" in name or "ssc" in name or "hsc" in name or "admission" in name or "mock" in name:
        return "🎓 Exam Prep"
    elif "tool" in name or "analyzer" in name or "converter" in name or "identifier" in name or "checker" in name or "finder" in name or "builder" in name:
        return "🛠 Tools"
    elif "quiz" in name or "test" in name or "challenge" in name or "practice" in name:
        return "🧪 Quizzes / Practice"
    elif "learn" in name or "path" in name or "course" in name or "journey" in name or "dashboard" in name:
        return "📚 Learn / Dashboard"
    elif "bangla" in name or "bangladesh" in name or "visa" in name:
        return "🇧🇩 Bangladesh Hub"
    else:
        return "📄 General / Blog"

def check_injected(content):
    return 'site-header' in content and 'site-footer' in content

def main():
    print("🔍 Scanning Ovidhan Project...\n")
    html_files = list(ROOT.glob("*.html"))
    system_files = ["styles.css", "header.html", "footer.html", "inject_layout.py", "generate_content_map.py", "content-map.json"]
    js_files = ["gamification.js", "daily-challenge.js", "flashcards.js", "quiz-engine.js"]

    categories = defaultdict(list)
    injected_count = 0
    total_html = len(html_files)

    for f in html_files:
        cat = categorize_file(f.name)
        categories[cat].append(f.name)
        try:
            with open(f, 'r', encoding='utf-8') as file:
                content = file.read()
                if check_injected(content):
                    injected_count += 1
        except:
            pass

    print("📊 **HTML FILE INVENTORY**")
    print(f"Total HTML files: {total_html}\n")
    for cat, files in sorted(categories.items()):
        print(f"  {cat}: {len(files)} files")
        if len(files) <= 5:
            for f in files:
                print(f"    - {f}")

    print("\n🔧 **SYSTEM FILES**")
    for f in system_files:
        exists = "✅" if (ROOT / f).exists() else "❌"
        print(f"  {exists} {f}")

    print("\n📜 **PHASE 2 JAVASCRIPT FILES**")
    for f in js_files:
        exists = "✅" if (ROOT / f).exists() else "❌"
        print(f"  {exists} {f}")

    print(f"\n🏷️ **HEADER/FOOTER INJECTION STATUS**")
    print(f"  Pages with header/footer: {injected_count} / {total_html}")

    print("\n📌 **QUICK SUMMARY**")
    if (ROOT / "gamification.js").exists():
        print("  ✅ Gamification system is live.")
    if (ROOT / "flashcards.js").exists():
        print("  ✅ Spaced repetition flashcards are live.")
    if (ROOT / "quiz-engine.js").exists():
        print("  ✅ Unified Quiz Engine is live.")
    if (ROOT / "practice.html").exists():
        print("  ✅ Practice Hub is live.")
    if (ROOT / "learn.html").exists():
        print("  ✅ Learning Hub is live.")

    if categories.get("📖 Dictionary / Words", []):
        print(f"  📖 {len(categories['📖 Dictionary / Words'])} dictionary/word pages exist.")
    if categories.get("🗣 Speaking", []):
        print(f"  🗣 {len(categories['🗣 Speaking'])} speaking pages exist.")
    if categories.get("✍ Writing", []):
        print(f"  ✍ {len(categories['✍ Writing'])} writing pages exist.")
    if categories.get("🇧🇩 Bangladesh Hub", []):
        print(f"  🇧🇩 {len(categories['🇧🇩 Bangladesh Hub'])} Bangladesh-focused pages exist.")

    print("\n💡 **RECOMMENDATION**")
    if not categories.get("🇧🇩 Bangladesh Hub", []):
        print("  ⚠️ Bangladesh Hub has very few pages. This is your biggest competitive advantage.")
    if len(categories.get("📖 Dictionary / Words", [])) < 10:
        print("  ⚠️ Your 12,658-word dictionary is the engine. Consider building dynamic word pages.")
    print("✅ Scan complete!")

if __name__ == "__main__":
    main()