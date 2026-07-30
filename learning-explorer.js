// Load dictionary JSON once and cache it
let dictionary = null;
fetch('/enriched-dictionary.json')
    .then(res => res.json())
    .then(data => {
        dictionary = data;
        // If URL has a ?word=... parameter, search it automatically
        const params = new URLSearchParams(window.location.search);
        const wordParam = params.get('word');
        if (wordParam) {
            document.getElementById('wordInput').value = wordParam;
            searchWord();
        }
    })
    .catch(err => console.error('Dictionary load error:', err));

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

    // --- 1. UPDATE THE URL BAR ---
    const url = new URL(window.location);
    url.searchParams.set('word', word);
    window.history.pushState({}, '', url);

    // --- 2. INJECT THE CANONICAL TAG (The SEO Fix) ---
    // If a user lands on explorer.html?word=kiss, this tag tells Google:
    // "The authoritative page for this content is /word/kiss.html"
    const staticUrl = `https://ovidhan.net/word/${word}.html`;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', staticUrl);

    // --- 3. RENDER THE RESULTS ---
    const entry = dictionary[word];
    if (!entry) {
        resultArea.innerHTML = `<p style="color: var(--text-soft);">❌ Word not found. Try another word.</p>`;
        return;
    }

    // Build the result HTML
    let html = `<div class="result-card" id="resultCard">`;
    html += `<div class="word">${word}</div>`;
    html += `<div class="pronunciation">/ ${entry.pronunciation || '...'} / <button onclick="speak('${word}')" style="background:none; border:none; color:var(--teal); cursor:pointer;">🔊</button></div>`;
    html += `<div class="meaning"><strong>Meaning:</strong> ${entry.meaning || 'Not available'}</div>`;
    html += `<div class="bangla"><strong>বাংলা:</strong> ${entry.bangla || 'Not available'}</div>`;
    html += `<div><strong>Word type:</strong> ${entry.part_of_speech || 'N/A'}</div>`;

    // Examples (with Bangladeshi context)
    if (entry.examples && entry.examples.length) {
        html += `<div class="examples"><strong>Examples:</strong><ul>`;
        entry.examples.forEach(ex => html += `<li>${ex}</li>`);
        html += `</ul></div>`;
    } else if (entry.example) {
        html += `<div class="examples"><strong>Example:</strong><p>${entry.example}</p></div>`;
    }

    // Related words (synonyms/antonyms)
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

    // "Learn More" button (Phase 2+ features will be added here)
    html += `<button class="learn-more-btn" onclick="toggleExtra()">▼ Learn More</button>`;
    html += `<div class="extra-sections" id="extraSections">`;
    html += `<p style="color: var(--text-mid);">More features (verb forms, collocations, common mistakes, quiz, flashcards) coming in Phase 2.</p>`;
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

// Allow Enter key to trigger search
document.getElementById('wordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchWord();
});