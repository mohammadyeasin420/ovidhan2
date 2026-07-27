import json
import os

# Load the JSON data
with open('listening-exercises.json', 'r', encoding='utf-8') as f:
    exercises = json.load(f)

# Category icons
category_icons = {
    "bangladesh": "🇧🇩",
    "daily": "☀️",
    "travel": "✈️",
    "office": "💼",
    "student": "🎓",
    "confidence": "💪"
}

# Build the HTML template (with fetch + loading spinner)
html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Listening Practice - Ovidhan</title>
    <meta name="description" content="Improve your English listening skills with real-world scenarios from Bangladesh.">
    <link rel="stylesheet" href="styles.css">
    <style>
        .hub-hero { text-align: center; padding: 3rem 0 2rem; border-bottom: 1px solid var(--border); margin-bottom: 2rem; }
        .hub-hero h1 { font-size: 3rem; margin-bottom: 0.5rem; }
        .hub-hero p { font-size: 1.2rem; color: var(--text-mid); max-width: 600px; margin: 0 auto; }
        .filter-bar { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2.5rem; padding: 1.5rem; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); }
        .filter-bar input, .filter-bar select { padding: 0.8rem 1rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); color: var(--text); flex: 1; min-width: 200px; }
        .filter-bar input:focus, .filter-bar select:focus { outline: 2px solid var(--gold); }
        .level-filters { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .level-btn { padding: 0.4rem 1rem; border-radius: 20px; border: 1px solid var(--border); background: transparent; color: var(--text-mid); cursor: pointer; transition: all 0.2s; }
        .level-btn:hover { border-color: var(--gold); color: var(--gold); }
        .level-btn.active { background: var(--gold); color: #000; border-color: var(--gold); font-weight: bold; }
        .lesson-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
        .lesson-card { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; display: flex; flex-direction: column; justify-content: space-between; }
        .lesson-card:hover { transform: translateY(-4px); border-color: var(--gold); box-shadow: 0 8px 25px rgba(230,184,74,0.15); }
        .card-top { display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; }
        .card-category { font-size: 0.85rem; color: var(--text-mid); font-weight: 600; }
        .card-level { background: var(--teal-dim); color: var(--teal); padding: 0.2rem 0.8rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
        .card-level.b1 { background: var(--gold-dim); color: var(--gold); }
        .card-level.b2 { background: var(--purple-dim); color: var(--purple); }
        .card-title { font-size: 1.2rem; font-weight: 600; margin: 0.5rem 0 0.8rem; color: var(--text); line-height: 1.4; }
        .card-meta { display: flex; gap: 1rem; font-size: 0.9rem; color: var(--text-mid); margin-bottom: 1.2rem; }
        .card-meta span { display: flex; align-items: center; gap: 0.3rem; }
        .card-actions { display: flex; align-items: center; justify-content: space-between; }
        .card-btn { background: var(--gold); color: #000; padding: 0.5rem 1.2rem; border-radius: var(--radius); text-decoration: none; font-weight: 600; transition: background 0.2s; }
        .card-btn:hover { background: #d4a83a; }
        .completed-badge { color: var(--green); font-weight: bold; display: flex; align-items: center; gap: 0.3rem; }
        .empty-state { text-align: center; padding: 4rem 0; color: var(--text-mid); }
        .empty-state h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .loader { text-align: center; padding: 4rem 0; color: var(--text-mid); }
        .loader .spinner { border: 4px solid var(--surface2); border-top: 4px solid var(--gold); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (max-width: 640px) {
            .hub-hero h1 { font-size: 2.2rem; }
            .filter-bar { flex-direction: column; }
            .filter-bar input, .filter-bar select { width: 100%; }
            .lesson-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <main style="max-width: 1100px; margin: 120px auto; padding: 2rem;">
        <div class="hub-hero">
            <h1 class="gold-text">🎧 Listening Practice</h1>
            <p>Boost your listening skills with real-world scenarios from Bangladesh. Listen, fill in the blanks, and test your comprehension.</p>
        </div>

        <div class="filter-bar">
            <input type="text" id="search-input" placeholder="🔍 Search for a topic...">
            <select id="category-filter">
                <option value="all">All Categories</option>
                <option value="bangladesh">🇧🇩 Bangladesh</option>
                <option value="daily">☀️ Daily Life</option>
                <option value="travel">✈️ Travel</option>
                <option value="office">💼 Office</option>
                <option value="student">🎓 Student</option>
                <option value="confidence">💪 Confidence</option>
            </select>
            <div class="level-filters">
                <button class="level-btn active" data-level="all">All</button>
                <button class="level-btn" data-level="A1">A1</button>
                <button class="level-btn" data-level="A2">A2</button>
                <button class="level-btn" data-level="B1">B1</button>
                <button class="level-btn" data-level="B2">B2</button>
            </div>
        </div>

        <div id="lesson-grid" class="lesson-grid">
            <div class="loader">
                <div class="spinner"></div>
                <p>Loading exercises...</p>
            </div>
        </div>

        <div style="margin-top: 3rem; text-align: center;">
            <a href="/learn.html" class="btn-primary">📚 Back to Learning Hub</a>
        </div>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const grid = document.getElementById('lesson-grid');
            const searchInput = document.getElementById('search-input');
            const categoryFilter = document.getElementById('category-filter');
            const levelBtns = document.querySelectorAll('.level-btn');
            let currentLevel = 'all';
            let data = [];

            // Slugify function (same as Python)
            function slugify(title) {
                return title.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-');
            }

            // Load completed from localStorage
            function getCompletedIds() {
                try {
                    const raw = localStorage.getItem('ovidhan_listening_completed');
                    return raw ? JSON.parse(raw) : [];
                } catch { return []; }
            }

            // Render cards
            function render() {
                const search = searchInput.value.toLowerCase().trim();
                const category = categoryFilter.value;
                const completedIds = getCompletedIds();

                const filtered = data.filter(item => {
                    const matchesSearch = item.title.toLowerCase().includes(search);
                    const matchesCategory = category === 'all' || item.category === category;
                    const matchesLevel = currentLevel === 'all' || item.level === currentLevel;
                    return matchesSearch && matchesCategory && matchesLevel;
                });

                if (filtered.length === 0) {
                    grid.innerHTML = `<div class="empty-state"><h3>😕 No exercises found</h3><p>Try adjusting your search or filters.</p></div>`;
                    return;
                }

                grid.innerHTML = filtered.map(item => {
                    const slug = slugify(item.title);
                    const url = `/listening/${item.category}/${slug}.html`;
                    const icon = category_icons[item.category] || '📄';
                    const isCompleted = completedIds.includes(item.id);
                    let levelClass = item.level.toLowerCase();
                    if (levelClass === 'b1') levelClass = 'b1';
                    else if (levelClass === 'b2') levelClass = 'b2';

                    return `
                        <div class="lesson-card">
                            <div>
                                <div class="card-top">
                                    <span class="card-category">${icon} ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</span>
                                    <span class="card-level ${levelClass}">${item.level}</span>
                                </div>
                                <h3 class="card-title">${item.title}</h3>
                                <div class="card-meta">
                                    <span>⏱ ${item.duration_minutes} min</span>
                                    <span>⭐ ${item.xp} XP</span>
                                </div>
                            </div>
                            <div class="card-actions">
                                <a href="${url}" class="card-btn">Start Listening →</a>
                                ${isCompleted ? `<span class="completed-badge">✅ Completed</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Fetch data
            fetch('/listening-exercises.json')
                .then(response => {
                    if (!response.ok) throw new Error('Failed to load exercises');
                    return response.json();
                })
                .then(json => {
                    data = json;
                    if (data.length === 0) {
                        grid.innerHTML = `<div class="empty-state"><h3>📭 No exercises</h3><p>Add exercises to listening-exercises.json and reload.</p></div>`;
                        return;
                    }
                    render();
                })
                .catch(error => {
                    console.error('Fetch error:', error);
                    grid.innerHTML = `<div class="empty-state"><h3>⚠️ Error loading data</h3><p>${error.message}</p><p><button onclick="location.reload()" class="btn-primary">Reload</button></p></div>`;
                });

            // Filter events
            searchInput.addEventListener('input', render);
            categoryFilter.addEventListener('change', render);
            levelBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    levelBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    currentLevel = this.dataset.level;
                    render();
                });
            });
        });
    </script>
</body>
</html>"""

# Write the file
with open('listening.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("✅ Fetch‑based Listening Hub generated: listening.html")