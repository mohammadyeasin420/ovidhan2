import json
from pathlib import Path
from collections import Counter
ROOT = Path(__file__).parent

# List of topics Bangladeshi learners search for
TOPICS = [
    "spoken english", "grammar rules", "vocabulary", "pronunciation",
    "bcs english", "ielts preparation", "bank job english",
    "present tense", "past tense", "future tense",
    "conditional sentences", "modal verbs", "passive voice",
    "articles", "prepositions", "conjunctions",
]

def analyze_existing_content():
    """Analyze which topics are already covered."""
    covered = set()
    for filepath in ROOT.rglob('*.html'):
        if 'word' in filepath.parts:
            continue
        name = filepath.stem.lower()
        for topic in TOPICS:
            if topic.replace(' ', '-') in name or topic.replace(' ', '') in name:
                covered.add(topic)
    return covered

def suggest_new_content():
    covered = analyze_existing_content()
    missing = [t for t in TOPICS if t not in covered]
    return missing

def main():
    covered = analyze_existing_content()
    missing = suggest_new_content()

    print("📊 CONTENT SUGGESTION REPORT\n")
    print(f"✅ Covered topics: {len(covered)}")
    for t in sorted(covered):
        print(f"  ✅ {t}")

    if missing:
        print(f"\n💡 Suggested topics to cover next:")
        for t in missing:
            print(f"  📝 {t}")
    else:
        print("\n🎉 All major topics are covered!")

    # Generate a report
    with open("content_suggestion_report.txt", "w", encoding='utf-8') as f:
        f.write("CONTENT SUGGESTION REPORT\n")
        f.write("="*60 + "\n\n")
        f.write("Covered topics:\n")
        for t in sorted(covered):
            f.write(f"  ✅ {t}\n")
        f.write("\nSuggested topics:\n")
        for t in missing:
            f.write(f"  📝 {t}\n")

if __name__ == "__main__":
    main()