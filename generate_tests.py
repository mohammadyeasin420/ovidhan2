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
    
    # Create mock-tests folder
    tests_dir = os.path.join(base_dir, 'mock-tests')
    os.makedirs(tests_dir, exist_ok=True)
    
    # ----- Group by Exam Tags (BCS, IELTS, etc.) -----
    tag_groups = defaultdict(list)
    for q in questions:
        for tag in q.get('exam_tags', ['general']):
            tag_groups[tag].append(q)
    
    # ----- NEW: Group by Skill (Grammar, Vocabulary, etc.) -----
    skill_groups = defaultdict(list)
    for q in questions:
        skill = q.get('skill', 'general')
        skill_groups[skill].append(q)
    
    # Generate index page for tests
    index_html = '''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Mock Test Center</title><link rel="stylesheet" href="../style.css"></head>
<body style="background:#0B1F1A;color:#D8EDEB;font-family:'Inter',sans-serif;padding:2rem;">
<h1 style="color:#E6B84A;">📚 Mock Test Center</h1>
<ul style="list-style:none;padding:0;">'''
    
    # ----- Generate Exam Tag Tests (BCS, IELTS, etc.) -----
    for tag, q_list in tag_groups.items():
        chunk_size = 10
        for i in range(0, len(q_list), chunk_size):
            chunk = q_list[i:i+chunk_size]
            test_num = (i // chunk_size) + 1
            filename = f"{tag}-test-{test_num}.html"
            filepath = os.path.join(tests_dir, filename)
            
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
    
    # ----- NEW: Generate Skill Tests (Grammar, Vocabulary, etc.) -----
    for skill, q_list in skill_groups.items():
        chunk_size = 10
        for i in range(0, len(q_list), chunk_size):
            chunk = q_list[i:i+chunk_size]
            test_num = (i // chunk_size) + 1
            # Use the skill name as the filename prefix (e.g., grammar-test-1.html)
            filename = f"{skill}-test-{test_num}.html"
            filepath = os.path.join(tests_dir, filename)
            
            html_content = f"""<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{skill.capitalize()} Test {test_num} | Ovidhan</title>
    <link rel="stylesheet" href="../style.css">
    <script>
        window.TEST_QUESTIONS = {json.dumps(chunk, indent=2, ensure_ascii=False)};
        window.TEST_TITLE = "{skill.capitalize()} Test {test_num}";
        window.TEST_TAG = "{skill}";
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
            
            index_html += f'<li style="margin:0.5rem 0;"><a href="/mock-tests/{filename}" style="color:#4ECDC4;text-decoration:none;">{skill.capitalize()} Test {test_num} ({len(chunk)} questions)</a></li>'
    
    # ----- Finish Index Page -----
    index_html += '''</ul>
<p style="margin-top:2rem;"><a href="/assessment.html" style="color:#E6B84A;">← Back to Assessment Center</a></p>
</body></html>'''
    
    # Write index file
    with open(os.path.join(tests_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(index_html)
    
    total_tag_questions = sum(len(v) for v in tag_groups.values())
    total_skill_questions = sum(len(v) for v in skill_groups.values())
    total_pages = len(tag_groups) + len(skill_groups)
    print(f"✅ Generated {total_tag_questions} questions across {len(tag_groups)} exam tag categories.")
    print(f"✅ Generated {total_skill_questions} questions across {len(skill_groups)} skill categories.")
    print(f"✅ Total {total_pages} test pages created in /mock-tests/")

if __name__ == "__main__":
    generate_tests()