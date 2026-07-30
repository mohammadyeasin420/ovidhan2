@echo off
echo Running SEO update scripts...
python generate_content_map.py
if %errorlevel% neq 0 exit /b %errorlevel%
python generate_search_index.py
if %errorlevel% neq 0 exit /b %errorlevel%
python generate_sitemap_fast.py
if %errorlevel% neq 0 exit /b %errorlevel%
echo SEO files updated successfully!