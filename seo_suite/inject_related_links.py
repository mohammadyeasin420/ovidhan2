"""
Injects related links into word pages based on related_links_map.json.
Run after internal_link_intelligence.py.
"""
import json
from pathlib import Path
from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).parent.parent
MAP_FILE = BASE_DIR / "related_links_map.json"
WORD_DIR = BASE_DIR / "word"

def inject_links():
    if not MAP_FILE.is_file():
        print("related_links_map.json not found. Run internal_link_intelligence.py first.")
        return

    with open(MAP_FILE, "r", encoding="utf-8") as f:
        link_map = json.load(f)

    count = 0
    for word, links in link_map.items():
        filename = f"{word}.html"
        filepath = WORD_DIR / filename
        if not filepath.is_file():
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            soup = BeautifulSoup(f, "html.parser")

        # Avoid duplicate injection
        if soup.find("aside", class_="related-links"):
            continue

        # Build aside element
        aside = soup.new_tag("aside", **{"class": "related-links"})
        h2 = soup.new_tag("h2")
        h2.string = "Explore Related Topics"
        aside.append(h2)
        ul = soup.new_tag("ul")
        for link in links:
            li = soup.new_tag("li")
            a = soup.new_tag("a", href=link["url"])
            a.string = link["text"]
            li.append(a)
            ul.append(li)
        aside.append(ul)

        # Insert after main content (look for article, main, or body)
        article = soup.find("article") or soup.find("main") or soup.find("div", class_="content")
        if article:
            article.append(aside)
        else:
            soup.body.append(aside)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(str(soup))
        count += 1
        if count % 500 == 0:
            print(f"  Injected {count} pages...")

    print(f"✅ Injected related links into {count} word pages.")

if __name__ == "__main__":
    inject_links()