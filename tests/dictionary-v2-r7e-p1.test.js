'use strict';
// SEO-R7E forward contract. Historical R6 pages stay "Meaning in Bangla".
// Pages approved from R7E onward use "Meaning in Bengali" in the title and H1.
// The body keeps the Bangla meaning kicker, Bangla explanation, and Bangla example translation.
// Run: node tests/dictionary-v2-r7e-p1.test.js

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../scripts/dictionary-v2/lib');
const render = require('../scripts/dictionary-v2/render');
const cleanup = require('../scripts/dictionary-v2/definition-cleanup');

const root = lib.ROOT;
const selection = lib.readJson(path.join(root, 'research', 'SEO_R7E_PILOT_SELECTION.json'));
const COHORT = selection.words.map((word) => word.slug);
const PROOF = ['inspection', 'incredible', 'interact'];
const R7E_PHRASE = 'Bengali';
const LEXICAL = {
    inspection: {
        display: 'পরিদর্শন',
        explanation: 'কোনো দপ্তর, কারখানা বা প্রতিষ্ঠান যখন নিয়ম মেনে একটি জায়গা, নথি বা কাজ খুঁটিয়ে দেখে, সেই আনুষ্ঠানিক পরীক্ষাই পরিদর্শন।',
        en: 'The safety officer finished the kitchen inspection before the restaurant opened for dinner.',
        bn: 'রেস্তোরাঁ সন্ধ্যার জন্য খোলার আগে নিরাপত্তা কর্মকর্তা রান্নাঘরের পরিদর্শন শেষ করলেন।'
    },
    incredible: {
        display: 'অবিশ্বাস্য',
        explanation: 'এত বেশি, এত ভালো বা এত অদ্ভুত যে প্রথমবার শুনলে বিশ্বাস করতে কষ্ট হয়।',
        en: 'An incredible number of people filled the book fair on its opening morning.',
        bn: 'উদ্বোধনের সকালে বইমেলায় অবিশ্বাস্য সংখ্যক মানুষ ভিড় করেছিল।'
    },
    interact: {
        display: 'পরস্পরের সঙ্গে কথা বলা ও কাজ করা',
        explanation: 'দুজন মানুষ বা দুটি দল যখন কথা বলে, একসঙ্গে কাজ করে, বা একে অপরের আচরণে সাড়া দেয়, তখন এই ক্রিয়াটি ঘটে।',
        en: 'The new teacher asked the students to interact with a partner before writing their answers.',
        bn: 'নতুন শিক্ষক উত্তর লেখার আগে শিক্ষার্থীদের সঙ্গীর সঙ্গে কথা বলতে ও একসঙ্গে কাজ করতে বললেন।'
    }
};
const gitLines = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

const registry = lib.loadRegistry(root);
const frozen = lib.loadFrozenWords(root);
const manifest = cleanup.loadManifest();
const corpus = cleanup.corpusRegistry(manifest);
const shell = render.loadShell(root);

scenario('the closed cleanup corpus stays 2326 and the R7E cohort sits outside it', () => {
    assert.equal(selection.words.length, 48);
    assert.equal(COHORT.length, 48);
    assert.equal(new Set(COHORT).size, 48);
    for (const slug of PROOF) assert.equal(COHORT.includes(slug), true, slug);
    assert.equal(corpus.size, 2326);
    assert.equal(manifest.summary.approved_corpus, 2326);
    const r7f = lib.readJson(path.join(root, 'research', 'SEO_R7F_BATCH1_97_FINAL_EDITORIAL.json')).entries.map((entry) => entry.word);
    assert.equal(r7f.length, 97);
    assert.equal(registry.size, 2471);
    const outside = [...registry].filter((slug) => !corpus.has(slug)).sort();
    assert.deepEqual(outside, [...COHORT, ...r7f].sort());
    for (const slug of COHORT) {
        assert.equal(corpus.has(slug), false, slug);
        assert.equal(frozen.has(slug), false, slug);
        assert.equal(registry.has(slug), true, slug);
    }
});

scenario('each R7E page meets the Bengali static V2 contract and matches its record', () => {
    for (const slug of COHORT) {
        const record = lib.readJson(path.join(root, 'dictionary-v2', 'r7e-p1', slug + '.json'));
        const buf = fs.readFileSync(path.join(root, 'word', slug + '.html'));
        assert.equal(buf.includes(0xFFFD), false, slug + ' utf-8');
        const html = buf.toString('utf8').replace(/\r\n/g, '\n');
        assert.equal(html.includes('\uFFFD'), false, slug);
        const problems = render.productionContractProblems(html, record, { phrase: R7E_PHRASE });
        assert.deepEqual(problems, [], slug + ': ' + problems.join('; '));
        assert.equal(html, render.renderPage(record, { mode: 'production', shell, cohort: COHORT, phrase: R7E_PHRASE }), slug + ' drifted from its record');
        const sense = record.senses[0];
        assert.equal(record.senses.length, 1, slug);
        assert.equal(sense.examples.length, 1, slug);
        if (LEXICAL[slug]) {
            const locked = LEXICAL[slug];
            assert.equal(sense.bangla_meaning.display, locked.display, slug);
            assert.equal(sense.bangla_explanation.text, locked.explanation, slug);
            assert.equal(sense.examples[0].en, locked.en, slug);
            assert.equal(sense.examples[0].bn, locked.bn, slug);
        }
        assert.equal(/বলতে বোঝায়|শব্দটি|সাধারণত/.test(sense.bangla_explanation.text), false, slug);
        assert.ok(html.includes('<title>' + slug.charAt(0).toUpperCase() + slug.slice(1) + ' Meaning in Bengali | Ovidhan</title>'), slug);
        assert.equal(html.includes('Meaning in Bangla'), false, slug);
        assert.equal(html.includes('Bengali (Bangla)'), false, slug);
        assert.ok(html.includes('class="v2-kicker">Bangla meaning</p>'), slug);
        assert.ok(html.includes('>বাংলা ব্যাখ্যা</dt>'), slug);
        assert.ok(html.includes('<link rel="canonical" href="https://ovidhan.net/word/' + slug + '.html">'), slug);
        assert.equal((html.match(/<h1\b/g) || []).length, 1, slug);
        assert.ok(html.includes('<span class="v2-headword">' + slug + '</span> meaning in Bengali</h1>'), slug);
        assert.ok(html.includes(esc(sense.bangla_meaning.display)), slug);
        assert.ok(html.includes('<span class="v2-pos">' + sense.pos + '</span>'), slug);
        assert.ok(html.includes(esc(sense.definition.text)), slug);
        assert.ok(html.includes(esc(sense.bangla_explanation.text)), slug);
        assert.ok(html.includes(esc(sense.examples[0].en)), slug);
        assert.ok(html.includes(esc(sense.examples[0].bn)), slug);
        assert.ok(/[\u0980-\u09FF]/.test(sense.bangla_meaning.display), slug);
        assert.ok(html.includes('Open English WordNet 2025'), slug);
        assert.ok(html.includes('class="explorer-container"'), slug);
        assert.ok(html.indexOf('</article>') < html.indexOf('class="explorer-container"'), slug);
        assert.ok(fs.existsSync(path.join(root, 'styles.css')) && fs.existsSync(path.join(root, 'learning-explorer.js')));
        const parsed = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)[1].replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, ''));
        const term = parsed['@graph'].find((n) => n['@type'] === 'DefinedTerm');
        assert.equal(term.description, sense.definition.text, slug);
        assert.equal(term.alternateName, sense.bangla_meaning.display, slug);
        assert.equal(crypto.createHash('sha256').update(buf).digest('hex').length, 64);
    }
});

scenario('the historical renderer default stays Meaning in Bangla', () => {
    const record = lib.readJson(path.join(root, 'dictionary-v2', 'records', 'waist.json'));
    const html = render.renderPage(record, { mode: 'production', shell });
    assert.deepEqual(render.productionContractProblems(html, record), []);
    assert.ok(html.includes('<title>Waist Meaning in Bangla | Ovidhan</title>'));
    assert.ok(html.includes('<span class="v2-headword">waist</span> meaning in Bangla</h1>'));
    assert.equal(html.includes('Meaning in Bengali'), false);
    assert.equal(frozen.size, 186);
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'sitemap.xml']).length, 0);
});

scenario('the committed R7E 48 pages stay untouched', () => {
    for (const slug of COHORT) {
        assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'word/' + slug + '.html']).length, 0, slug);
    }
    for (const slug of ['exercise', 'rudimentary', 'sad', 'sufficient', 'weird']) {
        assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'word/' + slug + '.html']).length, 0, slug);
    }
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'sitemap.xml']).length, 0);
});

console.log('All dictionary-v2 R7E-P1 forward checks passed.');
