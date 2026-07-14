import json
import os
import re

def fix_urls():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    src_dir = os.path.join(base_dir, 'question-bank-src')
    
    total_fixed = 0
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                
                # Fix 1: Remove /grammar/ prefix
                content = content.replace('/grammar/', '/')
                
                # Fix 2: Change .htm to .html
                content = content.replace('.htm', '.html')
                
                # Fix 3: Also fix any double slashes
                content = content.replace('//', '/')
                
                if content != original:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    total_fixed += 1
                    print(f"✅ Fixed: {file_path}")
    
    print(f"\n🎉 Fixed {total_fixed} files!")

if __name__ == "__main__":
    fix_urls()