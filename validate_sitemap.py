#!/usr/bin/env python3
"""Validate sitemap.xml: duplicates, missing files, size limits, reserved orphans."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
SITEMAP_FILE = ROOT / "sitemap.xml"
BASE = "https://ovidhan.net"
MAX_URLS = 50000
FORBIDDEN_IF_MISSING = ("word/con.html", "word/aux.html")
# Non-content / malformed URLs that must never appear in the sitemap
FORBIDDEN_ALWAYS = (
    "templates/lesson.html",
    "templates/reading.html",
    "word/.html",
)


def main() -> int:
    if not SITEMAP_FILE.exists():
        print("❌ sitemap.xml not found.")
        return 1

    try:
        tree = ET.parse(SITEMAP_FILE)
        root = tree.getroot()
    except Exception as exc:
        print(f"❌ Invalid XML: {exc}")
        return 1

    # Support both urlset and sitemapindex
    tag = root.tag.split("}")[-1]
    locs: list[str] = []
    if tag == "sitemapindex":
        print("ℹ️ sitemap.xml is a sitemap index.")
        for sm in root.findall(".//{*}sitemap/{*}loc"):
            if sm.text:
                locs.append(sm.text.strip())
        print(f"Index points to {len(locs)} sitemaps.")
        # Validate parts
        all_page_locs: list[str] = []
        for loc in locs:
            name = loc.replace(BASE + "/", "")
            part = ROOT / name
            if not part.exists():
                print(f"❌ Missing sitemap part: {name}")
                return 1
            part_locs = re.findall(r"<loc>(.*?)</loc>", part.read_text(encoding="utf-8"))
            all_page_locs.extend(part_locs)
        locs = all_page_locs
    else:
        for loc_el in root.findall(".//{*}url/{*}loc"):
            if loc_el is not None and loc_el.text:
                locs.append(loc_el.text.strip())

    unique = set(locs)
    duplicate_count = len(locs) - len(unique)
    missing = []
    for url in unique:
        parsed = urlparse(url)
        path = parsed.path
        rel = "index.html" if path in ("", "/") else path.lstrip("/")
        if not (ROOT / rel).is_file():
            missing.append(url)

    print(f"total <loc> count: {len(locs)}")
    print(f"unique URL count: {len(unique)}")
    print(f"duplicate count: {duplicate_count}")
    print(f"missing-file count: {len(missing)}")

    text = SITEMAP_FILE.read_text(encoding="utf-8")
    for forbidden in FORBIDDEN_IF_MISSING:
        present = forbidden in text
        exists = (ROOT / forbidden).is_file()
        print(f"{forbidden}: in_sitemap={present} file_exists={exists}")

    banned_present = []
    for forbidden in FORBIDDEN_ALWAYS:
        present = any(forbidden in url for url in unique) or forbidden in text
        print(f"{forbidden}: in_sitemap={present} (must be absent)")
        if present:
            banned_present.append(forbidden)

    report = ROOT / "sitemap_validation_report.txt"
    with report.open("w", encoding="utf-8") as fh:
        fh.write("SITEMAP VALIDATION REPORT\n")
        fh.write("=" * 60 + "\n\n")
        fh.write(f"total={len(locs)}\nunique={len(unique)}\n")
        fh.write(f"duplicates={duplicate_count}\nmissing={len(missing)}\n\n")
        for url in missing:
            fh.write(url + "\n")

    ok = (
        duplicate_count == 0
        and len(missing) == 0
        and len(locs) < MAX_URLS
        and "word/con.html" not in text
        and "word/aux.html" not in text
        and not banned_present
    )
    if ok:
        print("✅ Sitemap validation passed.")
        return 0

    print("❌ Sitemap validation failed.")
    if missing[:10]:
        print("Sample missing:")
        for url in missing[:10]:
            print(" ", url)
    return 1


if __name__ == "__main__":
    sys.exit(main())
