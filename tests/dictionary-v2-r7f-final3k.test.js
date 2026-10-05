'use strict';
// SEO-R7F final 3k forward contract for the frozen 420-word set.
// Run: node tests/dictionary-v2-r7f-final3k.test.js

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../scripts/dictionary-v2/lib');
const render = require('../scripts/dictionary-v2/render');

const root = lib.ROOT;
const editorial = lib.readJson(path.join(root, 'research', 'SEO_R7F_FINAL3K_420_FINAL_EDITORIAL.json'));
const r7e = lib.readJson(path.join(root, 'research', 'SEO_R7E_PILOT_SELECTION.json'));
const batch1 = lib.readJson(path.join(root, 'research', 'SEO_R7F_BATCH1_97_FINAL_EDITORIAL.json'));
const batch2 = lib.readJson(path.join(root, 'research', 'SEO_R7F_BATCH2_174_FINAL_EDITORIAL.json'));
const COHORT = editorial.entries.map((entry) => entry.slug);
const BY_WORD = new Map(editorial.entries.map((entry) => [entry.slug, entry]));
const R7E = r7e.words.map((word) => word.slug);
const BATCH1 = batch1.entries.map((entry) => entry.word);
const BATCH2 = batch2.entries.map((entry) => entry.slug);
const HOLDS = ['dicky', 'wired', 'demise', 'undermine', 'graduated', 'wight', 'swipe', 'dyspnea', 'merchandiser', 'madam', 'argent', 'detox', 'hours', 'circumcision', 'grazing', 'bachelor', 'urologist', 'decided', 'gypsy', 'lunatic', 'corrigendum', 'ablution', 'catholic', 'higher', 'veritable', 'weirdo', 'doomsday', 'twitter', 'hell', 'equity'];
const BUILDS = ['perusal', 'godliness', 'examinee', 'demurrage'];
const gitLines = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/\\/g, '/'));
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

const registry = lib.loadRegistry(root);
const shell = render.loadShell(root);

scenario('the frozen batch is 420 pages, 537 senses, 416 upgrades, and 4 builds', () => {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'research', 'SEO_R7F_FINAL3K_420_FINAL_EDITORIAL.json'))).digest('hex'), 'ed0ebf209dc7e782f6caf995317d74e3672c361b92830ca07cad910c370dabc8');
    assert.equal(COHORT.length, 420);
    assert.equal(new Set(COHORT).size, 420);
    assert.equal(registry.size, 3065);
    assert.equal(editorial.excluded.length, 30);
    const sizes = { 1: 0, 2: 0, 3: 0 };
    const pos = {};
    const action = {};
    let senses = 0;
    for (const entry of editorial.entries) {
        sizes[entry.senses.length]++;
        senses += entry.senses.length;
        action[entry.action] = (action[entry.action] || 0) + 1;
        assert.equal(registry.has(entry.slug), true, entry.slug);
        for (const sense of entry.senses) pos[sense.pos] = (pos[sense.pos] || 0) + 1;
    }
    assert.equal(senses, 537);
    assert.deepEqual(sizes, { 1: 305, 2: 113, 3: 2 });
    assert.deepEqual(action, { UPGRADE: 416, BUILD: 4 });
    assert.deepEqual(editorial.entries.filter((entry) => entry.action === 'BUILD').map((entry) => entry.slug), BUILDS);
    assert.deepEqual(editorial.entries.filter((entry) => entry.senses.length === 3).map((entry) => entry.slug), ['initial', 'means']);
    assert.equal(pos.noun, 313);
    assert.equal(pos.verb, 70);
    assert.equal(pos.adjective, 140);
    assert.equal(pos.adverb, 14);
    for (const slug of HOLDS) {
        assert.equal(COHORT.includes(slug), false, slug);
        assert.equal(registry.has(slug), false, slug);
    }
});

scenario('each production record and page matches the frozen learner senses', () => {
    const records = fs.readdirSync(path.join(root, 'dictionary-v2', 'r7f-final3k')).filter((name) => name.endsWith('.json'));
    assert.deepEqual(records.map((name) => name.slice(0, -5)).sort(), [...COHORT].sort());
    let senses = 0;
    const pos = {};
    for (const slug of COHORT) {
        const record = lib.readJson(path.join(root, 'dictionary-v2', 'r7f-final3k', slug + '.json'));
        const entry = BY_WORD.get(slug);
        assert.equal(record.slug, entry.slug, slug);
        assert.equal(record.headword, entry.word, slug);
        assert.equal(record.record_status, 'V1_MIGRATION', slug);
        assert.equal(record.provenance.v1_migration.action, entry.action, slug);
        assert.equal(record.provenance.v1_migration.batch, 'SEO-R7F-FINAL3K-420', slug);
        assert.equal(record.senses.length, entry.senses.length, slug);
        senses += record.senses.length;
        entry.senses.forEach((sense, index) => {
            const live = record.senses[index];
            pos[live.pos] = (pos[live.pos] || 0) + 1;
            assert.equal(live.sense_id, 's' + (index + 1), slug);
            assert.equal(live.pos, sense.pos, slug);
            assert.equal(live.source.synset_id, sense.oewn_synset, slug);
            assert.equal(live.source.type, 'OEWN_2025', slug);
            assert.equal(live.definition.origin, 'OEWN_GLOSS', slug);
            assert.equal(live.definition.text, sense.oewn_definition, slug);
            assert.equal(live.definition.oewn_definition, sense.oewn_definition, slug);
            assert.equal(live.bangla_meaning.display, sense.head_meaning_bn, slug);
            assert.equal(live.bangla_explanation.text, sense.explanation_bn, slug);
            assert.equal(live.examples.length, 1, slug);
            assert.equal(live.examples[0].en, sense.example_en, slug);
            assert.equal(live.examples[0].bn, sense.example_bn, slug);
            assert.equal(Boolean(live.v1_primary), index === 0, slug);
        });
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
        assert.ok(html.includes('<link rel="canonical" href="https://ovidhan.net/word/' + slug + '.html">'), slug);
        assert.ok(html.includes('Open English WordNet 2025'), slug);
        assert.equal(/Grok|Cursor|qa_verdict|hold_reason|research\/SEO/.test(html), false, slug);
        assert.ok(html.indexOf('</article>') < html.indexOf('class="explorer-container"'), slug);
        for (const sense of record.senses) {
            assert.ok(html.includes(esc(sense.bangla_meaning.display)), slug);
            assert.ok(html.includes(esc(sense.definition.text)), slug);
            assert.ok(html.includes(esc(sense.bangla_explanation.text)), slug);
            assert.ok(html.includes(esc(sense.examples[0].en)), slug);
            assert.ok(html.includes(esc(sense.examples[0].bn)), slug);
        }
    }
    assert.equal(senses, 537);
    assert.equal(pos.noun, 313);
    assert.equal(pos.verb, 70);
    assert.equal(pos.adjective, 140);
    assert.equal(pos.adverb, 14);
});

scenario('approved surfaces admit the 420 and keep the 30 holds out', () => {
    const headRegistry = JSON.parse(execFileSync('git', ['show', 'HEAD:data/approved-static-word-slugs.json'], { cwd: root, encoding: 'utf8' }));
    const liveRegistry = JSON.parse(fs.readFileSync(path.join(root, 'data', 'approved-static-word-slugs.json'), 'utf8'));
    assert.equal(headRegistry.length, 2645);
    assert.equal(liveRegistry.length, 3065);
    assert.deepEqual(liveRegistry.slice(0, 2645), headRegistry);
    assert.deepEqual(liveRegistry.slice(2645), COHORT);
    const sitemap = fs.readFileSync(path.join(root, 'sitemap-approved-words.xml'), 'utf8');
    const locs = sitemap.match(/<loc>([^<]+)<\/loc>/g).map((loc) => loc.slice(5, -6));
    assert.equal(locs.length, 3065);
    assert.equal(new Set(locs).size, 3065);
    for (const slug of COHORT) assert.ok(sitemap.includes('https://ovidhan.net/word/' + slug + '.html'), slug);
    const azNames = fs.readdirSync(root).filter((name) => name === 'dictionary-az.html' || /^dictionary-az-[a-z]\.html$/.test(name));
    const letters = new Set(COHORT.map((slug) => slug[0]));
    assert.equal(letters.has('x'), false);
    assert.equal(azNames.includes('dictionary-az-x.html'), false);
    for (const letter of letters) assert.ok(azNames.includes('dictionary-az-' + letter + '.html'), letter);
    const az = azNames.map((name) => fs.readFileSync(path.join(root, name), 'utf8')).join('\n');
    for (const slug of HOLDS) {
        assert.equal(sitemap.includes('/word/' + slug + '.html'), false, slug);
        assert.equal(az.includes('/word/' + slug + '.html'), false, slug);
        assert.equal(fs.existsSync(path.join(root, 'dictionary-v2', 'r7f-final3k', slug + '.json')), false, slug);
    }
    for (const slug of COHORT) assert.ok(az.includes('/word/' + slug + '.html'), slug);
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'sitemap.xml']).length, 0);
});

scenario('earlier cohorts stay untouched and this working tree only adds the 420', () => {
    for (const slug of R7E.concat(BATCH1, BATCH2)) {
        assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'word/' + slug + '.html']).length, 0, slug);
    }
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'dictionary-v2/r7e-p1']).length, 0);
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'dictionary-v2/r7f-b1']).length, 0);
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'dictionary-v2/r7f-b2']).length, 0);
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'scripts/dictionary-v2/render.js']).length, 0);
    const wordDiff = gitLines(['diff', '--name-only', 'HEAD', '--', 'word']);
    const untrackedWord = gitLines(['ls-files', '--others', '--exclude-standard', '--', 'word']);
    const touched = [...new Set(wordDiff.concat(untrackedWord))].sort();
    if (touched.length) assert.deepEqual(touched, COHORT.map((slug) => 'word/' + slug + '.html').sort());
    const upgrades = editorial.entries.filter((entry) => entry.action === 'UPGRADE').map((entry) => 'word/' + entry.slug + '.html').sort();
    const builds = BUILDS.map((slug) => 'word/' + slug + '.html').sort();
    if (wordDiff.length) assert.deepEqual([...wordDiff].sort(), upgrades);
    if (untrackedWord.length) assert.deepEqual([...untrackedWord].sort(), builds);
});

console.log('All dictionary-v2 R7F final-3k forward checks passed.');
