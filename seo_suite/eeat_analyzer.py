"""
EEAT Score Analyzer for Ovidhan
Scans core pages and outputs a CSV with EEAT metrics.
"""
import csv
from pathlib import Path
from bs4 import BeautifulSoup
import re

BASE_DIR = Path(__file__).parent.parent
OUTPUT_CSV = BASE_DIR / "eeat_scores.csv"

# Core pages to check (add more if needed)
CORE_PAGES = [
    "index.html", "learn.html", "dictionary.html", "grammar.html",
    "speaking.html", "writing.html", "practice.html", "assessment.html",
    "exam-prep.html", "tools.html", "bangladesh.html", "blog.html",
    "dashboard.html", "search.html", "explorer.html", "flashcards.html",
    "quiz.html"
]

def analyze_page(file_path):
    if not file_path.is_file():
        return None
    soup = BeautifulSoup(file_path.read_text(encoding="utf-8"), "html.parser")
    results = {
        "Page": file_path.name,
        "Author": 0,
        "UpdatedDate": 0,
        "FAQ_Schema": 0,
        "Breadcrumb_Schema": 0,
        "Internal_Links_Out": 0,
        "References_Section": 0,
        "Total_Score": 0
    }

    # 1. Author meta
    author_meta = soup.find("meta", attrs={"name": "author"})
    if author_meta and author_meta.get("content"):
        results["Author"] = 1

    # 2. Updated date (look for <time> or meta article:modified_time)
    time_tag = soup.find("time", datetime=True)
    meta_mod = soup.find("meta", attrs={"property": "article:modified_time"})
    if time_tag or meta_mod:
        results["UpdatedDate"] = 1

    # 3. FAQ schema (any script with FAQPage)
    for script in soup.find_all("script", type="application/ld+json"):
        if "FAQPage" in script.string if script.string else "":
            results["FAQ_Schema"] = 1
            break

    # 4. Breadcrumb schema
    for script in soup.find_all("script", type="application/ld+json"):
        if "BreadcrumbList" in script.string if script.string else "":
            results["Breadcrumb_Schema"] = 1
            break

    # 5. Internal links count (relative links pointing to other pages)
    internal = 0
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href.startswith("http") and not href.startswith("//") and not href.startswith("#"):
            internal += 1
    results["Internal_Links_Out"] = internal

    # 6. References section (looking for id/class containing 'reference' or 'source')
    if soup.find(id=re.compile("reference|source", re.I)) or soup.find(class_=re.compile("reference|source", re.I)):
        results["References_Section"] = 1

    # Total score (max 6)
    score_fields = ["Author", "UpdatedDate", "FAQ_Schema", "Breadcrumb_Schema", "References_Section"]
    results["Total_Score"] = sum(results[f] for f in score_fields)

    return results

def main():
    print("📊 EEAT Score Analyzer")
    results = []
    for page_name in CORE_PAGES:
        file_path = BASE_DIR / page_name
        res = analyze_page(file_path)
        if res:
            results.append(res)

    if not results:
        print("No core pages found.")
        return

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "Page", "Author", "UpdatedDate", "FAQ_Schema",
            "Breadcrumb_Schema", "Internal_Links_Out",
            "References_Section", "Total_Score"
        ])
        writer.writeheader()
        writer.writerows(results)

    print(f"✅ Saved {len(results)} page scores to {OUTPUT_CSV}")
    # Show pages with low scores
    low = [r for r in results if r["Total_Score"] < 3]
    if low:
        print("Pages that need EEAT improvement:")
        for r in low:
            print(f"  {r['Page']}: {r['Total_Score']}/5")

if __name__ == "__main__":
    main()