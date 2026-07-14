import os

print("📦 Compiling question bank...")
os.system("python scripts/compile_question_bank.py")

print("📄 Generating test pages...")
os.system("python generate_tests.py")

print("🗺️ Generating sitemap...")
os.system("python generate_sitemap.py")

print("✅ All done! Ready to deploy.")