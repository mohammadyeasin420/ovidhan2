#!/usr/bin/env python3
"""
OBSOLETE / NON-CANONICAL helper.

This script previously overwrote sitemap.xml while skipping /word/ and without
deduplication or existence checks. That produced incomplete or conflicting
sitemaps.

Canonical generator:
    python generate_sitemap.py

This file is retained only so existing docs/scripts that mention it do not
break discovery. It refuses to overwrite sitemap.xml.
"""

from __future__ import annotations

import sys


def generate_fast_sitemap() -> None:
    print("❌ generate_sitemap_fast.py is obsolete and will NOT write sitemap.xml.")
    print("✅ Use the canonical generator instead:")
    print("   python generate_sitemap.py")
    sys.exit(2)


if __name__ == "__main__":
    generate_fast_sitemap()
