from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent

PAGES_WITH_MISSING_H1 = {
    'future-continuous-tense-bangla.html': 'Future Continuous Tense – Rules & Examples',
    'future-perfect-continuous-tense-bangla.html': 'Future Perfect Continuous Tense – Rules & Examples',
    'future-simple-tense-bangla.html': 'Future Simple Tense – Rules & Examples',
    'past-continuous-tense-bangla.html': 'Past Continuous Tense – Rules & Examples',
    'past-perfect-continuous-tense-bangla.html': 'Past Perfect Continuous Tense – Rules & Examples',
    'past-perfect-tense-bangla.html': 'Past Perfect Tense – Rules & Examples',
    'present-simple-tense-bangla.html': 'Present Simple Tense – Rules & Examples',
}

def add_h1(filepath, h1_text):
    if not filepath.exists():
        print(f"❌ Not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'html.parser')

    # Check if H1 already exists
    if soup.find('h1'):
        print(f"✅ Already has H1: {filepath}")
        return

    # Find the first heading or content area
    # Insert H1 after the hero section or breadcrumb
    # For simplicity, insert at the beginning of the main content
    main = soup.find('main') or soup.find('body')
    if main:
        h1_tag = soup.new_tag('h1')
        h1_tag.string = h1_text
        # Insert after the first child (e.g., after the article-category)
        if main.contents:
            main.insert(1, h1_tag)
        else:
            main.append(h1_tag)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"✅ Added H1: {filepath}")

def main():
    for filename, h1 in PAGES_WITH_MISSING_H1.items():
        filepath = ROOT / filename
        add_h1(filepath, h1)

if __name__ == "__main__":
    main()