from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent

ANCHORS = {
    'learn.html': ['beginner', 'elementary', 'intermediate', 'upper', 'advanced'],
    'grammar.html': ['beginner', 'intermediate', 'advanced'],
    'speaking.html': ['daily', 'travel', 'office', 'interview', 'academic', 'business'],
    'writing.html': ['academic', 'business', 'daily'],
    'bangladesh.html': ['visa', 'job', 'daily', 'mistakes'],
}

def add_anchors(filepath, anchors):
    if not filepath.exists():
        print(f"❌ Not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'html.parser')

    for anchor in anchors:
        # Check if anchor already exists
        if soup.find(id=anchor):
            continue
        # Insert a hidden span at the top of the body
        if soup.body:
            span = soup.new_tag('span', id=anchor)
            soup.body.insert(0, span)
            print(f"  Added #{anchor} to {filepath.name}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"✅ Updated: {filepath}")

def main():
    for filename, anchors in ANCHORS.items():
        filepath = ROOT / filename
        add_anchors(filepath, anchors)

if __name__ == "__main__":
    main()