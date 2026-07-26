import os
import sys
from pathlib import Path
ROOT = Path(__file__).parent

SCRIPTS = [
    ("🔍 Broken Links", "check_all_links.py"),
    ("📊 Sitemap Validation", "validate_sitemap.py"),
    ("📅 Stale Pages", "stale_pages.py"),
    ("📄 Thin Content", "content_freshness.py"),
    ("🔗 Orphan Pages", "internal_link_density.py"),
    ("📦 Backup Core", "backup_core.py"),
    ("⚡ Performance Audit", "performance_audit.py"),
    ("🗑️ Clean Temp", "clean_temp.py"),
    ("🌐 Deployment Check", "check_deployment.py"),
]

def main():
    print("="*60)
    print("🚀 OVIDHAN HEALTH CHECK – RUNNING ALL SCRIPTS")
    print("="*60 + "\n")

    for name, script in SCRIPTS:
        print(f"\n▶️ RUNNING: {name} ({script})")
        print("-"*50)
        result = os.system(f"python {script}")
        if result != 0:
            print(f"⚠️ {script} exited with code {result}")
        print("-"*50)

    print("\n🎉 All health checks complete!")
    print("📄 Reports saved as .txt files in the project root.")

if __name__ == "__main__":
    main()