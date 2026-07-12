// ──────────────────────────────────────────────────────────────
// Ovidhan Global Tracking – Loads on every page
// ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    // Only track if Recommendations is loaded
    if (typeof Recommendations === 'undefined') return;

    let category = 'general';
    const path = window.location.pathname;
    
    // Determine category from URL path
    if (path.includes('/grammar')) category = 'grammar';
    else if (path.includes('/dictionary') || path.includes('/vocabulary') || 
             path.includes('/synonyms') || path.includes('/antonyms') || 
             path.includes('/idioms') || path.includes('/phrasal')) {
        category = 'vocabulary';
    }
    else if (path.includes('/exam') || path.includes('/assessment') || 
             path.includes('/bcs') || path.includes('/ielts') || 
             path.includes('/bank')) {
        category = 'exam';
    }
    else if (path.includes('/speaking') || path.includes('/conversation')) {
        category = 'speaking';
    }
    else if (path.includes('/tools')) {
        category = 'tools';
    }
    
    // Track the page view
    Recommendations.trackPageView(path, category);
});
