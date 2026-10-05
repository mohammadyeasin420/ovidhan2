'use strict';
// SEO-R7F-100E forward contract for the frozen 97-word batch.
// Run: node tests/dictionary-v2-r7f-b1.test.js

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../scripts/dictionary-v2/lib');
const render = require('../scripts/dictionary-v2/render');
const cleanup = require('../scripts/dictionary-v2/definition-cleanup');

const root = lib.ROOT;
const editorial = lib.readJson(path.join(root, 'research', 'SEO_R7F_BATCH1_97_FINAL_EDITORIAL.json'));
const selection = lib.readJson(path.join(root, 'research', 'SEO_R7F_BATCH1_100_SELECTION.json'));
const r7e = lib.readJson(path.join(root, 'research', 'SEO_R7E_PILOT_SELECTION.json'));
const COHORT = editorial.entries.map((entry) => entry.word);
const BY_WORD = new Map(editorial.entries.map((entry) => [entry.word, entry]));
const SELECTED = new Map(selection.words.map((word) => [word.slug, word]));
const R7E = new Set(r7e.words.map((word) => word.slug));
const HOLDOUT = new Set(r7e.observational_holdout);
const EXCLUDED = ['scalability', 'disappointed', 'noticed'];
const FROZEN_STRINGS = {
    integer: ['ঋণাত্মক তিন একটি পূর্ণসংখ্যা, কিন্তু অর্ধেক নয়।'],
    persuasive: ['বিশ্বাস জাগাতে সক্ষম'],
    majesty: ['বিশালত্ব', 'ভরা জোয়ারে পদ্মার বিশালত্ব যাত্রীদের চুপ করিয়ে দিল।'],
    autumn: ['পাতাঝরার ঋতু', 'পাতাঝরার মৌসুমে স্কুলের উঠোনে শুকনো পাতা জমল।'],
    desired: ['জানালার ধারের কাঙ্ক্ষিত আসনটি আগেই অন্য কেউ নিয়ে নিয়েছিল।']
};
const gitLines = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').map((line) => line.trim()).filter(Boolean);
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

const registry = lib.loadRegistry(root);
const frozen = lib.loadFrozenWords(root);
const corpus = cleanup.corpusRegistry(cleanup.loadManifest());
const shell = render.loadShell(root);

scenario('the frozen batch is 97 upgrades outside the closed corpus, R7E, frozen set, and holdout', () => {
    const editorialBytes = fs.readFileSync(path.join(root, 'research', 'SEO_R7F_BATCH1_97_FINAL_EDITORIAL.json'));
    const editorialLf = Buffer.from(editorialBytes.toString('utf8').replace(/\r\n/g, '\n'));
    assert.equal(crypto.createHash('sha256').update(editorialLf).digest('hex'), '5e8334b738d22421ae37beefaeb81306d87ee44fca6d9bbcbe695797669b4dcd');
    assert.equal(COHORT.length, 97);
    assert.equal(new Set(COHORT).size, 97);
    assert.equal(corpus.size, 2326);
    assert.equal(registry.size, 3065);
    assert.equal(frozen.size, 186);
    assert.equal(R7E.size, 48);
    for (const slug of EXCLUDED) {
        assert.equal(COHORT.includes(slug), false, slug);
        assert.equal(registry.has(slug), false, slug);
    }
    for (const slug of COHORT) {
        const entry = BY_WORD.get(slug);
        const row = SELECTED.get(slug);
        assert.equal(entry.status, 'PASS', slug);
        assert.equal(row.action, 'UPGRADE', slug);
        assert.equal(entry.pos, row.pos, slug);
        assert.equal(entry.oewn_synset, row.oewn_synset, slug);
        assert.equal(registry.has(slug), true, slug);
        assert.equal(corpus.has(slug), false, slug);
        assert.equal(frozen.has(slug), false, slug);
        assert.equal(R7E.has(slug), false, slug);
        assert.equal(HOLDOUT.has(slug), false, slug);
    }
    const outside = [...registry].filter((slug) => !corpus.has(slug));
    assert.equal(outside.length, 739);
});

scenario('each R7F page matches its record and the Bengali one-sense contract', () => {
    const explanations = new Map();
    const english = new Map();
    const bangla = new Map();
    for (const slug of COHORT) {
        const record = lib.readJson(path.join(root, 'dictionary-v2', 'r7f-b1', slug + '.json'));
        const entry = BY_WORD.get(slug);
        const sense = record.senses[0];
        assert.equal(record.senses.length, 1, slug);
        assert.equal(sense.pos, entry.pos, slug);
        assert.equal(sense.source.synset_id, entry.oewn_synset, slug);
        assert.equal(sense.bangla_meaning.display, entry.head_meaning_bn, slug);
        assert.equal(sense.bangla_explanation.text, entry.explanation_bn, slug);
        assert.equal(sense.examples[0].en, entry.example_en, slug);
        assert.equal(sense.examples[0].bn, entry.example_bn, slug);
        assert.equal(sense.definition.text, SELECTED.get(slug).oewn_definition, slug);
        assert.equal(explanations.has(sense.bangla_explanation.text), false, slug);
        assert.equal(english.has(sense.examples[0].en), false, slug);
        assert.equal(bangla.has(sense.examples[0].bn), false, slug);
        explanations.set(sense.bangla_explanation.text, slug);
        english.set(sense.examples[0].en, slug);
        bangla.set(sense.examples[0].bn, slug);
        const buf = fs.readFileSync(path.join(root, 'word', slug + '.html'));
        const html = buf.toString('utf8').replace(/\r\n/g, '\n');
        assert.equal(html.includes('\uFFFD'), false, slug);
        const problems = render.productionContractProblems(html, record, { phrase: 'Bengali' });
        assert.deepEqual(problems, [], slug + ': ' + problems.join('; '));
        assert.equal(html, render.renderPage(record, { mode: 'production', shell, cohort: COHORT, phrase: 'Bengali' }), slug);
        assert.ok(html.includes('<title>' + slug.charAt(0).toUpperCase() + slug.slice(1) + ' Meaning in Bengali | Ovidhan</title>'), slug);
        assert.equal(html.includes('Meaning in Bangla'), false, slug);
        assert.equal(html.includes('Bengali (Bangla)'), false, slug);
        assert.equal((html.match(/<h1\b/g) || []).length, 1, slug);
        assert.ok(html.includes('<span class="v2-headword">' + slug + '</span> meaning in Bengali</h1>'), slug);
        assert.equal(html.includes('class="v2-jump"'), false, slug);
        assert.equal(html.includes('class="v2-senses"'), false, slug);
        assert.ok(html.includes('class="v2-kicker">Bangla meaning</p>'), slug);
        assert.ok(html.includes(esc(sense.bangla_meaning.display)), slug);
        assert.ok(html.includes('<span class="v2-pos">' + sense.pos + '</span>'), slug);
        assert.ok(html.includes(esc(sense.definition.text)), slug);
        assert.ok(html.includes('>বাংলা ব্যাখ্যা</dt>'), slug);
        assert.ok(html.includes(esc(sense.bangla_explanation.text)), slug);
        assert.ok(html.includes(esc(sense.examples[0].en)), slug);
        assert.ok(html.includes(esc(sense.examples[0].bn)), slug);
        assert.ok(html.includes('<link rel="canonical" href="https://ovidhan.net/word/' + slug + '.html">'), slug);
        assert.ok(html.includes('Open English WordNet 2025'), slug);
        assert.ok(html.indexOf('</article>') < html.indexOf('class="explorer-container"'), slug);
        const parsed = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)[1].replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, ''));
        const term = parsed['@graph'].find((node) => node['@type'] === 'DefinedTerm');
        assert.equal(term.description, sense.definition.text, slug);
        assert.equal(term.alternateName, sense.bangla_meaning.display, slug);
        if (FROZEN_STRINGS[slug]) {
            for (const value of FROZEN_STRINGS[slug]) assert.ok(html.includes(value), slug + ' ' + value);
        }
    }
});

scenario('the committed R7F batch 1 pages and records stay untouched', () => {
    for (const slug of COHORT) {
        assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'word/' + slug + '.html']).length, 0, slug);
        assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'dictionary-v2/r7f-b1/' + slug + '.json']).length, 0, slug);
    }
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'scripts/dictionary-v2/r7f-b1.js']).length, 0);
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'sitemap.xml']).length, 0);
    assert.equal(fs.readdirSync(path.join(root, 'dictionary-v2', 'r7f-b1')).filter((name) => name.endsWith('.json')).length, 97);
    const sitemap = fs.readFileSync(path.join(root, 'sitemap-approved-words.xml'), 'utf8');
    for (const slug of COHORT) assert.ok(sitemap.includes('/word/' + slug + '.html'), slug);
    assert.equal((sitemap.match(/<loc>/g) || []).length, 3065);
});

console.log('All dictionary-v2 R7F batch-1 forward checks passed.');
