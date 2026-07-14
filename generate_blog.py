import os
import re
import json
from datetime import datetime

def extract_metadata(file_path):
    """Extract title, description, and date from HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # ─── Title ───
        title_match = re.search(r'<title>(.*?)</title>', content)
        title = ''
        if title_match:
            title = title_match.group(1).strip()
            title = title.replace(' | Ovidhan', '').replace('– Ovidhan', '').strip()
        
        # ─── Description ───
        desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']', content)
        desc = ''
        if desc_match:
            desc = desc_match.group(1)
        
        # ─── Date ───
        # Try multiple date patterns
        date = datetime.now()
        date_str = ''
        
        # Pattern 1: <p class="date">July 14, 2026</p>
        date_match = re.search(r'<p[^>]*class="date"[^>]*>(.*?)</p>', content)
        if date_match:
            date_str = date_match.group(1).strip()
        else:
            # Pattern 2: <span class="date">2026-07-14</span>
            date_match = re.search(r'<span[^>]*class="date"[^>]*>(.*?)</span>', content)
            if date_match:
                date_str = date_match.group(1).strip()
            else:
                # Use file modification date as fallback
                date = datetime.fromtimestamp(os.path.getmtime(file_path))
                date_str = date.strftime('%B %d, %Y')
        
        try:
            # Try parsing different date formats
            for fmt in ['%B %d, %Y', '%Y-%m-%d', '%b %d, %Y']:
                try:
                    date = datetime.strptime(date_str.strip(), fmt)
                    break
                except:
                    continue
        except:
            date = datetime.fromtimestamp(os.path.getmtime(file_path))
        
        # ─── Category ───
        category = 'general'
        file_lower = file_path.lower()
        content_lower = content.lower()
        
        if 'grammar' in file_lower or 'grammar' in content_lower or 'tense' in file_lower or 'voice' in file_lower:
            category = 'grammar'
        elif 'vocabulary' in file_lower or 'vocab' in file_lower or 'synonym' in file_lower or 'collocation' in file_lower:
            category = 'vocabulary'
        elif 'speaking' in file_lower or 'speak' in file_lower or 'dialogue' in file_lower or 'conversation' in file_lower:
            category = 'speaking'
        elif 'bcs' in file_lower or 'ielts' in file_lower or 'exam' in file_lower or 'bank' in file_lower:
            category = 'exam'
        
        # ─── Emoji ───
        emoji_map = {
            'grammar': '📚',
            'vocabulary': '📖',
            'speaking': '🗣️',
            'exam': '🎓',
            'general': '📄'
        }
        
        return {
            'title': title or os.path.basename(file_path).replace('.html', '').replace('-', ' ').title(),
            'url': '/' + os.path.relpath(file_path, os.path.dirname(__file__)).replace('\\', '/'),
            'category': category,
            'date': date.strftime('%B %d, %Y'),
            'date_iso': date.strftime('%Y-%m-%d'),
            'description': desc[:150] + '...' if len(desc) > 150 else desc,
            'emoji': emoji_map.get(category, '📄')
        }
    except Exception as e:
        print(f"⚠️ Error processing {file_path}: {e}")
        return None

def generate_blog():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # ─── Files to scan ───
    scan_dirs = ['', 'blog-posts']
    exclude_files = ['index.html', 'blog.html', 'assessment.html', 'journey.html', 'tools.html', 'grammar.html', 'style.css', 'test-player.js']
    
    articles = []
    
    for dir_name in scan_dirs:
        scan_path = os.path.join(base_dir, dir_name)
        if not os.path.exists(scan_path):
            continue
        
        for file in os.listdir(scan_path):
            if file.endswith('.html') and file not in exclude_files:
                file_path = os.path.join(scan_path, file)
                # Skip auto-generated files
                if 'mock-tests' in file_path or 'word' in file_path or 'word_old_backup' in file_path:
                    continue
                data = extract_metadata(file_path)
                if data:
                    articles.append(data)
    
    # ─── Sort by date (newest first) ───
    articles.sort(key=lambda x: x['date_iso'], reverse=True)
    
    # ─── Generate blog-posts.js ───
    js_content = f'''// ─── AUTO-GENERATED BLOG DATA ───
// Generated on: {datetime.now().strftime('%B %d, %Y')}
// Total articles: {len(articles)}

const blogPosts = {json.dumps(articles, indent=2, ensure_ascii=False)};
'''
    
    with open(os.path.join(base_dir, 'blog-posts.js'), 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"✅ Blog data generated with {len(articles)} articles in blog-posts.js")
    
    # ─── Update index.html with latest articles ───
    update_index(articles[:5])
    
    return articles

def update_index(latest_articles):
    """Update index.html with the latest articles section."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    index_path = os.path.join(base_dir, 'index.html')
    
    if not os.path.exists(index_path):
        print("⚠️ index.html not found. Skipping homepage update.")
        return
    
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # ─── Generate latest articles HTML ───
    latest_html = '''
    <!-- ═══ LATEST ARTICLES SECTION (Auto-generated) ═══ -->
    <section class="latest-articles" style="margin: 2rem 0;">
        <h2 style="color:var(--gold); font-family:var(--font-en); margin-bottom:1rem;">📝 Latest Articles</h2>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px,1fr)); gap:1.2rem;">
'''
    
    for article in latest_articles:
        latest_html += f'''
            <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:1.2rem; transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">
                <span style="color:var(--teal); font-size:0.7rem; text-transform:uppercase; background:var(--surface2); padding:0.2rem 0.8rem; border-radius:12px;">{article['emoji']} {article['category'].title()}</span>
                <h3 style="font-family:var(--font-en); color:var(--text); font-size:1rem; margin:0.5rem 0 0.3rem;"><a href="{article['url']}" style="color:var(--gold); text-decoration:none;">{article['title']}</a></h3>
                <p style="color:var(--text-mid); font-size:0.85rem;">{article['description'][:80]}{'...' if len(article['description']) > 80 else ''}</p>
                <a href="{article['url']}" style="color:var(--teal); text-decoration:none; font-size:0.85rem; display:inline-block; margin-top:0.5rem;">Read More →</a>
            </div>
        '''
    
    latest_html += '''
        </div>
        <a href="/blog.html" style="color:var(--gold); text-decoration:none; display:inline-block; margin-top:1rem;">📖 View All Articles →</a>
    </section>
'''
    
    # ─── Insert the section ───
    if '<!-- ═══ LATEST ARTICLES SECTION' in content:
        import re
        pattern = re.compile(r'<!-- ═══ LATEST ARTICLES SECTION.*?<!-- ═══ END LATEST ARTICLES SECTION -->', re.DOTALL)
        if re.search(pattern, content):
            content = re.sub(pattern, latest_html + '\n    <!-- ═══ END LATEST ARTICLES SECTION -->', content)
        else:
            content = content.replace('</main>', latest_html + '\n    </main>')
    else:
        content = content.replace('</main>', latest_html + '\n    </main>')
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Homepage updated with latest articles.")

if __name__ == "__main__":
    generate_blog()