import json
import os
from datetime import datetime

def compile_questions():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_dir = os.path.join(base_dir, 'question-bank-src')
    output_path = os.path.join(base_dir, 'question-bank.json')
    
    all_questions = []
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            for q in data:
                                q['_source_file'] = file
                                all_questions.append(q)
                        elif isinstance(data, dict):
                            data['_source_file'] = file
                            all_questions.append(data)
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")
    
    master_data = {
        "version": "2.0",
        "metadata": {
            "total_questions": len(all_questions),
            "generated_on": datetime.utcnow().isoformat() + "Z",
            "schema": "Ovidhan Question Bank Specification v2.0"
        },
        "questions": all_questions
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(master_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Compiled {len(all_questions)} questions into {output_path}")

if __name__ == "__main__":
    compile_questions()