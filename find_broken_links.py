import os
import re
import urllib.parse

BASE_DIR = os.getcwd()  # Should be D:\ovidhan-site

def resolve_path(base_file, link):
    """Convert an HTML href to a local file path."""
    # Skip anchors, mailto, tel, javascript
    if link.startswith('#') or link.startswith('mailto:') or link.startswith('tel:') or link.startswith('javascript:'):
        return None
    
    # Handle external links (skip them)
    if link.startswith('http://') or link.startswith('https://'):
        if 'ovidhan.net' not in link:
            return None  # external link – skip
        # If it's our domain, convert to path
        parsed = urllib.parse.urlparse(link)
        link = parsed.path
        if not link:
            link = '/'
    
    # Remove fragment (#) and query parameters (?) for file check
    link = link.split('#')[0].split('?')[0]
    if not link or link == '/':
        link = '/index.html'
    
    # Resolve absolute paths
    if link.startswith('/'):
        file_path = os.path.join(BASE_DIR, link[1:])
    else:
        # Resolve relative paths
        current_dir = os.path.dirname(base_file)
        file_path = os.path.normpath(os.path.join(current_dir, link))
    
    # If the path ends with '/', look for index.html
    if os.path.isdir(file_path):
        file_path = os.path.join(file_path, 'index.html')
    
    return file_path

def find_broken_links():
    print("🔍 Scanning all HTML files...")
    
    html_files = []
    for root, dirs, files in os.walk(BASE_DIR):
        # Skip these folders
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', 'word_old_backup', 'word']]
        for file in files:
            if file.endswith('.html'):
                html_files.append(os.path.join(root, file))
    
    print(f"📄 Found {len(html_files)} HTML files to scan.")
    
    href_re = re.compile(r'<a\s+(?:[^>]*?\s+)?href=["\']([^"\']*)["\']', re.IGNORECASE)
    broken_links = {}
    total_links = 0
    
    for file_path in html_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            continue
        
        matches = href_re.findall(content)
        if not matches:
            continue
        
        for link in matches:
            total_links += 1
            resolved = resolve_path(file_path, link)
            if resolved is None:
                continue
            
            if not os.path.exists(resolved):
                # Check if it's a common .htm vs .html mistake
                suggestion = ""
                if resolved.endswith('.html') and os.path.exists(resolved[:-5] + '.htm'):
                    suggestion = f" (did you mean .htm? -> {resolved[:-5] + '.htm'})"
                elif resolved.endswith('.htm') and os.path.exists(resolved[:-4] + '.html'):
                    suggestion = f" (did you mean .html? -> {resolved[:-4] + '.html'})"
                
                broken_links.setdefault(file_path, []).append({
                    'link': link,
                    'resolved': resolved,
                    'suggestion': suggestion
                })
    
    if not broken_links:
        print("🎉 No broken internal links found!")
    else:
        print(f"🔥 Found {sum(len(v) for v in broken_links.values())} broken links in {len(broken_links)} files:\n")
        for file_path, links in broken_links.items():
            print(f"📄 {file_path}:")
            for item in links:
                print(f"  ❌ {item['link']} -> {item['resolved']}{item['suggestion']}")
    
    print(f"\n📊 Total links checked: {total_links}")

if __name__ == "__main__":
    find_broken_links()