import requests
import time
from pathlib import Path
BASE_URL = "https://ovidhan.net"

PAGES_TO_CHECK = [
    "",
    "/learn.html",
    "/grammar.html",
    "/dictionary.html",
    "/speaking.html",
    "/writing.html",
    "/practice.html",
    "/assessment.html",
    "/exam-prep.html",
    "/tools.html",
    "/bangladesh.html",
    "/blog.html",
    "/dashboard.html",
    "/flashcards.html",
    "/quiz.html",
    "/learning-path-elementary.html",
]

def main():
    print(f"🔍 Checking deployment status for {len(PAGES_TO_CHECK)} pages...\n")
    failed = []
    for path in PAGES_TO_CHECK:
        url = BASE_URL + path
        try:
            start = time.time()
            response = requests.get(url, timeout=10)
            elapsed = time.time() - start
            if response.status_code == 200:
                print(f"✅ {path} – OK ({elapsed:.2f}s)")
            else:
                print(f"❌ {path} – {response.status_code}")
                failed.append((path, response.status_code))
        except Exception as e:
            print(f"❌ {path} – ERROR: {e}")
            failed.append((path, str(e)))

    if failed:
        print(f"\n❌ {len(failed)} pages failed:")
        for path, err in failed:
            print(f"  {path} – {err}")
    else:
        print("\n✅ All pages are live!")

if __name__ == "__main__":
    main()