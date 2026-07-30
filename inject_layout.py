import os
from pathlib import Path
from bs4 import BeautifulSoup

ROOT_DIR = Path(__file__).parent
HEADER_FILE = ROOT_DIR / "header.html"
FOOTER_FILE = ROOT_DIR / "footer.html"

EXCLUDE_FILES = ["header.html", "footer.html", "inject_layout.py", "styles.css"]
EXCLUDE_DIRS = ["word", "tools", "blog", "images", "mock-tests_backup"]

def should_skip(file_path):
    if file_path.name in EXCLUDE_FILES:
        return True
    for parent in file_path.parents:
        if parent.name in EXCLUDE_DIRS:
            return True
    return False

def inject_layout(html_path):
    # Read the HTML content
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # Load header/footer
    with open(HEADER_FILE, 'r', encoding='utf-8') as f:
        header_soup = BeautifulSoup(f, 'html.parser')
    with open(FOOTER_FILE, 'r', encoding='utf-8') as f:
        footer_soup = BeautifulSoup(f, 'html.parser')

    # Remove existing header/footer if present – safely
    for tag in soup.find_all(['header', 'footer']):
        if tag is None:
            continue
        if tag.has_attr('class'):
            if 'site-header' in tag['class']:
                tag.decompose()
            elif 'site-footer' in tag['class']:
                tag.decompose()

    # Insert header after <body>
    body = soup.find('body')
    if body:
        header_tag = header_soup.find('header')
        if header_tag:
            body.insert(0, header_tag)
    else:
        # If no body tag, wrap everything
        new_body = soup.new_tag('body')
        header_tag = header_soup.find('header')
        if header_tag:
            new_body.append(header_tag)
        for child in soup.contents:
            new_body.append(child)
        soup.append(new_body)

    # Insert footer before </body>
    if body:
        footer_tag = footer_soup.find('footer')
        if footer_tag:
            body.append(footer_tag)
    else:
        footer_tag = footer_soup.find('footer')
        if footer_tag:
            soup.append(footer_tag)

    # Ensure styles.css is linked
    css_link = soup.new_tag('link', rel='stylesheet', href='styles.css')
    head = soup.find('head')
    if head and not head.find('link', href='styles.css'):
        head.insert(0, css_link)

    # Write back
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"✅ Injected: {html_path.relative_to(ROOT_DIR)}")

def main():
    if not HEADER_FILE.exists() or not FOOTER_FILE.exists():
        print("❌ header.html or footer.html missing.")
        return

    all_files = list(ROOT_DIR.rglob("*.html"))
    files_to_process = [f for f in all_files if not should_skip(f)]

    print(f"Found {len(all_files)} HTML files. Processing {len(files_to_process)}...")
    for file in files_to_process:
        inject_layout(file)
    print(f"\n🎉 Done! Processed {len(files_to_process)} files.")

if __name__ == "__main__":
    main()