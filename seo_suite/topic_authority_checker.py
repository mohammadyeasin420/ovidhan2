"""
Topic Authority / Semantic Coverage Analyzer.
Checks pages against checklists and outputs a completeness report.
"""
import json
import csv
from pathlib import Path
from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).parent.parent
CHECKLIST_DIR = BASE_DIR / "seo_suite" / "checklists"

def load_checklist(page_type):
    filepath = CHECKLIST_DIR / f"{page_type}_checklist.json"
    if filepath.is_file():
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get(page_type, {})
    return None

def check_page(html_file, checklist):
    if not html_file.is_file():
        return None
    soup = BeautifulSoup(html_file.read_text(encoding="utf-8"), "html.parser")
    required = checklist.get("required_sections", [])
    weights = checklist.get("weight", {})
    total_weight = sum(weights.get(s, 1) for s in required)
    achieved_weight = 0
    missing = []
    for section in required:
        elem = soup.find(id=section) or soup.find(class_=section)
        if elem:
            achieved_weight += weights.get(section, 1)
        else:
            missing.append(section)
    if total_weight == 0:
        return {"score": 100, "missing": []}
    score = round((achieved_weight / total_weight) * 100)
    return {"score": score, "missing": missing}

def main():
    # Find all grammar pages (assuming they are in root or a /grammar/ folder)
    grammar_files = list(BASE_DIR.glob("grammar.html")) + list((BASE_DIR / "grammar").glob("*.html"))
    if not grammar_files:
        print("No grammar pages found. Please adjust the script to point to your grammar files.")
        return

    checklist = load_checklist("grammar")
    if not checklist:
        print("Grammar checklist not found.")
        return

    results = []
    for page in grammar_files:
        res = check_page(page, checklist)
        if res:
            results.append({
                "Page": page.name,
                "Score": res["score"],
                "Missing": ", ".join(res["missing"])
            })

    output_csv = BASE_DIR / "topic_authority_report.csv"
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Page", "Score", "Missing"])
        writer.writeheader()
        writer.writerows(results)

    print(f"✅ Report saved to {output_csv}")
    for r in results:
        if r["Score"] < 80:
            print(f"  {r['Page']}: {r['Score']}% – missing: {r['Missing']}")

if __name__ == "__main__":
    main()