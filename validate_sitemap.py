import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent
SITEMAP_FILE = ROOT / "sitemap.xml"

def main():
    if not SITEMAP_FILE.exists():
        print("❌ sitemap.xml not found.")
        return

    try:
        tree = ET.parse(SITEMAP_FILE)
        root = tree.getroot()
    except Exception as e:
        print(f"❌ Invalid XML: {e}")
        return

    urls = []
    for url in root.findall(".//url"):
        loc = url.find("loc")
        if loc is not None and loc.text:
            urls.append(loc.text)

    print(f"📊 Found {len(urls)} URLs in sitemap.\n")
    invalid = []
    for url in urls:
        parsed = urlparse(url)
        path = parsed.path
        if path.startswith('/'):
            path = path[1:]
        filepath = ROOT / path
        if not filepath.exists():
            invalid.append(url)

    if invalid:
        print(f"❌ {len(invalid)} invalid URLs found:")
        for url in invalid[:10]:
            print(f"  {url}")
        if len(invalid) > 10:
            print(f"  ... and {len(invalid)-10} more")
    else:
        print("✅ All URLs in sitemap are valid!")

    # Save report
    with open('sitemap_validation_report.txt', 'w', encoding='utf-8') as f:
        f.write("SITEMAP VALIDATION REPORT\n")
        f.write("="*60 + "\n\n")
        for url in invalid:
            f.write(url + "\n")

if __name__ == "__main__":
    main()