import os
import subprocess
import datetime
import xml.etree.ElementTree as ET
from xml.dom import minidom
import math

def generate_sitemap():
    print("🔍 Getting all tracked HTML files from Git...")
    output = subprocess.check_output(['git', 'ls-files', '*.html'], text=True)
    files = [f.strip() for f in output.split('\n') if f.strip()]
    
    print(f"📊 Found {len(files)} HTML files.")
    
    urls = []
    base_url = 'https://ovidhan.net'
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    
    for file in files:
        if file == 'index.html':
            url_path = '/'
        else:
            url_path = '/' + file.replace('\\', '/')
        urls.append({
            'loc': url_path,
            'lastmod': today,
            'changefreq': 'monthly',
            'priority': '0.5'
        })
    
    # Add priority for important pages
    for url in urls:
        if url['loc'] == '/':
            url['priority'] = '1.0'
            url['changefreq'] = 'daily'
        elif url['loc'].startswith('/assessment.html') or url['loc'].startswith('/journey.html'):
            url['priority'] = '0.9'
            url['changefreq'] = 'weekly'
        elif url['loc'].startswith('/mock-tests/'):
            url['priority'] = '0.7'
            url['changefreq'] = 'weekly'
    
    urls.sort(key=lambda x: x['loc'])
    chunk_size = 12500
    total = len(urls)
    num_chunks = math.ceil(total / chunk_size)
    
    print(f"📄 Splitting into {num_chunks} parts...")
    
    for i in range(num_chunks):
        start = i * chunk_size
        end = min(start + chunk_size, total)
        chunk = urls[start:end]
        
        urlset = ET.Element('urlset', xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
        for u in chunk:
            url_elem = ET.SubElement(urlset, 'url')
            loc = ET.SubElement(url_elem, 'loc')
            loc.text = base_url + u['loc']
            lastmod = ET.SubElement(url_elem, 'lastmod')
            lastmod.text = u['lastmod']
            changefreq = ET.SubElement(url_elem, 'changefreq')
            changefreq.text = u['changefreq']
            priority = ET.SubElement(url_elem, 'priority')
            priority.text = u['priority']
        
        xml_str = ET.tostring(urlset, encoding='utf-8')
        dom = minidom.parseString(xml_str)
        pretty = dom.toprettyxml(indent='  ')
        filename = f'sitemap-part-{i+1}.xml'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(pretty)
        print(f"  ✅ Generated {filename} ({len(chunk)} URLs)")
    
    # Generate index
    sitemapindex = ET.Element('sitemapindex', xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for i in range(num_chunks):
        sitemap_elem = ET.SubElement(sitemapindex, 'sitemap')
        loc = ET.SubElement(sitemap_elem, 'loc')
        loc.text = f'{base_url}/sitemap-part-{i+1}.xml'
        lastmod = ET.SubElement(sitemap_elem, 'lastmod')
        lastmod.text = today
    
    xml_str = ET.tostring(sitemapindex, encoding='utf-8')
    dom = minidom.parseString(xml_str)
    pretty = dom.toprettyxml(indent='  ')
    with open('sitemap-index.xml', 'w', encoding='utf-8') as f:
        f.write(pretty)
    
    print(f"✅ Sitemap index generated: sitemap-index.xml ({num_chunks} parts)")

if __name__ == "__main__":
    generate_sitemap()