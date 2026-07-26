import os
import json
from pathlib import Path
from datetime import datetime
ROOT = Path(__file__).parent

def check_meta_tags():
    issues = []
    for filepath in ROOT.rglob('*.html'):
        if 'word' in filepath.parts or 'images' in filepath.parts:
            continue
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            continue
        if '<meta name="description"' not in content:
            issues.append(f"Missing meta description: {filepath.relative_to(ROOT)}")
        if '<title>' not in content:
            issues.append(f"Missing title: {filepath.relative_to(ROOT)}")
    return issues

def check_sitemap():
    sitemap_file = ROOT / "sitemap.xml"
    if not sitemap_file.exists():
        return ["sitemap.xml is missing!"]
    return []

def main():
    print("🔍 Running daily SEO health check...")
    issues = []
    issues.extend(check_meta_tags())
    issues.extend(check_sitemap())

    if issues:
        print(f"\n⚠️ {len(issues)} issues found:\n")
        for issue in issues:
            print(f"  ❌ {issue}")
    else:
        print("\n✅ All SEO checks passed!")

    # Send alert if critical
    if len(issues) > 5:
        print("\n🚨 CRITICAL: More than 5 SEO issues detected!")

if __name__ == "__main__":
    main()