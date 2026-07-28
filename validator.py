import json
import os
from pathlib import Path

CONTENT_DIR = Path("content")
ERRORS = []

def validate_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Required fields check
        required = ["id", "version", "subject", "status", "url", "title", "slug"]
        for field in required:
            if field not in data:
                ERRORS.append(f"❌ {file_path}: Missing required field '{field}'")
        
        # Status validation
        if data.get("status") not in ["draft", "review", "published", "archived"]:
            ERRORS.append(f"❌ {file_path}: Invalid status '{data.get('status')}'")

    except json.JSONDecodeError:
        ERRORS.append(f"❌ {file_path}: Invalid JSON format")

def main():
    all_ids = []
    for root, dirs, files in os.walk(CONTENT_DIR):
        for file in files:
            if file == "lesson.json":
                path = Path(root) / file
                validate_json(path)
                # Track IDs for duplicates (skipping for brevity, but can be added)

    if ERRORS:
        print("\n".join(ERRORS))
        exit(1)
    else:
        print("✅ Validator: All files passed successfully.")
        exit(0)

if __name__ == "__main__":
    main()