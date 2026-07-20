import os
import json
import re
from pathlib import Path
from bs4 import BeautifulSoup  # pip install beautifulsoup4

ROOT_DIR = Path(__file__).parent

# Map filename keywords to clusters
CLUSTER_MAP = {
    "grammar": "grammar", "tense": "grammar", "voice": "grammar", "narration": "grammar",
    "preposition": "grammar", "article": "grammar", "conjunction": "grammar", "verb": "grammar",
    "noun": "grammar", "adjective": "grammar", "adverb": "grammar", "pronoun": "grammar",
    "speak": "speaking", "conversation": "speaking", "dialogue": "speaking", "pronunciation": "speaking",
    "interview": "speaking", "travel": "speaking", "office": "speaking", "restaurant": "speaking",
    "writing": "writing", "essay": "writing", "email": "writing", "letter": "writing",
    "sentence": "writing", "paragraph": "writing",
    "bcs": "exam-prep", "ielts": "exam-prep", "bank": "exam-prep", "ssc": "exam-prep",
    "hsc": "exam-prep", "university": "exam-prep", "admission": "exam-prep",
    "tool": "tools", "analyzer": "tools", "converter": "tools", "checker": "tools",
    "identifier": "tools", "finder": "tools",
    "quiz": "practice", "test": "practice", "flashcard": "practice", "challenge": "practice",
    "vocabulary": "dictionary", "synonym": "dictionary", "antonym": "dictionary", "collocation": "dictionary",
    "bangladesh": "bangladesh", "bangla": "bangladesh", "visa": "bangladesh",
    "learn": "learn", "path": "learn", "course": "learn",
    "assessment": "assessment", "diagnostic": "assessment",
}

def get_cluster(filename):
    name = filename.lower()
    for key, cluster in CLUSTER_MAP.items():
        if key in name:
            return cluster
    return "general"

def extract_meta(content):
    soup = BeautifulSoup(content, 'html.parser')
    title = soup.title.string.strip() if soup.title else filename.replace(".html", "").replace("-", " ").title()
    desc = soup.find('meta', attrs={'name': 'description'})
    description = desc.get('content', '') if desc else ''
    return title, description

def main():
    data = []
    html_files = list(ROOT_DIR.glob("*.html"))
    exclude = ["header.html", "footer.html", "inject_layout.py", "styles.css", "search.html"]

    for file in html_files:
        if file.name in exclude:
            continue
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
            title, description = extract_meta(content)
            cluster = get_cluster(file.stem)
            
            # Determine subcluster (simple heuristic based on filename)
            subcluster = "general"
            for key in ["beginner", "elementary", "intermediate", "advanced", "upper", "a1", "a2", "b1", "b2", "c1"]:
                if key in file.stem.lower():
                    subcluster = "level"
                    break
            
            data.append({
                "url": f"/{file.name}",
                "title": title,
                "description": description[:160],
                "cluster": cluster,
                "subcluster": subcluster,
                "tags": [cluster] + re.findall(r'[a-z]+', file.stem.lower())[:3]
            })
        except Exception as e:
            print(f"⚠️ Error processing {file.name}: {e}")

    with open("content-map.json", "w", encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ content-map.json generated with {len(data)} entries.")

if __name__ == "__main__":
    main()