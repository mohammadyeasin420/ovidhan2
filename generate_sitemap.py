import os
import datetime
import xml.etree.ElementTree as ET
from xml.dom import minidom

def generate_sitemap():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # ─── Folders to scan for .html files ───
    include_dirs = [
        '',  # Root folder (index.html, assessment.html, etc.)
        'mock-tests',
        'word',
        'grammar',
        'tools',
        'collocations'
    ]
    
    # ─── Exclude patterns ───
    exclude_patterns = [
        'word_old_backup',
        'question-bank-src',
        'scripts',
        '.git',
        'assets',
    ]
    
    # ─── Build the XML root ───
    urlset = ET.Element('urlset', xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    
    # ─── Scan files ───
    urls = []
    for dir_name in include_dirs:
        scan_path = os.path.join(base_dir, dir_name)
        if not os.path.exists(scan_path):
            continue
            
        for root, dirs, files in os.walk(scan_path):
            # Skip excluded folders
            if any(excl in root for excl in exclude_patterns):
                continue
                
            for file in files:
                if file.endswith('.html'):
                    file_path = os.path.join(root, file)
                    # Skip the old backup folder just in case
                    if 'word_old_backup' in file_path:
                        continue
                    
                    # Get last modified time
                    mtime = os.path.getmtime(file_path)
                    lastmod = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')
                    
                    # Build the URL path
                    rel_path = os.path.relpath(file_path, base_dir).replace('\\', '/')
                    # If it's index.html, make it the root
                    if rel_path == 'index.html':
                        url_path = '/'
                    else:
                        # Remove .html for cleaner URLs (optional, keep .html for static pages)
                        # For static pages, we keep .html because that's the actual file
                        url_path = '/' + rel_path
                    
                    # Priority logic
                    priority = 0.5
                    change_freq = 'monthly'
                    
                    if url_path == '/':
                        priority = 1.0
                        change_freq = 'daily'
                    elif url_path.startswith('/assessment.html') or url_path.startswith('/journey.html'):
                        priority = 0.9
                        change_freq = 'weekly'
                    elif url_path.startswith('/mock-tests/'):
                        priority = 0.7
                        change_freq = 'weekly'
                    elif url_path.startswith('/word/'):
                        priority = 0.6
                        change_freq = 'monthly'
                    elif url_path.startswith('/grammar/') or url_path.startswith('/tools/') or url_path.startswith('/collocations/'):
                        priority = 0.8
                        change_freq = 'monthly'
                    
                    urls.append({
                        'loc': url_path,
                        'lastmod': lastmod,
                        'changefreq': change_freq,
                        'priority': str(priority)
                    })
    
    # ─── Sort URLs (alphabetically for readability) ───
    urls.sort(key=lambda x: x['loc'])
    
    # ─── Add to XML ───
    for url_data in urls:
        url_elem = ET.SubElement(urlset, 'url')
        
        loc = ET.SubElement(url_elem, 'loc')
        loc.text = f'https://ovidhan.net{url_data["loc"]}'
        
        lastmod = ET.SubElement(url_elem, 'lastmod')
        lastmod.text = url_data['lastmod']
        
        changefreq = ET.SubElement(url_elem, 'changefreq')
        changefreq.text = url_data['changefreq']
        
        priority = ET.SubElement(url_elem, 'priority')
        priority.text = url_data['priority']
    
    # ─── Write to file with pretty formatting ───
    tree = ET.ElementTree(urlset)
    xml_str = ET.tostring(urlset, encoding='utf-8')
    
    # Parse with minidom for pretty print
    dom = minidom.parseString(xml_str)
    pretty_xml = dom.toprettyxml(indent='  ')
    
    # Remove the XML declaration if you want (optional)
    # Keep it for sitemap standard
    with open(os.path.join(base_dir, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write(pretty_xml)
    
    print(f"✅ Sitemap generated with {len(urls)} URLs.")

if __name__ == "__main__":
    generate_sitemap()