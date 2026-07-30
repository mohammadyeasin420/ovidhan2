// learning-explorer.js – Phase 2 (Verb Forms, Collocations, Mistakes)

let dictionary = null;

fetch('/enriched-dictionary.json')
    .then(res => res.json())
    .then(data => {
        dictionary = {};
        data.forEach(entry => {
            const word = entry.english || entry.word || entry.en;
            if (word) dictionary[word.toLowerCase()] = entry;
        });
        const params = new URLSearchParams(window.location.search);
        const wordParam = params.get('word');
        if (wordParam) {
            document.getElementById('wordInput').value = wordParam;
            searchWord();
        }
    })
    .catch(err => {
        console.error('Dictionary load error:', err);
        document.getElementById('resultArea').innerHTML = '<p style="color: var(--red);">❌ Failed to load dictionary.</p>';
    });

function searchWord() {
    const word = document.getElementById('wordInput').value.trim().toLowerCase();
    const resultArea = document.getElementById('resultArea');
    if (!word) {
        resultArea.innerHTML = '<p style="color: var(--text-soft);">Please enter a word.</p>';
        return;
    }
    if (!dictionary) {
        resultArea.innerHTML = '<p>Loading dictionary...</p>';
        return;
    }

    const entry = dictionary[word];
    if (!entry) {
        resultArea.innerHTML = `<p style="color: var(--text-soft);">❌ Word not found. Try another word.</p>`;
        return;
    }

    // --- Update URL & canonical ---
    const url = new URL(window.location);
    url.searchParams.set('word', word);
    window.history.pushState({}, '', url);
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', `https://ovidhan.net/word/${word}.html`);

    // --- Build HTML ---
    let html = `<div class="result-card">`;
    html += `<div class="word">${word}</div>`;
    html += `<div class="pronunciation">/ ${entry.pronunciation || '...'} / <button onclick="speak('${word}')" style="background:none; border:none; color:var(--teal); cursor:pointer;">🔊</button></div>`;
    html += `<div class="meaning"><strong>Meaning:</strong> ${entry.meaning || 'Not available'}</div>`;
    html += `<div class="bangla"><strong>বাংলা:</strong> ${entry.bangla || 'Not available'}</div>`;
    html += `<div><strong>Word type:</strong> ${entry.part_of_speech || 'N/A'}</div>`;

    // --- Verb Forms (if available) ---
    if (entry.verb_forms && Object.keys(entry.verb_forms).length > 0) {
        html += `<div class="verb-forms"><strong>🔄 Verb Forms</strong><ul>`;
        for (const [tense, form] of Object.entries(entry.verb_forms)) {
            html += `<li><strong>${tense}:</strong> ${form}</li>`;
        }
        html += `</ul></div>`;
    }

    // --- Collocations (if available) ---
    if (entry.collocations && entry.collocations.length > 0) {
        html += `<div class="collocations"><strong>🔗 Collocations</strong><ul>`;
        entry.collocations.forEach(col => html += `<li>${col}</li>`);
        html += `</ul></div>`;
    }

    // --- Common Mistakes (if available) ---
    if (entry.common_mistakes && entry.common_mistakes.length > 0) {
        html += `<div class="common-mistakes"><strong>⚠️ Common Mistakes</strong><ul>`;
        entry.common_mistakes.forEach(m => {
            html += `<li>❌ ${m.wrong} → ✅ ${m.right} <span style="color:var(--text-mid); font-size:0.9rem;">(${m.explanation_bn})</span></li>`;
        });
        html += `</ul></div>`;
    }

    // --- Examples ---
    if (entry.examples && entry.examples.length) {
        html += `<div class="examples"><strong>Examples:</strong><ul>`;
        entry.examples.forEach(ex => html += `<li>${ex}</li>`);
        html += `</ul></div>`;
    }

    // --- Related words ---
    if (entry.synonyms || entry.antonyms) {
        html += `<div class="related-words"><strong>Related:</strong> `;
        if (entry.synonyms) {
            entry.synonyms.forEach(syn => html += `<a href="/word/${syn}.html">${syn}</a> `);
        }
        if (entry.antonyms) {
            entry.antonyms.forEach(ant => html += `<a href="/word/${ant}.html">${ant}</a> `);
        }
        html += `</div>`;
    }

    // --- Learn More (future phases) ---
    html += `<button class="learn-more-btn" onclick="toggleExtra()">▼ Learn More</button>`;
    html += `<div class="extra-sections" id="extraSections">`;
    html += `<p style="color:var(--text-mid);">Quiz, flashcards, story, and daily challenge coming soon.</p>`;
    html += `</div>`;
    html += `</div>`;

    resultArea.innerHTML = html;
}

function toggleExtra() {
    const extra = document.getElementById('extraSections');
    const btn = document.querySelector('.learn-more-btn');
    extra.classList.toggle('open');
    btn.textContent = extra.classList.contains('open') ? '▲ Show Less' : '▼ Learn More';
}

function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
}

document.getElementById('wordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchWord();
});