'use strict';
// SEO-R7F batch 2 forward contract for the frozen 174-word set.
// Run: node tests/dictionary-v2-r7f-b2.test.js

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../scripts/dictionary-v2/lib');
const render = require('../scripts/dictionary-v2/render');

const root = lib.ROOT;
const editorial = lib.readJson(path.join(root, 'research', 'SEO_R7F_BATCH2_174_FINAL_EDITORIAL.json'));
const qa = lib.readJson(path.join(root, 'research', 'SEO_R7F_BATCH2_FINAL_QA.json'));
const r7e = lib.readJson(path.join(root, 'research', 'SEO_R7E_PILOT_SELECTION.json'));
const batch1 = lib.readJson(path.join(root, 'research', 'SEO_R7F_BATCH1_97_FINAL_EDITORIAL.json'));
const COHORT = editorial.entries.map((entry) => entry.slug);
const BY_WORD = new Map(editorial.entries.map((entry) => [entry.slug, entry]));
const R7E = r7e.words.map((word) => word.slug);
const BATCH1 = batch1.entries.map((entry) => entry.word);
const HOLDS = editorial.excluded.map((item) => item.slug);
const CORRECTED = ['encourage', 'deforestation', 'bored', 'soothing', 'diversity', 'conviction', 'sovereign', 'prosecution', 'vacancy', 'circumstances', 'abbreviation', 'artistic'];
const gitLines = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').map((line) => line.trim()).filter(Boolean);
const statusPaths = () => execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).split('\n').filter((line) => line.trim()).map((line) => line.slice(3).trim().replace(/\\/g, '/')).filter((file) => !file.startsWith('research/') && !file.startsWith('.wrangler/'));
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

const registry = lib.loadRegistry(root);
const shell = render.loadShell(root);

scenario('the frozen batch is 174 upgrades with 200 senses and the expected shape', () => {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'research', 'SEO_R7F_BATCH2_174_FINAL_EDITORIAL.json'))).digest('hex'), '79d697efb4c9ad96bf6bebb65b14b3f59a46b4bbb74e2745d2675cd1ea939808');
    assert.equal(COHORT.length, 174);
    assert.equal(new Set(COHORT).size, 174);
    assert.equal(registry.size, 2645);
    assert.equal(HOLDS.length, 26);
    const sizes = { 1: 0, 2: 0, 3: 0 };
    let senses = 0;
    for (const entry of editorial.entries) {
        sizes[entry.senses.length]++;
        senses += entry.senses.length;
        assert.equal(registry.has(entry.slug), true, entry.slug);
        assert.equal(HOLDS.includes(entry.slug), false, entry.slug);
    }
    assert.equal(senses, 200);
    assert.deepEqual(sizes, { 1: 150, 2: 22, 3: 2 });
    assert.equal(BY_WORD.get('vessel').senses.length, 3);
    assert.equal(BY_WORD.get('peripheral').senses.length, 3);
    for (const slug of HOLDS) assert.equal(registry.has(slug), false, slug);
    for (const slug of CORRECTED) assert.equal(BY_WORD.get(slug).qa_verdict, 'CORRECTION_REQUIRED', slug);
});

scenario('each page matches its record, the frozen text, and the Bengali V2 branch', () => {
    const explanations = new Map();
    const english = new Map();
    const bangla = new Map();
    const corrections = new Map(qa.correction_required.map((row) => [row.slug, row]));
    for (const slug of COHORT) {
        const record = lib.readJson(path.join(root, 'dictionary-v2', 'r7f-b2', slug + '.json'));
        const entry = BY_WORD.get(slug);
        assert.equal(record.senses.length, entry.senses.length, slug);
        assert.equal(record.record_status, 'V1_MIGRATION', slug);
        entry.senses.forEach((sense, index) => {
            const live = record.senses[index];
            assert.equal(live.pos, sense.pos, slug);
            assert.equal(live.source.synset_id, sense.oewn_synset, slug);
            assert.equal(live.definition.text, live.definition.oewn_definition, slug);
            assert.equal(live.bangla_meaning.display, sense.head_meaning_bn, slug);
            assert.equal(live.bangla_explanation.text, sense.explanation_bn, slug);
            assert.equal(live.examples[0].en, sense.example_en, slug);
            assert.equal(live.examples[0].bn, sense.example_bn, slug);
            assert.equal(explanations.has(sense.explanation_bn), false, slug);
            assert.equal(english.has(sense.example_en), false, slug);
            assert.equal(bangla.has(sense.example_bn), false, slug);
            explanations.set(sense.explanation_bn, slug);
            english.set(sense.example_en, slug);
            bangla.set(sense.example_bn, slug);
        });
        if (corrections.has(slug)) {
            const corrected = corrections.get(slug);
            for (const replacement of corrected.replacements) {
                const sense = record.senses[replacement.sense_order - 1];
                const field = {
                    head_meaning_bn: sense.bangla_meaning.display,
                    explanation_bn: sense.bangla_explanation.text,
                    example_en: sense.examples[0].en,
                    example_bn: sense.examples[0].bn
                }[replacement.field];
                if (field !== undefined) assert.equal(field, replacement.value, slug + ' ' + replacement.field);
            }
        }
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
        assert.equal(html.includes('class="v2-jump"'), entry.senses.length > 1, slug);
        assert.equal(html.includes('class="v2-senses"'), entry.senses.length > 1, slug);
        assert.ok(html.includes('class="v2-kicker">Bangla meaning</p>'), slug);
        assert.ok(html.includes('>বাংলা ব্যাখ্যা</dt>'), slug);
        assert.ok(html.includes('<link rel="canonical" href="https://ovidhan.net/word/' + slug + '.html">'), slug);
        assert.ok(html.includes('Open English WordNet 2025'), slug);
        assert.ok(html.indexOf('</article>') < html.indexOf('class="explorer-container"'), slug);
        for (const sense of record.senses) {
            assert.ok(html.includes(esc(sense.bangla_meaning.display)), slug);
            assert.ok(html.includes(esc(sense.definition.text)), slug);
            assert.ok(html.includes(esc(sense.bangla_explanation.text)), slug);
            assert.ok(html.includes(esc(sense.examples[0].en)), slug);
            assert.ok(html.includes(esc(sense.examples[0].bn)), slug);
        }
        const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
        const terms = blocks[1]['@graph'].filter((node) => node['@type'] === 'DefinedTerm');
        assert.equal(terms.length, record.senses.length, slug);
    }
    assert.equal(explanations.size, 200);
});

scenario('the production diff is the 174-word batch and its approved surfaces', () => {
    const wordDiff = gitLines(['diff', '--name-only', 'HEAD', '--', 'word']).sort();
    assert.deepEqual(wordDiff, COHORT.map((slug) => 'word/' + slug + '.html').sort());
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'sitemap.xml']).length, 0);
    for (const slug of R7E) assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'word/' + slug + '.html']).length, 0, slug);
    for (const slug of BATCH1) assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'word/' + slug + '.html']).length, 0, slug);
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'dictionary-v2/r7e-p1']).length, 0);
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'dictionary-v2/r7f-b1']).length, 0);
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'scripts/dictionary-v2/render.js']).length, 0);
    const changed = statusPaths();
    const allowed = (file) => {
        if (COHORT.includes(file.slice('word/'.length, -'.html'.length)) && file.startsWith('word/') && file.endsWith('.html')) return true;
        if (file === 'dictionary-v2/r7f-b2/' || (file.startsWith('dictionary-v2/r7f-b2/') && COHORT.includes(path.basename(file, '.json')))) return true;
        return [
            'scripts/dictionary-v2/r7f-b2.js',
            'tests/dictionary-v2-r7f-b2.test.js',
            'tests/dictionary-v2-r7f-b1.test.js',
            'tests/dictionary-v2-r7e-p1.test.js',
            'tests/approved-explorer-routing.test.js',
            'data/approved-static-word-slugs.json',
            'sitemap-approved-words.xml',
            'dictionary-az.html'
        ].includes(file) || /^dictionary-az-[a-z]\.html$/.test(file);
    };
    const unexpected = changed.filter((file) => !allowed(file));
    assert.deepEqual(unexpected, []);
    assert.equal(fs.readdirSync(path.join(root, 'dictionary-v2', 'r7f-b2')).filter((name) => name.endsWith('.json')).length, 174);
    const sitemap = fs.readFileSync(path.join(root, 'sitemap-approved-words.xml'), 'utf8');
    assert.equal((sitemap.match(/<loc>/g) || []).length, 2645);
    const locs = sitemap.match(/<loc>([^<]+)<\/loc>/g).map((loc) => loc.slice(5, -6));
    assert.equal(new Set(locs).size, 2645);
    for (const slug of COHORT) assert.ok(sitemap.includes('https://ovidhan.net/word/' + slug + '.html'), slug);
    for (const slug of HOLDS) assert.equal(sitemap.includes('/word/' + slug + '.html'), false, slug);
});

console.log('All dictionary-v2 R7F batch-2 forward checks passed.');
