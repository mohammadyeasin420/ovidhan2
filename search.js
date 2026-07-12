// ============================================================
//  search.js – Ovidhan Site‑Wide Search Engine
//  Uses search-index.json, local storage, and category filters
// ============================================================

(function() {
    'use strict';

    // ── DOM refs ──
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    const resultsContainer = document.getElementById('results');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const popularContainer = document.getElementById('popularSearches');

    let allItems = [];          // full index
    let currentFilter = 'all';
    let currentQuery = '';

    // ── Load index ──
    async function loadIndex() {
        try {
            const res = await fetch('search-index.json');
            if (!res.ok) throw new Error('Failed to load search index');
            allItems = await res.json();
            // Render initial state
            renderPopularSearches();
            performSearch('');
        } catch (err) {
            console.warn('Search index not loaded:', err);
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="big-icon">⚠️</div>
                    <p>Search index could not be loaded. Please refresh or try again later.</p>
                </div>
            `;
        }
    }

    // ── Popular searches (from localStorage or defaults) ──
    function getPopularSearches() {
        const stored = localStorage.getItem('ovidhan_popular_searches');
        if (stored) {
            try {
                const arr = JSON.parse(stored);
                if (Array.isArray(arr) && arr.length > 0) return arr;
            } catch (_) {}
        }
        // Defaults
        return ['Grammar', 'Tenses', 'BCS', 'IELTS', 'Verb Forms', 'Pronunciation'];
    }

    function renderPopularSearches() {
        const terms = getPopularSearches();
        popularContainer.innerHTML = `<span class="label">🔥 Popular:</span> ` +
            terms.map(term => `<span class="popular-tag" data-term="${term}">${term}</span>`).join(' ');
        // Attach click events
        popularContainer.querySelectorAll('.popular-tag').forEach(el => {
            el.addEventListener('click', function() {
                searchInput.value = this.dataset.term;
                performSearch(this.dataset.term);
                // Save this popular search
                savePopularSearch(this.dataset.term);
            });
        });
    }

    function savePopularSearch(term) {
        let list = getPopularSearches();
        // Remove duplicate, add to front
        list = list.filter(t => t.toLowerCase() !== term.toLowerCase());
        list.unshift(term);
        if (list.length > 10) list = list.slice(0, 10);
        localStorage.setItem('ovidhan_popular_searches', JSON.stringify(list));
        renderPopularSearches();
    }

    // ── Search logic ──
    function performSearch(query) {
        currentQuery = query.trim().toLowerCase();
        const filter = currentFilter;

        let results = [];

        if (currentQuery === '') {
            // Show all items when empty (maybe limit to 20)
            results = allItems.slice(0, 20);
        } else {
            // Search in title, description, keywords, and category
            const words = currentQuery.split(/\s+/);
            results = allItems.filter(item => {
                // Check if all words appear in the item's searchable fields
                const searchable = (item.title + ' ' + (item.description || '') + ' ' + (item.keywords || []).join(' ') + ' ' + item.category).toLowerCase();
                return words.every(w => searchable.includes(w));
            });
        }

        // Apply category filter
        if (filter !== 'all') {
            results = results.filter(item => item.category === filter);
        }

        // Group by category
        const groups = {};
        results.forEach(item => {
            const cat = item.category || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });

        // Render
        renderResults(groups, currentQuery);
    }

    function renderResults(groups, query) {
        const groupKeys = Object.keys(groups);

        if (groupKeys.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="big-icon">😕</div>
                    <p>No results found for "<strong>${query}</strong>"</p>
                    <div class="suggestions">
                        <span>Try:</span>
                        <span class="popular-tag" data-term="Grammar">Grammar</span>
                        <span class="popular-tag" data-term="Tenses">Tenses</span>
                        <span class="popular-tag" data-term="BCS">BCS</span>
                        <span class="popular-tag" data-term="IELTS">IELTS</span>
                        <span class="popular-tag" data-term="Verb">Verb</span>
                    </div>
                </div>
            `;
            // Re‑attach click events for suggestion tags
            resultsContainer.querySelectorAll('.popular-tag').forEach(el => {
                el.addEventListener('click', function() {
                    searchInput.value = this.dataset.term;
                    performSearch(this.dataset.term);
                    savePopularSearch(this.dataset.term);
                });
            });
            return;
        }

        let html = '';
        // Show results grouped
        for (const cat of groupKeys) {
            const items = groups[cat];
            const emojiMap = {
                'Grammar': '📚',
                'Vocabulary': '📖',
                'Speaking': '🗣️',
                'Exam': '🎓',
                'Tools': '🛠️',
                'Other': '📄'
            };
            const emoji = emojiMap[cat] || '📄';
            html += `<div class="result-group">`;
            html += `<div class="group-title">${emoji} ${cat} (${items.length})</div>`;
            for (const item of items) {
                const title = highlightMatch(item.title, query);
                const desc = item.description ? highlightMatch(item.description, query) : '';
                html += `
                    <a href="${item.url}" class="result-item">
                        <span class="emoji">${item.emoji || '📄'}</span>
                        <div class="content">
                            <div class="title">${title}</div>
                            ${desc ? `<div class="desc">${desc}</div>` : ''}
                        </div>
                        <span class="category-badge">${item.category}</span>
                    </a>
                `;
            }
            html += `</div>`;
        }
        resultsContainer.innerHTML = html;
    }

    // Simple highlight (case‑insensitive)
    function highlightMatch(text, query) {
        if (!query || query.length < 1) return text;
        const words = query.split(/\s+/).filter(w => w.length > 0);
        let result = text;
        for (const w of words) {
            const regex = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            result = result.replace(regex, '<mark style="background:var(--gold-dim);color:var(--gold);padding:0 2px;border-radius:2px;">$1</mark>');
        }
        return result;
    }

    // ── Event listeners ──
    // Input
    searchInput.addEventListener('input', function() {
        const val = this.value;
        clearBtn.classList.toggle('visible', val.length > 0);
        performSearch(val);
        if (val.trim().length > 2) {
            // Save as popular after a short delay
            clearTimeout(window._searchTimer);
            window._searchTimer = setTimeout(() => {
                savePopularSearch(val.trim());
            }, 1000);
        }
    });

    // Clear button
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        clearBtn.classList.remove('visible');
        performSearch('');
        searchInput.focus();
    });

    // Category filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            performSearch(searchInput.value);
        });
    });

    // Keyboard shortcut: Ctrl+K or Cmd+K
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
        // Escape to clear
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            clearBtn.classList.remove('visible');
            performSearch('');
            searchInput.blur();
        }
    });

    // ── Init ──
    // Load index and render
    loadIndex();

    // If URL has ?q=something, fill search box
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q) {
        searchInput.value = q;
        clearBtn.classList.add('visible');
        // Wait for index to load then search
        const checkIndex = setInterval(() => {
            if (allItems.length > 0) {
                clearInterval(checkIndex);
                performSearch(q);
                savePopularSearch(q);
            }
        }, 200);
    }

    // Also support category filter from URL ?cat=Grammar
    const cat = urlParams.get('cat');
    if (cat) {
        filterBtns.forEach(btn => {
            if (btn.dataset.filter === cat) {
                btn.click();
            }
        });
    }

})();
