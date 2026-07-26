import os
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
SITEMAP_FILE = ROOT / "sitemap.xml"
NEW_PAGE = "/learning-path-elementary.html"  # Change this to your new page

def update_sitemap():
    # If sitemap doesn't exist, create a basic one
    if not SITEMAP_FILE.exists():
        root = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    else:
        tree = ET.parse(SITEMAP_FILE)
        root = tree.getroot()

    # Check if the URL already exists
    for url in root.findall(".//url"):
        loc = url.find("loc")
        if loc is not None and loc.text == "https://ovidhan.net" + NEW_PAGE:
            print(f"✅ {NEW_PAGE} already in sitemap.")
            return

    # Add new entry
    url_elem = ET.SubElement(root, "url")
    loc = ET.SubElement(url_elem, "loc")
    loc.text = "https://ovidhan.net" + NEW_PAGE
    lastmod = ET.SubElement(url_elem, "lastmod")
    lastmod.text = datetime.now().strftime("%Y-%m-%d")
    changefreq = ET.SubElement(url_elem, "changefreq")
    changefreq.text = "weekly"
    priority = ET.SubElement(url_elem, "priority")
    priority.text = "0.8"

    # Write back
    tree = ET.ElementTree(root)
    tree.write(SITEMAP_FILE, encoding="utf-8", xml_declaration=True)
    print(f"✅ Added {NEW_PAGE} to sitemap.xml")

if __name__ == "__main__":
    update_sitemap()