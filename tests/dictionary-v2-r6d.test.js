'use strict';
// SEO-R6D: tests for the deterministic Dictionary V2 renderer and the 12-word LOCAL-ONLY visual pilot.
// Run: node tests/dictionary-v2-r6d.test.js
// Offline: reads the committed V2 records, the R6C report and the generated preview pages.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../scripts/dictionary-v2/lib');
const r6c = require('../scripts/dictionary-v2/r6c');
const render = require('../scripts/dictionary-v2/render');
const { loadContext } = require('../scripts/dictionary-v2/validate');

const root = lib.ROOT;
const ctx = loadContext();
const clone = (value) => JSON.parse(JSON.stringify(value));
const records = r6c.loadRecords(ctx.v2);
const report = lib.readJson(path.join(root, r6c.REPORT_PATH));
const previewDir = path.join(root, render.PREVIEW_DIR);
const readPreview = (slug) => fs.readFileSync(path.join(previewDir, slug + '.html'), 'utf8');
const readUtf8 = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

const COHORT = ['swarm', 'good', 'chaos', 'designation', 'introvert', 'tough', 'savage', 'repeat', 'crush', 'guess', 'potential', 'waist'];
const SENSE_COUNTS = { swarm: 3, good: 4, chaos: 1, designation: 3, introvert: 1, tough: 4, savage: 3, repeat: 3, crush: 3, guess: 3, potential: 2, waist: 1 };
const SINGLE = ['chaos', 'introvert', 'waist'];
const FROZEN_PAGES = ['exercise', 'rudimentary', 'sad', 'sufficient', 'weird'];

// ---- tiny HTML helpers (the pages are produced by one renderer, so a structural regex is exact and strict enough)
const decode = (text) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const strip = (html) => decode(html.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<style\b[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
const visibleText = (html) => strip(html);
const articleOf = (html) => /<article class="dictionary-answer v2-entry">[\s\S]*?<\/article>/.exec(html)[0];
const h1Of = (html) => [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => strip(m[1]));
const jsonLdBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const first = (re, text) => { const m = re.exec(text); return m ? decode(m[1]) : null; };
function sensesOf(html) {
    return [...articleOf(html).matchAll(/class="v2-sense" id="sense-(\d+)">([\s\S]*?)<\/dl>/g)].map((m) => ({
        number: Number(m[1]),
        block: m[2],
        pos: first(/class="v2-sense-pos">([^<]*)</, m[2]),
        meaning: first(/class="v2-sense-bn" lang="bn">([^<]*)</, m[2]),
        definition: first(/class="v2-def" lang="en">([^<]*)</, m[2]),
        explanation: first(/<dt lang="bn">বাংলা ব্যাখ্যা<\/dt><dd lang="bn">([^<]*)</, m[2]),
        examples: [...m[2].matchAll(/<p class="v2-example-en" lang="en">([^<]*)<\/p><p class="v2-example-bn" lang="bn">([^<]*)<\/p>/g)].map((e) => ({ en: decode(e[1]), bn: decode(e[2]) })),
        notes: [...m[2].matchAll(/class="v2-note" lang="bn">([^<]*)</g)].map((n) => decode(n[1]))
    }));
}
const quickMeaning = (html) => first(/class="v2-quick-meaning" lang="bn">([^<]*)</, html);
const quickPos = (html) => first(/<span class="v2-pos">([^<]*)</, html);

scenario('exact 12 preview pages exist in dictionary-v2/previews/, outside word/, and nothing else is there', () => {
    assert.deepEqual([...render.COHORT], COHORT);
    assert.equal(render.PREVIEW_DIR, 'dictionary-v2/previews');
    assert.deepEqual(fs.readdirSync(previewDir).sort(), COHORT.map((s) => s + '.html').sort());
    assert.ok(!render.PREVIEW_DIR.startsWith('word'));
    assert.deepEqual(COHORT.map((s) => render.previewPath(s)), COHORT.map((s) => 'dictionary-v2/previews/' + s + '.html'));
});

scenario('cohort allowlist: only the 12 R6D words render; other words, unknown modes and invalid records are refused', () => {
    const rendered = render.renderCohort();
    assert.deepEqual([...rendered.keys()], COHORT, 'deterministic cohort order');
    assert.throws(() => render.renderPage(records.get('lunch')), /allowlist/);
    assert.throws(() => render.renderPage(records.get('good'), { mode: 'live' }), /unknown render mode/);
    const broken = new Map([...records].map(([k, v]) => [k, clone(v)]));
    delete broken.get('tough').senses[2].bangla_explanation;
    assert.throws(() => render.renderCohort({ records: broken }), /refusing to render invalid record tough/);
    const missing = new Map(records); missing.delete('waist');
    assert.throws(() => render.renderCohort({ records: missing }), /cohort record missing: waist/);
});

scenario('the previews are generated from the structured records, never from text inside the renderer', () => {
    const rendered = render.renderCohort();
    for (const slug of COHORT) assert.equal(readPreview(slug), rendered.get(slug), slug + ' preview equals the renderer output');
    // changing the record changes the page: content flows from the record
    const edited = new Map([...records].map(([k, v]) => [k, clone(v)]));
    edited.get('tough').senses[2].bangla_meaning.display = 'পরীক্ষামূলক অর্থ';
    const changed = render.renderCohort({ records: edited, validate: false }).get('tough');
    assert.ok(changed.includes('পরীক্ষামূলক অর্থ'));
    assert.ok(!readPreview('tough').includes('পরীক্ষামূলক অর্থ'));
    // the renderer source carries no lexical content: no definitions, examples or Bangla meanings
    const source = fs.readFileSync(path.join(root, 'scripts/dictionary-v2/render.js'), 'utf8');
    const withoutLabels = source.replace(/বাংলা ব্যাখ্যা/g, '').replace(/ব্যবহার/g, '');
    assert.ok(!/[\u0980-\u09FF]/.test(withoutLabels), 'only the two UI labels are Bangla in render.js');
    for (const slug of COHORT) for (const sense of records.get(slug).senses) {
        assert.ok(!source.includes(sense.definition.text), 'definition not hardcoded: ' + sense.definition.text);
        assert.ok(!source.includes(sense.examples[0].en), 'example not hardcoded');
    }
    // rendering never mutates the record
    const before = clone(records.get('good'));
    render.renderPage(records.get('good'));
    assert.deepEqual(records.get('good'), before);
});

scenario('rendering is deterministic: UTF-8, LF, no BOM, one trailing newline, identical across runs and output directories', () => {
    const a = render.renderCohort();
    const b = render.renderCohort();
    for (const slug of COHORT) {
        assert.equal(a.get(slug), b.get(slug), slug);
        const bytes = fs.readFileSync(path.join(previewDir, slug + '.html'));
        assert.ok(!(bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF), slug + ' has no BOM');
        const text = bytes.toString('utf8');
        assert.ok(!text.includes('\r'), slug + ' LF only');
        assert.ok(text.endsWith('</html>\n') && !text.endsWith('\n\n'), slug + ' single trailing newline');
        assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:/.test(text), slug + ' has no timestamp');
    }
    const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'r6d-a-'));
    const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'r6d-b-'));
    try {
        render.build({ out: dirA }); render.build({ out: dirB });
        for (const slug of COHORT) assert.ok(fs.readFileSync(path.join(dirA, slug + '.html')).equals(fs.readFileSync(path.join(dirB, slug + '.html'))), slug);
        assert.deepEqual(render.check({ out: dirA }), []);
    } finally { fs.rmSync(dirA, { recursive: true, force: true }); fs.rmSync(dirB, { recursive: true, force: true }); }
});

scenario('--check fails on a changed, missing or extra preview file and passes on an exact match', () => {
    assert.deepEqual(render.check(), [], 'committed previews match');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r6d-check-'));
    try {
        render.build({ out: dir });
        assert.deepEqual(render.check({ out: dir }), []);
        fs.appendFileSync(path.join(dir, 'good.html'), '<!-- drift -->\n');
        assert.ok(render.check({ out: dir }).some((p) => p.includes('differs') && p.includes('good.html')));
        render.build({ out: dir });
        fs.rmSync(path.join(dir, 'waist.html'));
        assert.ok(render.check({ out: dir }).some((p) => p.includes('missing preview: waist.html')));
        render.build({ out: dir });
        fs.writeFileSync(path.join(dir, 'lunch.html'), '<html></html>');
        assert.ok(render.check({ out: dir }).some((p) => p.includes('unexpected file') && p.includes('lunch.html')));
        // CRLF drift is detected too (output is LF only)
        render.build({ out: dir }); fs.rmSync(path.join(dir, 'lunch.html'));
        fs.writeFileSync(path.join(dir, 'chaos.html'), fs.readFileSync(path.join(dir, 'chaos.html'), 'utf8').replace(/\n/g, '\r\n'));
        assert.ok(render.check({ out: dir }).some((p) => p.includes('chaos.html')));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    const out = execFileSync(process.execPath, ['scripts/dictionary-v2/render.js', 'check'], { cwd: root, encoding: 'utf8' });
    assert.match(out, /R6D check OK: 12 preview pages/);
});

scenario('every preview is noindex,nofollow, has no canonical, and carries an unmistakable development-only marker', () => {
    for (const slug of COHORT) {
        const html = readPreview(slug);
        assert.equal((html.match(/<meta name="robots" content="noindex,nofollow">/g) || []).length, 1, slug);
        assert.ok(!/<meta name="robots"[^>]*content="(?!noindex,nofollow)/.test(html), slug + ' no other robots directive');
        assert.ok(!/rel="canonical"/.test(html), slug + ' has no canonical');
        assert.ok(!/<meta property="og:url"|hreflang/.test(html));
        assert.ok(html.startsWith('<!DOCTYPE html>\n<!-- DEVELOPMENT PREVIEW ONLY (SEO-R6D)'), slug + ' marker comment');
        assert.ok(html.includes('NOT a production page'));
        assert.ok(html.includes('<div class="v2-devbar" role="note">'), slug + ' visible banner');
        assert.ok(/<title>\[V2 preview\] /.test(html), slug + ' tab title is marked');
        assert.ok(html.includes('<meta name="ovidhan-dev-preview"'));
        assert.ok(html.includes('href="../../styles.css"') && html.includes('src="../../learning-explorer.js"'), slug + ' asset paths from dictionary-v2/previews/');
    }
});

scenario('exactly one learner-facing H1 "[word] meaning in Bangla" and a valid heading order', () => {
    for (const slug of COHORT) {
        const html = readPreview(slug);
        assert.deepEqual(h1Of(html), [slug + ' meaning in Bangla'], slug);
        const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
        assert.equal(levels[0], 1, slug + ' starts with h1');
        for (let i = 1; i < levels.length; i++) assert.ok(levels[i] <= levels[i - 1] + 1, slug + ' heading order skips a level: ' + levels.join(','));
        assert.equal(levels.filter((l) => l === 1).length, 1);
        const expected = SINGLE.includes(slug) ? [1, 2, 2] : [1, 2, ...Array(SENSE_COUNTS[slug]).fill(3), 2];
        assert.deepEqual(levels, expected, slug + ' heading outline');
        assert.ok(html.indexOf('<h1') < html.indexOf('class="v2-quick"'), 'the answer follows the H1 immediately');
    }
});

scenario('the primary Bangla answer and primary POS are static, near the top, and come from the first (learner-first) sense', () => {
    for (const slug of COHORT) {
        const html = readPreview(slug);
        const first = records.get(slug).senses[0];
        assert.equal(quickMeaning(html), first.bangla_meaning.display, slug);
        assert.equal(quickPos(html), first.pos, slug);
        const articleText = visibleText(articleOf(html));
        assert.ok(articleText.indexOf(first.bangla_meaning.display) < 150, slug + ' answer appears before any prose');
        assert.ok(html.indexOf('class="v2-quick-meaning"') < html.indexOf('class="v2-sense"'), 'answer before the sense list');
    }
    assert.equal(quickMeaning(readPreview('tough')), 'কঠিন');
    assert.equal(quickMeaning(readPreview('good')), 'ভালো');
    assert.equal(quickMeaning(readPreview('crush')), records.get('crush').senses[0].bangla_meaning.display);
});

scenario('selected-sense counts and order: every R6C sense is rendered, in record order, one numbered card each', () => {
    let total = 0;
    for (const slug of COHORT) {
        const html = readPreview(slug);
        const senses = sensesOf(html);
        const record = records.get(slug);
        assert.equal(record.senses.length, SENSE_COUNTS[slug], slug + ' record count');
        assert.equal(senses.length, SENSE_COUNTS[slug], slug + ' rendered count');
        assert.deepEqual(senses.map((s) => s.number), record.senses.map((_, i) => i + 1), slug + ' numbering 1..N');
        assert.deepEqual(senses.map((s) => s.definition), record.senses.map((s) => s.definition.text), slug + ' definition order');
        if (SENSE_COUNTS[slug] > 1) assert.deepEqual(senses.map((s) => s.pos), record.senses.map((s) => s.pos), slug + ' POS order');
        else assert.equal(quickPos(html), record.senses[0].pos, slug + ' POS shown once, in the quick answer');
        assert.deepEqual(senses.map((s) => s.explanation === null ? null : s.explanation), record.senses.map((s) => s.bangla_explanation.text), slug + ' explanations');
        total += senses.length;
    }
    assert.equal(total, 31);
    // learner-first ordering is kept even though V1 (the live page) starts elsewhere
    for (const slug of ['crush', 'guess']) {
        const record = records.get(slug);
        const v1Index = record.senses.findIndex((s) => s.v1_primary);
        assert.notEqual(v1Index, 0, slug + ' R6C changed the order');
        const senses = sensesOf(readPreview(slug));
        assert.equal(senses[v1Index].definition, record.senses[v1Index].definition.text, slug + ' V1 sense is not first in the page either');
        assert.equal(senses[0].definition, record.senses[0].definition.text);
        assert.notEqual(senses[0].definition, record.senses[v1Index].definition.text);
        assert.equal(quickPos(readPreview(slug)), record.senses[0].pos);
    }
    assert.equal(sensesOf(readPreview('crush'))[0].pos, 'verb');
    assert.equal(sensesOf(readPreview('guess'))[0].pos, 'verb');
});

scenario('every sense has a definition, a Bangla explanation, an English example and a Bangla example; sense meanings are distinct', () => {
    for (const slug of COHORT) {
        const record = records.get(slug);
        const senses = sensesOf(readPreview(slug));
        senses.forEach((sense, i) => {
            const rs = record.senses[i];
            const label = slug + ' sense ' + sense.number;
            assert.ok(sense.definition && sense.definition.length > 5, label + ' definition');
            assert.ok(sense.explanation && sense.explanation.length > 10, label + ' Bangla explanation');
            assert.equal(sense.examples.length, rs.examples.length, label + ' examples');
            assert.deepEqual(sense.examples, rs.examples.map((e) => ({ en: e.en, bn: e.bn })), label + ' bilingual example text');
            for (const example of sense.examples) {
                assert.ok(/[A-Za-z]/.test(example.en) && !/[\u0980-\u09FF]/.test(example.en), label + ' English example is English');
                assert.ok(/[\u0980-\u09FF]/.test(example.bn), label + ' Bangla example is Bangla');
            }
            if (SENSE_COUNTS[slug] > 1) assert.equal(sense.meaning, rs.bangla_meaning.display, label + ' concise Bangla meaning');
            assert.ok(sense.block.includes('<dt>Definition</dt>') && sense.block.includes('<dt lang="bn">বাংলা ব্যাখ্যা</dt>'), label + ' labelled rows');
            assert.ok(/<dt>Examples?<\/dt>/.test(sense.block), label + ' example row');
        });
        const meanings = record.senses.map((s) => s.bangla_meaning.display);
        assert.equal(new Set(meanings).size, meanings.length, slug + ' distinct Bangla meanings');
        assert.equal(new Set(senses.map((s) => s.definition)).size, senses.length, slug + ' distinct definitions');
    }
    // R6C usage notes are learner content and render with their own sense
    const good = sensesOf(readPreview('good'));
    assert.equal(good[1].notes.length, 1); assert.ok(good[1].notes[0].includes('good at'));
    assert.equal(good[3].notes.length, 1); assert.ok(good[3].notes[0].includes('good for'));
    assert.equal(good[0].notes.length, 0);
});

scenario('GOOD: 4 distinct senses, the natural V2 Bangla example is shown and the awkward V1 wording never appears', () => {
    const html = readPreview('good');
    const senses = sensesOf(html);
    assert.equal(senses.length, 4);
    assert.deepEqual(senses.map((s) => s.meaning), ['ভালো', 'দক্ষ, পটু', 'সৎ ও নীতিবান', 'উপকারী']);
    assert.equal(senses[0].examples[0].bn, 'প্রতি রাতে পড়াশোনা করে সে ভালো ফল করেছিল।');
    assert.ok(html.includes('প্রতি রাতে পড়াশোনা করে সে ভালো ফল করেছিল।'));
    assert.ok(!html.includes('প্রতিরাত পড়ে সে ভালো ফল করেছিল'), 'historical awkward V1 sentence absent');
    assert.ok(!html.includes('প্রতিরাত পড়ে'), 'no fragment of it either');
    const v1Original = records.get('good').senses[0].v1_revision.v1_original.example_bn;
    assert.ok(!html.includes(v1Original), 'the stored v1_revision.v1_original text is not learner-facing');
    assert.equal(senses[0].examples[0].en, 'She got a good result after studying every night.');
});

scenario('TOUGH: 4 senses including the sturdy/durable sense; DESIGNATION: 3 distinct senses; SAVAGE: no rejected person senses', () => {
    const tough = sensesOf(readPreview('tough'));
    assert.equal(tough.length, 4);
    assert.deepEqual(tough.map((s) => s.meaning), ['কঠিন', 'কঠোর ও শক্ত মনের', 'মজবুত, টেকসই', 'শক্ত, চিবানো কঠিন']);
    assert.equal(tough[2].definition, 'substantially made or constructed');
    assert.ok(tough[2].examples[0].en.includes('tough rubber boots'));
    const designation = sensesOf(readPreview('designation'));
    assert.equal(designation.length, 3);
    assert.deepEqual(designation.map((s) => s.meaning), ['পদবি', 'নিয়োগ, মনোনয়ন', 'ঘোষণা, চিহ্নিতকরণ'].map((m, i) => records.get('designation').senses[i].bangla_meaning.display));
    assert.equal(new Set(designation.map((s) => s.meaning)).size, 3);
    assert.equal(new Set(designation.map((s) => s.definition)).size, 3);
    const savageHtml = readPreview('savage');
    const savageText = visibleText(savageHtml);
    assert.equal(sensesOf(savageHtml).length, 3);
    for (const rejected of report.words.find((w) => w.lemma === 'savage').candidates.filter((c) => c.decision === 'REJECTED')) {
        assert.ok(!savageText.includes(rejected.definition), 'rejected savage sense absent: ' + rejected.definition);
    }
    for (const phrase of ['uncivilized', 'barbarian', 'civilizing influences', 'cruelly rapacious']) assert.ok(!savageHtml.includes(phrase), 'savage page has no "' + phrase + '"');
    assert.ok(sensesOf(savageHtml).some((s) => s.definition === 'criticize harshly or violently'));
});

scenario('no rejected candidate of any word is rendered, and no provenance or internal metadata leaks into the learner interface', () => {
    for (const slug of COHORT) {
        const html = readPreview(slug);
        const defs = new Set(sensesOf(html).map((s) => s.definition));
        for (const rejected of report.words.find((w) => w.lemma === slug).candidates.filter((c) => c.decision === 'REJECTED')) {
            assert.ok(!defs.has(rejected.definition), slug + ' rejected definition rendered: ' + rejected.definition);
        }
        for (const marker of ['synset', 'OEWN_', 'OVIDHAN_EDITORIAL', 'v1_original', 'v1_revision', 'v1_primary', 'editorial_enrichment', 'provenance', 'archive_sha256', 'source_page_sha256', 'record_status', 'V1_MIGRATION', 'EDITORIAL_ENRICHED', 'cleanup_manifest', 'quoted_examples']) {
            assert.ok(!html.includes(marker), slug + ' leaks "' + marker + '"');
        }
        assert.ok(!/\b\d{8}-[nvasr]\b/.test(html), slug + ' leaks a synset id');
        assert.ok(!/ data-(?!x)/.test(html), slug + ' has no data-* provenance attributes');
        assert.ok(!html.includes(records.get(slug).provenance.oewn.archive_sha256));
    }
});

scenario('single-sense words (chaos, introvert, waist) look complete and intentional, with no empty multi-sense framework', () => {
    for (const slug of SINGLE) {
        const html = readPreview(slug);
        const article = articleOf(html);
        const record = records.get(slug);
        const sense = record.senses[0];
        assert.ok(!article.includes('v2-jump'), slug + ' no jump list');
        assert.ok(!article.includes('class="v2-senses"'), slug + ' no ordered sense list');
        assert.ok(!article.includes('<h3'), slug + ' no sense sub-headings');
        assert.ok(!/\d+ meanings/.test(article), slug + ' no "N meanings"');
        assert.ok(!article.includes('v2-num'), slug + ' no numbering');
        assert.ok(article.includes('<h2 class="v2-section-title" id="meanings-title">Meaning and example</h2>'));
        const parsed = sensesOf(html);
        assert.equal(parsed.length, 1);
        assert.equal(parsed[0].definition, sense.definition.text);
        assert.equal(parsed[0].explanation, sense.bangla_explanation.text);
        assert.deepEqual(parsed[0].examples, [{ en: sense.examples[0].en, bn: sense.examples[0].bn }]);
        assert.equal(quickMeaning(html), sense.bangla_meaning.display);
        assert.equal(quickPos(html), sense.pos);
        assert.ok(html.includes('class="lexical-source v2-source"'));
    }
    for (const slug of COHORT.filter((s) => !SINGLE.includes(s))) {
        const html = readPreview(slug);
        assert.ok(html.includes('class="v2-jump"'), slug);
        assert.ok(html.includes(SENSE_COUNTS[slug] + ' meanings'), slug);
        const targets = [...html.matchAll(/href="#(sense-\d+)"/g)].map((m) => m[1]);
        assert.deepEqual(targets, Array.from({ length: SENSE_COUNTS[slug] }, (_, i) => 'sense-' + (i + 1)));
    }
});

scenario('the Learning Explorer is preserved verbatim below the complete static answer', () => {
    for (const slug of COHORT) {
        const html = readPreview(slug);
        const prod = readUtf8('word/' + slug + '.html');
        const explorer = /<div class="explorer-container"[\s\S]*?<div id="resultArea"><\/div>\s*<\/div>/.exec(html)[0];
        assert.ok(explorer.includes('<div class="explorer-container" style="padding:2rem;">'));
        assert.ok(explorer.includes('<h2>🔍 Learning Explorer</h2>'));
        assert.ok(explorer.includes('<div class="search-box">'));
        assert.ok(explorer.includes('id="wordInput"') && explorer.includes('value="' + slug + '"'));
        assert.ok(explorer.includes('<button onclick="searchWord()" class="btn-primary">Search</button>'));
        assert.ok(explorer.includes('<div id="resultArea"></div>'));
        assert.ok(prod.includes('<script src="../learning-explorer.js"></script>') && html.includes('<script src="../../learning-explorer.js"></script>'));
        assert.ok(html.indexOf('</article>') < html.indexOf('class="explorer-container"'), slug + ' explorer is below the whole static answer');
        assert.ok(html.indexOf('</main>') < html.indexOf('learning-explorer.js'), 'script placement matches V1');
        assert.ok(html.indexOf('class="explorer-container"') < html.indexOf('</main>'));
        // the explorer must not hide or replace the static lexical answer
        assert.ok(!/id="staticWordContent"|<article[^>]*\bhidden\b/.test(html));
    }
});

scenario('the lexical answer needs no JavaScript: all of it is in the static HTML outside <script> and <style>', () => {
    for (const slug of COHORT) {
        const html = readPreview(slug);
        const noScript = html.replace(/<script\b[\s\S]*?<\/script>/g, '');
        const text = visibleText(articleOf(noScript));
        const record = records.get(slug);
        assert.ok(text.includes(slug + ' meaning in Bangla'));
        for (const sense of record.senses) {
            for (const part of [sense.bangla_meaning.display, sense.pos, sense.definition.text, sense.bangla_explanation.text, sense.examples[0].en, sense.examples[0].bn]) assert.ok(text.includes(part), slug + ' static: ' + part);
        }
        assert.ok(!/<noscript/i.test(html));
        assert.ok(!/(innerHTML|document\.write|createElement)/.test(articleOf(html)));
    }
});

scenario('DefinedTerm JSON-LD: valid JSON, one DefinedTerm per rendered sense in visible order, only fields the record supports', () => {
    for (const slug of COHORT) {
        const html = readPreview(slug);
        const blocks = jsonLdBlocks(html);
        assert.equal(blocks.length, 2, slug + ' breadcrumb + definition data');
        const parsed = blocks.map((b) => JSON.parse(b));
        assert.equal(parsed[0]['@type'], 'BreadcrumbList');
        assert.deepEqual(parsed[0].itemListElement.map((i) => i.name), ['Home', 'Dictionary', slug]);
        const data = parsed[1];
        assert.equal(data['@context'], 'https://schema.org');
        const set = data['@graph'].filter((n) => n['@type'] === 'DefinedTermSet');
        const terms = data['@graph'].filter((n) => n['@type'] === 'DefinedTerm');
        assert.equal(set.length, 1);
        assert.equal(terms.length, SENSE_COUNTS[slug], slug + ' DefinedTerm per sense');
        assert.equal(data['@graph'].length, terms.length + 1, 'nothing else in the graph');
        assert.equal(set[0].name, slug);
        assert.deepEqual(set[0].hasDefinedTerm, terms.map((t) => ({ '@id': t['@id'] })));
        const record = records.get(slug);
        terms.forEach((term, i) => {
            assert.equal(term.name, slug);
            assert.equal(term.termCode, String(i + 1));
            assert.equal(term.description, record.senses[i].definition.text, slug + ' description is the visible definition');
            assert.equal(term.alternateName, record.senses[i].bangla_meaning.display);
            assert.deepEqual(term.inLanguage, ['en', 'bn']);
            assert.equal(term.url, 'https://ovidhan.net/word/' + slug + '.html#sense-' + (i + 1));
            assert.equal(term['@id'], term.url);
            assert.deepEqual(term.inDefinedTermSet, { '@id': set[0]['@id'] });
            assert.ok(html.includes('id="sense-' + (i + 1) + '"'), 'the term anchors to a visible sense');
            assert.ok(strip(articleOf(html)).includes(term.description) && strip(articleOf(html)).includes(term.alternateName), 'JSON-LD only states what the page shows');
        });
        const keys = new Set(); (function walk(v) { if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); } })(data);
        for (const forbidden of ['aggregateRating', 'review', 'rating', 'mainEntity', 'acceptedAnswer', 'pronunciation', 'synonym', 'sameAs', 'speakable', 'author', 'datePublished']) assert.ok(!keys.has(forbidden), slug + ' no ' + forbidden);
        assert.ok(!/"@type":\s*"(FAQPage|Question|Answer|Review|Rating)"/.test(blocks[1]));
        assert.ok(!blocks.some((b) => b.includes('<')), 'JSON-LD is script-safe');
    }
});

scenario('accessibility: language-tagged Bangla, labelled landmarks, unique ids, number-not-colour sense identity, focus styles, no custom widgets', () => {
    for (const slug of COHORT) {
        const html = readPreview(slug);
        const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
        assert.equal(new Set(ids).size, ids.length, slug + ' unique ids');
        assert.ok(html.includes('<nav class="v2-breadcrumb" aria-label="Breadcrumb">') && html.includes('aria-current="page"'));
        assert.ok(html.includes('<html lang="en">'));
        assert.ok(/<p class="v2-quick-meaning" lang="bn">/.test(html));
        // every run of Bangla text sits in an element with lang="bn"
        const article = articleOf(html);
        for (const m of article.matchAll(/<(p|dd|span|dt)\b([^>]*)>([^<]*[\u0980-\u09FF][^<]*)</g)) assert.ok(/lang="bn"/.test(m[2]), slug + ' Bangla without lang: ' + m[3]);
        assert.ok(!/tabindex="[1-9]/.test(html), 'no positive tabindex');
        assert.ok(!/<(div|span)[^>]*\brole="(button|tab|tablist|dialog|menu)"/.test(article), 'no custom widgets');
        assert.ok(!/onclick=|<button/.test(article), 'the answer has no scripted controls');
        assert.ok(html.includes('.v2-entry a:focus-visible'));
        assert.ok(!/outline:\s*(none|0)/.test(render.CSS));
        if (SENSE_COUNTS[slug] > 1) {
            const nums = [...article.matchAll(/class="v2-num">(\d+)</g)].map((m) => Number(m[1]));
            assert.deepEqual(nums, Array.from({ length: SENSE_COUNTS[slug] }, (_, i) => i + 1), 'numbered text, not colour alone');
            assert.equal((article.match(/class="v2-sr">Meaning </g) || []).length, SENSE_COUNTS[slug]);
        }
        assert.ok(html.includes('aria-label="Type a word"'));
    }
    assert.ok(/prefers-reduced-motion|transition|animation/.test(render.CSS) === false, 'no motion introduced');
});

scenario('attribution is compact, consistent with V1, and not dominant', () => {
    for (const slug of COHORT) {
        const html = readPreview(slug);
        const line = /<p class="lexical-source v2-source">[\s\S]*?<\/p>/.exec(html)[0];
        assert.ok(line.includes('English definition source: <a href="https://en-word.net/" rel="noopener">Open English WordNet 2025</a>, <a href="https://creativecommons.org/licenses/by/4.0/" rel="license noopener">CC BY 4.0</a>. Bangla explanation and examples adapted and written for Ovidhan.'), slug);
        assert.equal((html.match(/class="lexical-source/g) || []).length, 1, 'once per page');
        assert.ok(html.indexOf('class="lexical-source') > html.lastIndexOf('class="v2-sense"'), 'attribution comes after the answer');
        assert.ok(/\.v2-source \{[^}]*font-size: 0\.8rem/.test(render.CSS));
        // the production page carries the same statement
        assert.ok(readUtf8('word/' + slug + '.html').includes('Open English WordNet 2025</a>, <a href="https://creativecommons.org/licenses/by/4.0/" rel="license noopener">CC BY 4.0</a>'));
    }
});

scenario('the production design shell is reused, not re-typed: header, menu, footer are the exact production shell', () => {
    const shell = render.loadShell();
    for (const slug of COHORT) {
        const prod = lib.toLf(readUtf8('word/' + slug + '.html'));
        const preview = readPreview(slug);
        const header = prod.slice(prod.indexOf(render.SHELL.headerStart), prod.indexOf(render.SHELL.mainStart));
        const footer = prod.slice(prod.indexOf(render.SHELL.footerStart), prod.indexOf(render.SHELL.footerEnd) + render.SHELL.footerEnd.length);
        assert.equal(lib.sha256(Buffer.from(header, 'utf8')), render.SHELL.headerSha256, slug + ' production header equals the recorded shell');
        assert.equal(lib.sha256(Buffer.from(footer + '\n', 'utf8')), render.SHELL.footerSha256, slug + ' production footer equals the recorded shell');
        assert.ok(preview.includes(header.replace(/\n$/, '')), slug + ' header reused byte-for-byte');
        assert.ok(preview.includes(footer), slug + ' footer reused byte-for-byte');
        assert.ok(preview.includes('<link rel="stylesheet" href="../../styles.css">'));
        assert.ok(preview.includes('<button class="menu-toggle" onclick="toggleMenu()" aria-label="Toggle menu">'));
    }
    assert.ok(shell.header.includes('id="megaMenu"') && shell.footer.includes('site-footer'));
    // the CSS only uses existing design tokens: no new colours except the dev banner
    const colours = [...render.CSS.matchAll(/#[0-9a-fA-F]{3,6}\b/g)].map((m) => m[0].toLowerCase());
    assert.deepEqual([...new Set(colours)], ['#0b1f1a'], 'production styles use only the existing dark-theme text-on-gold colour as a literal');
    assert.ok(!/#[0-9a-f]{3,6}/i.test(render.CSS.replace(/#0B1F1A/g, '')), 'no other literal colour in the production CSS');
    assert.ok(/v2-devbar/.test(render.DEV_CSS) && !/v2-devbar/.test(render.CSS), 'dev banner styling is preview-only');
    for (const token of ['var(--surface)', 'var(--surface2)', 'var(--border)', 'var(--gold)', 'var(--gold)', 'var(--teal)', 'var(--text)', 'var(--text-mid)', 'var(--radius)', 'var(--font-en)']) assert.ok(render.CSS.includes(token), token);
    const used = new Set([...render.CSS.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]));
    const styles = readUtf8('styles.css');
    for (const token of used) assert.ok(new RegExp(token + '\\s*:').test(styles), token + ' is an existing site design token');
    // the production shell fails closed when it changes
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r6d-shell-'));
    try {
        fs.mkdirSync(path.join(tmp, 'word'));
        const original = readUtf8(render.SHELL.source);
        fs.writeFileSync(path.join(tmp, render.SHELL.source), original.replace('<li><a href="/blog.html">📰 Blog</a></li>', '<li><a href="/blog.html">Blog</a></li>'));
        assert.throws(() => render.loadShell(tmp), /production header shell changed/);
        fs.writeFileSync(path.join(tmp, render.SHELL.source), original.replace('Made with ❤️ for Bangladesh', 'Made in Bangladesh'));
        assert.throws(() => render.loadShell(tmp), /production footer shell changed/);
        fs.writeFileSync(path.join(tmp, render.SHELL.source), '<html></html>');
        assert.throws(() => render.loadShell(tmp), /markers not found/);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

scenario('the renderer is production-capable: production mode adds canonical and indexability, same answer body, no dev markers', () => {
    for (const slug of COHORT) {
        const preview = readPreview(slug);
        const prod = render.renderPage(records.get(slug), { mode: 'production' });
        assert.ok(prod.includes('<link rel="canonical" href="https://ovidhan.net/word/' + slug + '.html">'));
        assert.ok(!/noindex|nofollow|DEVELOPMENT PREVIEW|v2-devbar|ovidhan-dev-preview|\[V2 preview\]/.test(prod), slug + ' no dev markers');
        assert.ok(prod.includes('href="../styles.css"') && prod.includes('src="../learning-explorer.js"'));
        assert.equal(articleOf(prod), articleOf(preview), 'the static answer is identical in both modes');
        assert.deepEqual(h1Of(prod), [slug + ' meaning in Bangla']);
        assert.deepEqual(jsonLdBlocks(prod), jsonLdBlocks(preview), 'structured data identical');
        assert.ok(prod.includes('<title>' + slug.charAt(0).toUpperCase() + slug.slice(1) + ' Meaning in Bangla | Ovidhan</title>'));
        assert.match(prod, /<meta name="description" content="[^"]{60,200}">/);
    }
});

scenario('HTML in record text is escaped (no injection through lexical content)', () => {
    const evil = clone(records.get('good'));
    evil.senses[1].definition.text = 'x <script>alert(1)</script> & "q"';
    evil.senses[1].bangla_meaning.display = '<b>দক্ষ</b>';
    const html = render.renderPage(evil);
    assert.ok(!html.includes('<script>alert(1)</script>') && !html.includes('<b>দক্ষ</b>'));
    assert.ok(html.includes('x &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot;'));
    const ld = jsonLdBlocks(html).map((b) => JSON.parse(b));
    assert.equal(ld[1]['@graph'][2].description, 'x <script>alert(1)</script> & "q"');
    assert.ok(!jsonLdBlocks(html)[1].includes('<'), 'JSON-LD escapes <');
});

scenario('previews are isolated: not in sitemaps, registry, robots.txt, production pages, the deploy script or the A-Z pages', () => {
    const registry = JSON.parse(readUtf8('data/approved-static-word-slugs.json'));
    if (Array.isArray(registry)) assert.ok(registry.every((slug) => /^[a-z0-9-]+$/.test(slug)), 'registry holds plain slugs only');
    assert.ok(!JSON.stringify(registry).includes('dictionary-v2'));
    for (const file of fs.readdirSync(root).filter((f) => /^sitemap.*\.xml$/.test(f))) {
        const xml = readUtf8(file);
        assert.ok(!/dictionary-v2/.test(xml), file + ' does not list previews');
    }
    assert.ok(!/dictionary-v2/.test(readUtf8('robots.txt')));
    assert.ok(!/dictionary-v2/.test(readUtf8('deploy-production.ps1')));
    for (const file of fs.readdirSync(root).filter((f) => /^dictionary.*\.html$/.test(f)).concat(['index.html'])) assert.ok(!readUtf8(file).includes('dictionary-v2/previews'), file);
    for (const slug of COHORT) assert.ok(!readUtf8('word/' + slug + '.html').includes('dictionary-v2/previews'), slug + ' production page does not link to its preview');
    assert.ok(!fs.existsSync(path.join(root, 'word', 'previews')));
});

scenario('R6C lexical data is untouched by R6D (records, report, source, lock) and the renderer exposes no data fixes', () => {
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').map((s) => s.trim()).filter(Boolean);
    const lexical = git(['diff', '--name-only', render.BASE_COMMIT, '--', 'dictionary-v2/records', 'dictionary-v2/r6c-editorial-source.json', 'dictionary-v2/r6c-editorial-report.json', 'dictionary-v2/oewn-2025-synset-lock.json', 'dictionary-v2/dictionary-v2.schema.json']);
    assert.deepEqual(lexical, [], 'no R6C lexical file changed');
    assert.deepEqual(git(['status', '--porcelain', '--', 'dictionary-v2/records', 'dictionary-v2/r6c-editorial-source.json', 'dictionary-v2/r6c-editorial-report.json', 'dictionary-v2/oewn-2025-synset-lock.json']), []);
    assert.deepEqual(r6c.validateEditorial({ ctx }), [], 'R6C editorial validation still has zero errors');
    assert.equal(report.totals.selected_senses, 31);
    assert.equal(Object.values(SENSE_COUNTS).reduce((a, b) => a + b, 0), 31);
});

scenario('scope guard: R6D may only add previews, the renderer, its tests and README text; production and R6C data are protected', () => {
    const guard = render.r6dGuardCheck;
    assert.deepEqual(guard(['dictionary-v2/previews/good.html', 'scripts/dictionary-v2/render.js', 'tests/dictionary-v2-r6d.test.js', 'dictionary-v2/README.md']), []);
    for (const bad of [
        'word/good.html', 'word/exercise.html', 'data/approved-static-word-slugs.json', 'sitemap.xml', 'sitemap-approved-words.xml', 'robots.txt',
        'dictionary.html', 'dictionary-az-a.html', 'deploy-production.ps1', 'styles.css', 'learning-explorer.js', 'index.html',
        'dictionary-v2/records/good.json', 'dictionary-v2/r6c-editorial-source.json', 'dictionary-v2/r6c-editorial-report.json',
        'dictionary-v2/oewn-2025-synset-lock.json', 'dictionary-v2/dictionary-v2.schema.json', 'dictionary-v2/previews/index.html',
        'dictionary-v2/previews/sub/good.html', 'scripts/dictionary-v2/migrate-v1.js', 'research/x.json', 'reports/x.json'
    ]) assert.equal(guard([bad]).length, 1, 'must reject ' + bad);
    // the real repository state
    const changed = r6c.changedSince(root, render.BASE_COMMIT);
    assert.deepEqual(guard(changed), [], 'real changes since the R6C checkpoint are inside the R6D scope: ' + changed.join(', '));
    assert.ok(changed.every((p) => !p.startsWith('word/')), 'zero word/*.html changes');
});

scenario('frozen scope: the five frozen pages are not in the cohort and are byte-identical to the checkpoint', () => {
    assert.deepEqual(FROZEN_PAGES.filter((slug) => COHORT.includes(slug)), []);
    for (const slug of FROZEN_PAGES) assert.ok(ctx.frozen.has(slug), slug + ' is frozen in the context');
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    for (const slug of FROZEN_PAGES) {
        assert.equal(git(['diff', '--name-only', render.BASE_COMMIT, '--', 'word/' + slug + '.html']), '', slug + ' unchanged vs checkpoint');
        assert.equal(git(['status', '--porcelain', '--', 'word/' + slug + '.html']), '');
    }
    assert.equal(git(['diff', '--name-only', render.BASE_COMMIT, '--', 'word']), '', 'zero word/ changes');
    assert.equal(git(['status', '--porcelain', '--', 'word']), '');
});

console.log('All dictionary-v2 R6D renderer tests passed.');
