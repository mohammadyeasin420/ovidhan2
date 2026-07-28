#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
generate_content_map.py (FAST EDITION)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scans HTML files (SKIPPING /word/) and generates content-map.json.
Uses in-place dirs modification to efficiently skip large folders.
"""

import os
import json
from datetime import datetime
from bs4 import BeautifulSoup

# ─── CONFIGURATION ────────────────────────────────────────────────

# Folders to skip entirely (prevents walking into them)
EXCLUDED_FOLDERS = {
    'word',        # ← 50,000+ pages – SKIP!
    'images',
    'css',
    'js',
    'mock-tests',
    'node_modules',
    '.git'
}

# Files to skip
EXCLUDED_FILES = {
    '404.html',
    'robots.txt',
    'sitemap.xml',
    'content-map.json'
}

# Page type patterns
PAGE_TYPE_PATTERNS = {
    'lesson': ['tense', 'grammar', 'verb', 'noun', 'adjective', 'preposition', 'conjunction', 'conditional', 'modal'],
    'guide': ['guide', 'preparation', 'tips', 'how-to', 'strategy'],
    'tool': ['tools/', 'builder', 'generator', 'analyzer', 'checker', 'converter'],
    'blog': ['blog/', '2026-'],
    'hub': ['learn.html', 'grammar.html', 'speaking.html', 'writing.html', 'exam-prep.html', 'bangladesh.html']
}

# Category patterns
CATEGORY_PATTERNS = {
    'grammar': ['grammar', 'tense', 'verb', 'preposition', 'conjunction', 'conditional', 'modal'],
    'vocabulary': ['vocabulary', 'builder', 'dictionary'],
    'speaking': ['speaking', 'pronunciation', 'conversation'],
    'writing': ['writing', 'essay', 'builder', 'cv'],
    'exam-prep': ['ielts', 'bcs', 'bank', 'exam'],
    'bangladesh': ['bangladesh', 'visa']
}

# ─── MAIN FUNCTION ──────────────────────────────────────────────────

def generate_content_map():
    print("🔍 Scanning for HTML files (skipping /word/ folder)...")
    project_root = os.getcwd()
    html_files = []

    # Walk the directory tree
    for root, dirs, files in os.walk(project_root):
        # ─── CRITICAL FIX: Remove excluded folders from dirs ───
        # This prevents os.walk from descending into them
        for excluded in EXCLUDED_FOLDERS:
            if excluded in dirs:
                dirs.remove(excluded)
                print(f"⏩ Skipping: {excluded}")

        # Also skip hidden folders
        for d in dirs[:]:  # iterate over a copy
            if d.startswith('.'):
                dirs.remove(d)

        # Process files in this folder
        for file in files:
            if file.endswith('.html') and file not in EXCLUDED_FILES:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, project_root)
                html_files.append(rel_path)

    print(f"📊 Found {len(html_files)} HTML files to process.")

    # ─── Process each file ───
    content_map = []
    error_count = 0

    for file_path in html_files:
        try:
            full_path = os.path.join(project_root, file_path)

            with open(full_path, 'r', encoding='utf-8') as f:
                html_content = f.read()

            soup = BeautifulSoup(html_content, 'html.parser')

            # Title
            title_tag = soup.find('title')
            title = title_tag.string.strip() if title_tag and title_tag.string else file_path.replace('.html', '').replace('-', ' ').title()

            # Description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            description = meta_desc.get('content', '').strip() if meta_desc else ''

            if not description:
                og_desc = soup.find('meta', attrs={'property': 'og:description'})
                description = og_desc.get('content', '').strip() if og_desc else ''

            # URL
            if file_path.startswith('word/'):
                word_name = file_path.replace('word/', '').replace('.html', '')
                url = f"https://ovidhan.net/word/{word_name}.html"
            else:
                url = f"https://ovidhan.net/{file_path.replace('\\', '/')}"

            # Date modified
            try:
                mod_time = os.path.getmtime(full_path)
                date_modified = datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d')
            except:
                date_modified = datetime.now().strftime('%Y-%m-%d')

            # Page type
            page_type = 'page'
            for type_name, patterns in PAGE_TYPE_PATTERNS.items():
                if any(pattern in file_path.lower() for pattern in patterns):
                    page_type = type_name
                    break

            # Category
            category = None
            for cat_name, patterns in CATEGORY_PATTERNS.items():
                if any(pattern in file_path.lower() for pattern in patterns):
                    category = cat_name
                    break

            # Build entry
            entry = {
                'url': url,
                'file_path': file_path,
                'title': title,
                'description': description,
                'type': page_type,
                'category': category,
                'date_modified': date_modified
            }

            content_map.append(entry)

            # Progress indicator
            if len(content_map) % 50 == 0:
                print(f"   Processed {len(content_map)} pages...")

        except Exception as e:
            error_count += 1
            print(f"⚠️ Error processing {file_path}: {e}")

    # ─── Save ───
    content_map.sort(key=lambda x: x['url'])
    output_path = os.path.join(project_root, 'content-map.json')

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(content_map, f, indent=2, ensure_ascii=False)

    # ─── Summary ───
    print("\n" + "=" * 60)
    print("✅ content-map.json generated successfully!")
    print(f"📊 Total entries: {len(content_map)}")
    print(f"⚠️ Errors: {error_count}")
    print("=" * 60)

    type_counts = {}
    for entry in content_map:
        t = entry['type']
        type_counts[t] = type_counts.get(t, 0) + 1

    print("\n📋 Page types:")
    for t, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {t}: {count}")

# ─── RUN ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    generate_content_map()