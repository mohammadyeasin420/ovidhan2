import os
import json
import re
from datetime import datetime

def generate_search_index():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # ─── Load blog posts from blog-posts.js ───
    js_path = os.path.join(base_dir, 'blog-posts.js')
    if not os.path.exists(js_path):
        print("⚠️ blog-posts.js not found. Run generate_blog.py first.")
        return
    
    with open(js_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract the JSON array from the JavaScript
    match = re.search(r'const blogPosts = (\[[\s\S]*?\])', content)
    if not match:
        print("⚠️ Could not extract blogPosts from blog-posts.js")
        return
    
    articles = json.loads(match.group(1))
    
    # ─── Convert to search-index.json format ───
    search_index = []
    for article in articles:
        search_index.append({
            "id": article.get('url', '').replace('/', '').replace('.html', ''),
            "title": article.get('title', ''),
            "description": article.get('description', ''),
            "url": article.get('url', ''),
            "category": article.get('category', 'general'),
            "emoji": article.get('emoji', '📄'),
            "date": article.get('date_iso', article.get('date', '')),
            "content": article.get('description', '')
        })
    
    # ─── Save to search-index.json ───
    with open(os.path.join(base_dir, 'search-index.json'), 'w', encoding='utf-8') as f:
        json.dump(search_index, f, indent=2, ensure_ascii=False)
    
    print(f"✅ search-index.json generated with {len(search_index)} articles.")

if __name__ == "__main__":
    generate_search_index()