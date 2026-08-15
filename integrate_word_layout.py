"""Integrate the shared production layout into one manifest-scoped word batch."""

import argparse
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from generate_word_pages import load_site_layout


SAFE_WORD_PATH = re.compile(r"word/[a-z0-9-]+\.html\Z")


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    return parser.parse_args()


def integrate_page(path_text, header_html, footer_html):
    if not SAFE_WORD_PATH.fullmatch(path_text):
        raise ValueError(f"Unsafe manifest path: {path_text}")
    path = Path(path_text)
    page = path.read_text(encoding="utf-8")
    if page.count("<body>") != 1 or page.count("</body>") != 1:
        raise ValueError(f"Unexpected body markup: {path}")
    if "site-header" in page or "site-footer" in page or 'id="megaMenu"' in page:
        raise ValueError(f"Refusing duplicate layout integration: {path}")
    integrated = page.replace("<body>", f"<body>\n{header_html}", 1)
    integrated = integrated.replace("</body>", f"{footer_html}\n</body>", 1)
    path.write_text(integrated, encoding="utf-8")
    return path_text


def main():
    args = parse_args()
    report = json.loads(args.report.read_text(encoding="utf-8"))
    paths = report.get("generated_paths")
    if not isinstance(paths, list) or len(paths) != 1000 or len(paths) != len(set(paths)):
        raise SystemExit("Manifest must contain exactly 1,000 unique generated paths.")
    unsafe = [path for path in paths if not isinstance(path, str) or not SAFE_WORD_PATH.fullmatch(path)]
    if unsafe:
        raise SystemExit(f"Unsafe manifest paths: {unsafe}")

    header_html, footer_html = load_site_layout()
    with ThreadPoolExecutor(max_workers=16) as executor:
        completed = list(executor.map(lambda path: integrate_page(path, header_html, footer_html), paths))

    report["site_integration"] = {
        "header_source": "header.html",
        "footer_source": "footer.html",
        "integrated_page_count": len(completed),
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["site_integration"], indent=2))


if __name__ == "__main__":
    main()
