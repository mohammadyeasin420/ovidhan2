// ──────────────────────────────────────────────────────────────
// Ovidhan Smart Recommendation Engine v1.0
// Uses localStorage to track user behaviour and suggest content
// ──────────────────────────────────────────────────────────────

const RECOMMENDATIONS = {

    // ─── Configuration ────────────────────────────────────────
    storageKey: 'ovidhan_user_profile',
    maxRecommendations: 6,

    // ─── Default profile ──────────────────────────────────────
    defaultProfile: {
        interests: {
            grammar: 0,
            vocabulary: 0,
            exam: 0,
            speaking: 0,
            general: 0,
            tools: 0
        },
        visited: [],          // list of URLs
        quizHistory: [],      // { category, score, date }
        savedWords: [],       // list of words (strings)
        searches: [],         // list of search terms
        lastActive: null
    },

    // ─── Load or create profile ──────────────────────────────
    getProfile() {
        let profile = localStorage.getItem(this.storageKey);
        if (!profile) {
            // Initialize with defaults
            const fresh = { ...this.defaultProfile };
            fresh.lastActive = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(fresh));
            return fresh;
        }
        return JSON.parse(profile);
    },

    saveProfile(profile) {
        profile.lastActive = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(profile));
    },

    // ─── Track user actions ────────────────────────────────────
    trackPageView(url, category = 'general') {
        const profile = this.getProfile();
        if (!profile.visited.includes(url)) {
            profile.visited.push(url);
        }
        // Boost interest for that category
        if (category && profile.interests[category] !== undefined) {
            profile.interests[category] += 2; // page view = +2
            // cap at 100 to avoid overflow
            profile.interests[category] = Math.min(profile.interests[category], 100);
        }
        this.saveProfile(profile);
    },

    trackQuiz(category, score, total) {
        const profile = this.getProfile();
        const pct = (score / total) * 100;
        profile.quizHistory.push({ category, score, total, pct, date: new Date().toISOString() });
        // Boost interest if score is high
        if (pct >= 70) {
            if (profile.interests[category] !== undefined) {
                profile.interests[category] += 5;
                profile.interests[category] = Math.min(profile.interests[category], 100);
            }
        } else if (pct < 40) {
            // Low score: might need practice – we could recommend more content in that category
            // We'll let the recommendation logic handle that by marking "needs practice"
            // For now, we reduce interest slightly (so they get more targeted content)
            if (profile.interests[category] !== undefined) {
                profile.interests[category] -= 2;
                profile.interests[category] = Math.max(profile.interests[category], 0);
            }
        }
        this.saveProfile(profile);
    },

    trackSearch(query) {
        const profile = this.getProfile();
        profile.searches.push(query);
        // Simple: if query contains grammar-related words, boost grammar
        const grammarKeywords = ['grammar', 'tense', 'verb', 'noun', 'adjective', 'adverb', 'preposition', 'conjunction', 'article'];
        const vocabKeywords = ['synonym', 'antonym', 'idiom', 'phrasal', 'vocabulary', 'word'];
        const examKeywords = ['bcs', 'ielts', 'bank', 'admission', 'exam', 'test'];
        const lower = query.toLowerCase();
        let boosted = false;
        if (grammarKeywords.some(k => lower.includes(k))) {
            profile.interests.grammar = Math.min(profile.interests.grammar + 1, 100);
            boosted = true;
        }
        if (vocabKeywords.some(k => lower.includes(k))) {
            profile.interests.vocabulary = Math.min(profile.interests.vocabulary + 1, 100);
            boosted = true;
        }
        if (examKeywords.some(k => lower.includes(k))) {
            profile.interests.exam = Math.min(profile.interests.exam + 1, 100);
            boosted = true;
        }
        if (!boosted) {
            profile.interests.general = Math.min(profile.interests.general + 1, 100);
        }
        this.saveProfile(profile);
    },

    trackSaveWord(word) {
        const profile = this.getProfile();
        if (!profile.savedWords.includes(word)) {
            profile.savedWords.push(word);
            // Increase vocabulary interest
            profile.interests.vocabulary = Math.min(profile.interests.vocabulary + 3, 100);
            this.saveProfile(profile);
        }
    },

    // ─── Get recommendations ──────────────────────────────────
    async getRecommendations(limit = this.maxRecommendations) {
        const profile = this.getProfile();
        // Fetch content index (search-index.json)
        let contentItems = [];
        try {
            const response = await fetch('/search-index.json');
            if (!response.ok) throw new Error('Failed to fetch content index');
            contentItems = await response.json();
        } catch (e) {
            console.warn('Could not load search-index.json, using fallback content.');
            // Fallback: provide some static recommended items (hardcoded)
            contentItems = [
                { id: 'grammar', title: 'Grammar Hub', category: 'grammar', emoji: '📚', url: '/grammar.html' },
                { id: 'dictionary', title: 'Dictionary', category: 'vocabulary', emoji: '📖', url: '/dictionary.html' },
                { id: 'tools', title: 'Tools Hub', category: 'tools', emoji: '🛠️', url: '/tools.html' },
                { id: 'assessment', title: 'Assessment Center', category: 'exam', emoji: '🎯', url: '/assessment.html' },
            ];
        }

        // Build a list of content items with their category mapping
        const itemsWithCategory = contentItems.map(item => {
            // Determine category from item.category or infer from url/title
            let cat = item.category || 'general';
            // Normalize: map 'grammar' etc.
            const categoryMap = {
                'grammar': 'grammar',
                'vocabulary': 'vocabulary',
                'exam': 'exam',
                'speaking': 'speaking',
                'tools': 'tools',
                'general': 'general'
            };
            cat = categoryMap[cat] || 'general';
            return { ...item, category: cat };
        });

        // Score each item based on user profile
        const scored = itemsWithCategory.map(item => {
            let score = 0;
            // 1. Interest match
            const interest = profile.interests[item.category] || 0;
            score += interest * 2; // high weight

            // 2. Boost if user has visited similar content (category overlap)
            const visitedCategories = new Set();
            profile.visited.forEach(url => {
                // Simple: try to find category from url
                if (url.includes('/grammar')) visitedCategories.add('grammar');
                else if (url.includes('/dictionary') || url.includes('/vocabulary')) visitedCategories.add('vocabulary');
                else if (url.includes('/exam') || url.includes('/assessment')) visitedCategories.add('exam');
                else if (url.includes('/speaking')) visitedCategories.add('speaking');
                else if (url.includes('/tools')) visitedCategories.add('tools');
            });
            if (visitedCategories.has(item.category)) {
                score += 5; // has visited similar category
            }

            // 3. Boost if saved words suggest interest in this category
            // (simple: if category is vocabulary and savedWords > 0)
            if (item.category === 'vocabulary' && profile.savedWords.length > 0) {
                score += 3;
            }

            // 4. Boost if quiz performance shows strength or need
            const quizzesInCategory = profile.quizHistory.filter(q => q.category === item.category);
            if (quizzesInCategory.length > 0) {
                const avgPct = quizzesInCategory.reduce((sum, q) => sum + q.pct, 0) / quizzesInCategory.length;
                if (avgPct >= 70) {
                    score += 4; // they are good, they might want more advanced content
                } else if (avgPct < 50) {
                    score += 6; // they need practice, recommend more content in that category
                }
            }

            // 5. Boost if item is new (not visited)
            if (!profile.visited.includes(item.url)) {
                score += 3;
            }

            // 6. Boost for recent items (if we had date, but we don't, so skip)

            return { ...item, score };
        });

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        // Return top N, but avoid duplicates (by id or url)
        const seen = new Set();
        const unique = scored.filter(item => {
            const key = item.id || item.url;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return unique.slice(0, limit);
    }
};

// ─── Expose globally for inline usage ────────────────────────
window.Recommendations = RECOMMENDATIONS;
