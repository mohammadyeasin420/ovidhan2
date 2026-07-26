import os
import time
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
ROOT = Path(__file__).parent
BASE_URL = "https://ovidhan.net"

PAGES_TO_TEST = [
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

def check_page(path):
    url = BASE_URL + path
    try:
        start = time.time()
        response = requests.get(url, timeout=15)
        elapsed = time.time() - start
        return {'path': path, 'status': response.status_code, 'time': elapsed, 'size': len(response.content)}
    except Exception as e:
        return {'path': path, 'error': str(e)}

def main():
    print(f"🔍 Testing {len(PAGES_TO_TEST)} pages...\n")
    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(check_page, p): p for p in PAGES_TO_TEST}
        for future in as_completed(futures):
            results.append(future.result())

    results.sort(key=lambda x: x.get('time', 999))

    print("📊 PAGE LOAD SPEED REPORT")
    print("="*60)
    for r in results:
        if 'error' in r:
            print(f"  ❌ {r['path']} – Error: {r['error']}")
        else:
            status = "✅" if r['status'] == 200 else "⚠️"
            print(f"  {status} {r['path']} – {r['time']:.2f}s ({r['size']:,} bytes)")

    with open('performance_report.txt', 'w', encoding='utf-8') as f:
        f.write("PERFORMANCE AUDIT REPORT\n")
        f.write("="*60 + "\n\n")
        for r in results:
            if 'error' in r:
                f.write(f"{r['path']} – ERROR: {r['error']}\n")
            else:
                f.write(f"{r['path']} – {r['time']:.2f}s – {r['status']}\n")

if __name__ == "__main__":
    main()