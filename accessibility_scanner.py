import os
from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).parent
SKIP_DIRS = ['word', 'images']

def should_skip(filepath):
    for skip in SKIP_DIRS:
        if skip in filepath.parts:
            return True
    return False

def check_accessibility(filepath):
    issues = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return issues

    soup = BeautifulSoup(content, 'html.parser')

    # Check for missing alt text on images
    for img in soup.find_all('img'):
        if not img.get('alt'):
            issues.append(f"Missing alt text on image: {img.get('src', 'unknown')}")

    # Check for missing lang attribute on html
    if not soup.html or not soup.html.get('lang'):
        issues.append("Missing language attribute on <html> tag")

    # Check for proper heading hierarchy (h1 should exist)
    h1s = soup.find_all('h1')
    if not h1s:
        issues.append("No <h1> heading found")

    # Check for missing aria labels on interactive elements
    for btn in soup.find_all('button'):
        if not btn.string and not btn.get('aria-label'):
            issues.append("Button missing text or aria-label")

    return issues

def main():
    all_issues = {}
    for filepath in ROOT.rglob('*.html'):
        if should_skip(filepath):
            continue
        issues = check_accessibility(filepath)
        if issues:
            all_issues[str(filepath.relative_to(ROOT))] = issues

    print("♿ ACCESSIBILITY SCAN RESULTS\n")
    if all_issues:
        for page, issues in all_issues.items():
            print(f"  {page}:")
            for issue in issues[:5]:
                print(f"    - {issue}")
            if len(issues) > 5:
                print(f"    ... and {len(issues)-5} more")
    else:
        print("✅ No accessibility issues found!")

    with open("accessibility_report.txt", "w", encoding='utf-8') as f:
        f.write("ACCESSIBILITY REPORT\n")
        f.write("="*60 + "\n\n")
        for page, issues in all_issues.items():
            f.write(f"{page}:\n")
            for issue in issues:
                f.write(f"  - {issue}\n")

if __name__ == "__main__":
    main()