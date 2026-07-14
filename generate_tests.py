import json
import os
from collections import defaultdict

def generate_tests():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_dir, 'question-bank.json')
    
    if not os.path.exists(json_path):
        print("❌ Run compile_question_bank.py first!")
        return
        
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        questions = data['questions']
    
    # Group by exam_tags
    test_groups = defaultdict(list)
    for q in questions:
        for tag in q.get('exam_tags', ['general']):
            test_groups[tag].append(q)
    
    # Create mock-tests folder
    tests_dir = os.path.join(base_dir, 'mock-tests')
    os.makedirs(tests_dir, exist_ok=True)
    
    # Generate index page for tests
    index_html = '''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Mock Test Center</title><link rel="stylesheet" href="../style.css"></head>
<body style="background:#0B1F1A;color:#D8EDEB;font-family:'Inter',sans-serif;padding:2rem;">
<h1 style="color:#E6B84A;">📚 Mock Test Center</h1>
<ul style="list-style:none;padding:0;">'''
    
    for tag, q_list in test_groups.items():
        # Split into chunks of 10 questions per test
        chunk_size = 10
        for i in range(0, len(q_list), chunk_size):
            chunk = q_list[i:i+chunk_size]
            test_num = (i // chunk_size) + 1
            filename = f"{tag}-test-{test_num}.html"
            filepath = os.path.join(tests_dir, filename)
            
            # Create the HTML content with embedded JSON
            html_content = f"""<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{tag.upper()} English Mock Test {test_num} | Ovidhan</title>
    <link rel="stylesheet" href="../style.css">
    <script>
        window.TEST_QUESTIONS = {json.dumps(chunk, indent=2, ensure_ascii=False)};
        window.TEST_TITLE = "{tag.upper()} English Mock Test {test_num}";
        window.TEST_TAG = "{tag}";
    </script>
</head>
<body style="background:#0B1F1A;color:#D8EDEB;font-family:'Hind Siliguri',sans-serif;padding:2rem;">
    <div id="app" style="max-width:800px;margin:0 auto;">
        <header style="border-bottom:1px solid #1E3D38;padding-bottom:1rem;margin-bottom:2rem;">
            <h1 style="color:#E6B84A;">📖 Ovidhan</h1>
        </header>
        <main>
            <div id="test-container"></div>
        </main>
    </div>
    <script src="../test-player.js"></script>
</body>
</html>"""
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            index_html += f'<li style="margin:0.5rem 0;"><a href="/mock-tests/{filename}" style="color:#4ECDC4;text-decoration:none;">{tag.upper()} Test {test_num} ({len(chunk)} questions)</a></li>'
    
    index_html += '''</ul>
<p style="margin-top:2rem;"><a href="/assessment.html" style="color:#E6B84A;">← Back to Assessment Center</a></p>
</body></html>'''
    
    # Write index file
    with open(os.path.join(tests_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(index_html)
    
    print(f"✅ Generated {sum(len(v) for v in test_groups.values())} questions into {len(test_groups)} test categories.")

if __name__ == "__main__":
    generate_tests()