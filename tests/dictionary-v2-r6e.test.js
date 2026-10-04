'use strict';
// SEO-R6E: tests for the 12-word Dictionary V2 PRODUCTION PILOT (guarded plan / apply / verify, production page contract).
// Run: node tests/dictionary-v2-r6e.test.js
// Offline. Needs git history (the V1 baseline commit) and the committed V2 records. The apply workflow is exercised on
// throw-away copies; the final scenarios assert the state of the real repository AFTER the local pilot application.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../scripts/dictionary-v2/lib');
const r6c = require('../scripts/dictionary-v2/r6c');
const render = require('../scripts/dictionary-v2/render');
const r6e = require('../scripts/dictionary-v2/r6e');
const { loadContext } = require('../scripts/dictionary-v2/validate');

const root = lib.ROOT;
const ctx = loadContext();
const clone = (value) => JSON.parse(JSON.stringify(value));
const records = r6c.loadRecords(ctx.v2);
const shell = render.loadShell(root);
const readUtf8 = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const gitOut = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 27 });
const gitLines = (args) => gitOut(args).split('\n').map((s) => s.trim()).filter(Boolean);

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

const COHORT = ['swarm', 'good', 'chaos', 'designation', 'introvert', 'tough', 'savage', 'repeat', 'crush', 'guess', 'potential', 'waist'];
const SENSE_COUNTS = { swarm: 3, good: 4, chaos: 1, designation: 3, introvert: 1, tough: 4, savage: 3, repeat: 3, crush: 3, guess: 3, potential: 2, waist: 1 };
const SINGLE = ['chaos', 'introvert', 'waist'];
const FROZEN_PAGES = ['exercise', 'rudimentary', 'sad', 'sufficient', 'weird'];
const PROTECTED_FILES = [
    'data/approved-static-word-slugs.json', 'sitemap.xml', 'sitemap-approved-words.xml', 'sitemap-index.xml', 'robots.txt',
    'dictionary.html', 'learning-explorer.js', 'deploy-production.ps1', 'styles.css'
];

// ---- tiny HTML helpers (the pages come from one renderer, so a structural regex is exact and strict enough)
const decode = (text) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const strip = (html) => decode(html.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<style\b[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
const first = (re, text) => { const m = re.exec(text); return m ? decode(m[1]) : null; };
const h1Of = (html) => [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => strip(m[1]));
const jsonLdBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
function sensesOf(html) {
    return [...html.matchAll(/<(?:li|div) class="v2-sense" id="sense-(\d+)">([\s\S]*?)<\/dl>/g)].map((m) => ({
        number: Number(m[1]),
        meaning: first(/class="v2-sense-bn" lang="bn">([^<]*)</, m[2]),
        definition: first(/class="v2-def" lang="en">([^<]*)</, m[2]),
        example: first(/class="v2-example-en" lang="en">([^<]*)</, m[2]),
        exampleBn: first(/class="v2-example-bn" lang="bn">([^<]*)</, m[2])
    }));
}

// ---- fixtures: the production pages in memory, and a throw-away copy of the 12 V1 baseline pages
const production = new Map(COHORT.map((slug) => [slug, render.renderProductionPage(records.get(slug), { shell })]));
function makeBaselineDir(eol = 'CRLF') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r6e-word-'));
    for (const slug of COHORT) fs.writeFileSync(path.join(dir, slug + '.html'), r6e.withEol(r6e.v1BaselinePage(root, slug), eol), 'utf8');
    fs.writeFileSync(path.join(dir, 'lunch.html'), 'decoy page that must never change\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'exercise.html'), 'frozen decoy that must never change\n', 'utf8');
    return dir;
}
const planFor = (dir, extra = {}) => r6e.plan({ root, reader: { readRaw: (slug) => fs.readFileSync(path.join(dir, slug + '.html'), 'utf8') }, ctx, records, checkGit: false, ...extra });
const snapshot = (dir) => Object.fromEntries(fs.readdirSync(dir).sort().map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));

// =================================================================== allowlist and refusal
scenario('allowlist is exactly the 12 pilot words; no other word, path or mode can reach word/', () => {
    assert.deepEqual([...render.PRODUCTION_COHORT], COHORT);
    assert.deepEqual([...r6e.ALLOWLIST], COHORT);
    assert.equal(new Set(COHORT).size, 12);
    assert.equal(r6e.APPLY_CONFIRMATION, 'APPLY_R6E_12_V2_PILOT');
    assert.equal(render.productionPath('good'), 'word/good.html');
    for (const bad of ['lunch', 'exercise', 'Good', 'good ', '../good', 'good.html', 'word/good', '', 'goo', 'goods', '*']) {
        assert.throws(() => render.productionPath(bad), /allowlist|R6E/, 'refused: "' + bad + '"');
    }
    assert.throws(() => render.renderProductionPage(records.get('lunch'), { shell }), /allowlist|R6E|not in/);
});

scenario('frozen and unapproved words are refused: the 12 do not intersect the frozen scope and a collision stops the plan', () => {
    assert.deepEqual(COHORT.filter((slug) => ctx.frozen.has(slug)), []);
    for (const slug of FROZEN_PAGES) { assert.ok(ctx.frozen.has(slug), slug + ' is frozen'); assert.ok(!COHORT.includes(slug)); }
    const dir = makeBaselineDir();
    try {
        const collided = planFor(dir, { ctx: { ...ctx, frozen: new Set([...ctx.frozen, 'good']) } });
        assert.equal(collided.ok, false);
        assert.ok(collided.errors.some((e) => e.includes('zero_frozen_collisions') && e.includes('good')));
        const unapproved = planFor(dir, { ctx: { ...ctx, registry: new Set([...ctx.registry].filter((s) => s !== 'waist')) } });
        assert.equal(unapproved.ok, false);
        assert.ok(unapproved.errors.some((e) => e.includes('all_in_approved_registry') && e.includes('waist')));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// =================================================================== preview / production separation
scenario('previews stay noindex,nofollow with no canonical; production pages are indexable with exactly one self canonical', () => {
    for (const slug of COHORT) {
        const preview = readUtf8('dictionary-v2/previews/' + slug + '.html');
        assert.ok(preview.includes('<meta name="robots" content="noindex,nofollow">'), slug + ' preview noindex');
        assert.ok(!preview.includes('rel="canonical"'), slug + ' preview has no canonical');
        const html = production.get(slug);
        assert.ok(!/noindex|nofollow/.test(html), slug + ' production is indexable');
        assert.equal((html.match(/<link rel="canonical"/g) || []).length, 1);
        assert.ok(html.includes('<link rel="canonical" href="https://ovidhan.net/word/' + slug + '.html">'), slug + ' self canonical');
        assert.ok(!/V2 preview|dictionary-v2\/previews|DEVELOPMENT ONLY|v2-dev-banner|development preview/i.test(html), slug + ' no preview markers');
        assert.ok(!/dictionary-v2\/|\.\.\/\.\.\//.test(html.replace(/https:\/\/ovidhan\.net\/[^"]*/g, '')), slug + ' no preview asset paths');
    }
});

scenario('a preview page is never accepted as a production page and the preview build can never write into word/', () => {
    for (const slug of COHORT) {
        const previewHtml = render.renderPage(records.get(slug), { mode: 'preview', shell });
        assert.ok(render.productionContractProblems(previewHtml, records.get(slug)).length > 0, slug + ' preview fails the production contract');
        assert.notEqual(previewHtml, production.get(slug));
    }
    assert.throws(() => render.build({ out: path.join(root, 'word') }), /word|production|refus/i);
    assert.throws(() => render.build({ out: path.join(root, 'word', 'sub') }), /word|production|refus/i);
    assert.throws(() => render.assertNotProductionDir(path.join(root, 'word'), root));
    assert.deepEqual(render.check(), [], 'R6D previews still byte-identical');
});

// =================================================================== production page contract
scenario('production contract: every page has the SEO shell, one H1, one canonical, the static answer and the explorer below it', () => {
    for (const slug of COHORT) {
        const html = production.get(slug);
        const record = records.get(slug);
        assert.deepEqual(render.productionContractProblems(html, record), [], slug);
        assert.ok(!html.includes('\r'), slug + ' LF');
        assert.deepEqual(h1Of(html), [slug + ' meaning in Bangla']);
        assert.ok(html.includes('<title>' + slug[0].toUpperCase() + slug.slice(1) + ' Meaning in Bangla | Ovidhan</title>'), slug + ' title');
        assert.equal((html.match(/<meta name="description"/g) || []).length, 1);
        assert.ok(html.includes('<link rel="stylesheet" href="../styles.css">') || html.includes('href="../styles.css"'));
        assert.ok(html.indexOf('</article>') < html.indexOf('class="explorer-container"'), slug + ' explorer below static answer');
        assert.equal((html.match(/learning-explorer\.js/g) || []).length, 1);
        assert.ok(html.indexOf('</main>') < html.indexOf('learning-explorer.js'));
        assert.equal((html.match(/English definition source:/g) || []).length, 1, 'one compact attribution');
        assert.ok(!/staticWordContent|ovidhan-word-data|synset|OEWN_|oewn-|provenance|v1_original|FAQPage|AggregateRating|aggregateRating|Review|"rating/.test(html), slug + ' no hidden hooks, ids, FAQ or ratings');
        assert.ok(!/pronunciation|synonyms|antonyms|\bIPA\b/i.test(strip(html)), slug + ' no invented pronunciation/synonyms/antonyms');
        assert.ok(html.includes('aria-label="Type a word"'));
    }
});

scenario('production contract is enforced: a page missing its canonical, with noindex, a dev marker or a wrong H1 is refused', () => {
    const good = production.get('good');
    const record = records.get('good');
    const mutations = [
        (h) => h.replace(/<link rel="canonical"[^>]*>\n?/, ''),
        (h) => h.replace('<head>', '<head><meta name="robots" content="noindex,nofollow">'),
        (h) => h.replace('<body', '<!-- DEVELOPMENT PREVIEW --><body'),
        (h) => h.replace('meaning in Bangla</h1>', 'meaning</h1>'),
        (h) => h.replace('</main>', '<h1>second</h1></main>'),
        (h) => h.replace('id="sense-2"', 'id="sense-9"'),
        (h) => h.replace('<script type="application/ld+json">', '<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage"}</script><script type="application/ld+json">')
    ];
    for (const [i, mutate] of mutations.entries()) {
        const mutated = mutate(good);
        assert.notEqual(mutated, good, 'mutation ' + i + ' applied');
        assert.ok(render.productionContractProblems(mutated, record).length > 0, 'mutation ' + i + ' is detected');
    }
});

scenario('structured data: BreadcrumbList plus one DefinedTermSet with ordered DefinedTerms, production URLs, no invented properties', () => {
    for (const slug of COHORT) {
        const html = production.get(slug);
        const blocks = jsonLdBlocks(html);
        assert.equal(blocks.length, 2, slug + ' exactly two JSON-LD blocks');
        const [crumbs, graphDoc] = blocks.map((b) => JSON.parse(b));
        assert.equal(crumbs['@type'], 'BreadcrumbList');
        assert.equal(crumbs.itemListElement.at(-1).name.toLowerCase().includes(slug), true);
        const graph = graphDoc['@graph'];
        assert.equal(graph.filter((n) => n['@type'] === 'DefinedTermSet').length, 1);
        const terms = graph.filter((n) => n['@type'] === 'DefinedTerm');
        assert.equal(terms.length, SENSE_COUNTS[slug], slug + ' one DefinedTerm per sense');
        assert.deepEqual(terms.map((t) => String(t.termCode)), terms.map((_, i) => String(i + 1)));
        for (const [i, term] of terms.entries()) {
            assert.equal(term.name, slug);
            assert.equal(term.url, 'https://ovidhan.net/word/' + slug + '.html#sense-' + (i + 1));
            assert.equal(term.description, records.get(slug).senses[i].definition.text);
        }
        assert.deepEqual(render.productionContractProblems(html, records.get(slug)), []);
        assert.ok(!/"(aggregateRating|review|reviewRating|faq|mainEntity|acceptedAnswer|synonym|antonym|pronunciation)"/i.test(blocks.join('')), slug + ' no invented schema properties');
        assert.ok(!blocks.join('').includes('dictionary-v2'));
    }
});

// =================================================================== content-specific assertions
scenario('sense counts: 31 senses in total, in approved order, with compact single-sense pages for CHAOS, INTROVERT and WAIST', () => {
    let total = 0;
    for (const slug of COHORT) {
        const senses = sensesOf(production.get(slug));
        assert.equal(senses.length, SENSE_COUNTS[slug], slug);
        assert.deepEqual(senses.map((s) => s.number), senses.map((_, i) => i + 1));
        assert.deepEqual(senses.map((s) => s.definition), records.get(slug).senses.map((s) => s.definition.text), slug + ' definitions in record order');
        if (!SINGLE.includes(slug)) assert.deepEqual(senses.map((s) => s.meaning), records.get(slug).senses.map((s) => s.bangla_meaning.display));
        else assert.equal(first(/class="v2-quick-meaning" lang="bn">([^<]*)</, production.get(slug)), records.get(slug).senses[0].bangla_meaning.display, slug + ' primary answer');
        total += senses.length;
    }
    assert.equal(total, 31);
    for (const slug of SINGLE) {
        const html = production.get(slug);
        assert.ok(!html.includes('class="v2-jump"') && !html.includes('class="v2-senses"') && !html.includes(' meanings<'), slug + ' no empty multi-sense UI');
        assert.ok(html.includes('id="meanings-title">Meaning and example</h2>'));
    }
    for (const slug of COHORT.filter((s) => !SINGLE.includes(s))) assert.ok(production.get(slug).includes('class="v2-jump"') && production.get(slug).includes('id="meanings-title">Meanings</h2>'), slug);
});

scenario('GOOD, TOUGH, DESIGNATION, SAVAGE, CRUSH and GUESS content is exactly the approved R6C editorial result', () => {
    const good = production.get('good');
    const goodSenses = sensesOf(good);
    assert.deepEqual(goodSenses.map((s) => s.meaning), ['ভালো', 'দক্ষ, পটু', 'সৎ ও নীতিবান', 'উপকারী']);
    assert.equal(goodSenses[0].exampleBn, 'প্রতি রাতে পড়াশোনা করে সে ভালো ফল করেছিল।');
    assert.ok(good.includes('প্রতি রাতে পড়াশোনা করে সে ভালো ফল করেছিল।'));
    assert.ok(!good.includes('প্রতিরাত পড়ে সে ভালো ফল করেছিল') && !good.includes('প্রতিরাত পড়ে'), 'awkward V1 sentence absent');
    const tough = sensesOf(production.get('tough'));
    assert.deepEqual(tough.map((s) => s.meaning), ['কঠিন', 'কঠোর ও শক্ত মনের', 'মজবুত, টেকসই', 'শক্ত, চিবানো কঠিন']);
    assert.equal(sensesOf(production.get('designation')).length, 3);
    const savageHtml = production.get('savage');
    assert.equal(sensesOf(savageHtml).length, 3);
    for (const phrase of ['uncivilized', 'barbarian', 'civilizing influences', 'cruelly rapacious']) assert.ok(!savageHtml.includes(phrase), 'savage has no "' + phrase + '"');
    assert.ok(sensesOf(savageHtml).some((s) => s.definition === 'criticize harshly or violently'));
    for (const slug of ['crush', 'guess']) {
        const senses = sensesOf(production.get(slug));
        assert.equal(senses.length, 3, slug);
        assert.deepEqual(senses.map((s) => s.definition), records.get(slug).senses.map((s) => s.definition.text), slug + ' learner-first order');
    }
});

scenario('no rejected R6C candidate and no provenance reaches any production page', () => {
    const report = lib.readJson(path.join(root, r6c.REPORT_PATH));
    for (const slug of COHORT) {
        const html = production.get(slug);
        const defs = new Set(sensesOf(html).map((s) => s.definition));
        for (const rejected of report.words.find((w) => w.lemma === slug).candidates.filter((c) => c.decision === 'REJECTED')) assert.ok(!defs.has(rejected.definition), slug + ': ' + rejected.definition);
        for (const marker of ['OVIDHAN_EDITORIAL', 'v1_revision', 'v1_primary', 'editorial_enrichment', 'archive_sha256', 'source_page_sha256', 'record_status', 'cleanup_manifest', 'quoted_examples', 'oewn-2025']) assert.ok(!html.includes(marker), slug + ' leaks ' + marker);
    }
});

scenario('rendering is deterministic and flows from the record; the renderer source holds no lexical content', () => {
    for (const slug of COHORT) assert.equal(render.renderProductionPage(records.get(slug), { shell }), production.get(slug));
    const edited = clone(records.get('tough'));
    edited.senses[2].bangla_meaning.display = 'পরীক্ষামূলক অর্থ';
    assert.ok(render.renderPage(edited, { mode: 'production', shell }).includes('পরীক্ষামূলক অর্থ'));
    // an invalid record can never reach the pages: the plan validates all 12 records first
    const broken = new Map([...records].map(([k, v]) => [k, clone(v)]));
    delete broken.get('tough').senses[2].bangla_explanation;
    const dir = makeBaselineDir();
    try {
        const planned = planFor(dir, { records: broken });
        assert.equal(planned.ok, false);
        assert.ok(planned.errors.some((e) => e.includes('records_valid')));
        assert.equal(r6e.applyPlanned(planned, r6e.makeFsIo(dir)).ok, false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    const source = fs.readFileSync(path.join(root, 'scripts/dictionary-v2/render.js'), 'utf8');
    for (const slug of COHORT) for (const sense of records.get(slug).senses) assert.ok(!source.includes(sense.definition.text) && !source.includes(sense.examples[0].en));
});

// =================================================================== plan / apply workflow on throw-away copies
scenario('plan on the 12 V1 baseline pages passes: BEFORE hashes locked, exactly the 12 word files would change', () => {
    for (const eol of ['CRLF', 'LF']) {
        const dir = makeBaselineDir(eol);
        try {
            const before = snapshot(dir);
            const planned = planFor(dir);
            assert.equal(planned.ok, true, planned.errors.join('; '));
            assert.equal(planned.state, 'V1_BASELINE');
            assert.deepEqual(planned.pages.map((p) => p.slug), COHORT);
            assert.ok(planned.pages.every((p) => p.state === 'V1_BASELINE' && p.eol === eol));
            for (const p of planned.pages) assert.equal(p.expectedRaw, r6e.withEol(production.get(p.slug), eol));
            assert.equal(planned.checks.scope_exactly_12_word_files.ok, true);
            assert.equal(planned.checks.sense_total_31.ok, true);
            assert.deepEqual(snapshot(dir), before, 'planning writes nothing');
        } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
});

scenario('guarded apply: all 12 pages are written atomically with their line endings kept; every other file is untouched', () => {
    const dir = makeBaselineDir('CRLF');
    try {
        const before = snapshot(dir);
        const planned = planFor(dir);
        const outcome = r6e.applyPlanned(planned, r6e.makeFsIo(dir));
        assert.equal(outcome.ok, true, outcome.errors.join('; '));
        assert.deepEqual(outcome.written, COHORT);
        const after = snapshot(dir);
        assert.deepEqual(Object.keys(after), Object.keys(before), 'no staging file or extra file is left');
        const changed = Object.keys(after).filter((f) => after[f] !== before[f]).sort();
        assert.deepEqual(changed, COHORT.map((s) => s + '.html').sort(), 'exactly the 12 allowlisted pages changed');
        for (const slug of COHORT) {
            assert.equal(after[slug + '.html'], r6e.withEol(production.get(slug), 'CRLF'), slug + ' equals the expected CRLF output');
            assert.equal(r6e.hashLf(after[slug + '.html']), r6e.loadManifest(root).pages.find((p) => p.slug === slug).v2_after_sha256_lf, slug + ' AFTER hash equals the manifest');
        }
        assert.equal(after['lunch.html'], before['lunch.html']);
        assert.equal(after['exercise.html'], before['exercise.html']);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

scenario('a second apply is refused and writes nothing once the pages are at the expected output', () => {
    const dir = makeBaselineDir('CRLF');
    try {
        assert.equal(r6e.applyPlanned(planFor(dir), r6e.makeFsIo(dir)).ok, true);
        const after = snapshot(dir);
        const again = planFor(dir);
        assert.equal(again.state, 'V2_APPLIED');
        assert.equal(again.ok, false);
        assert.ok(again.errors.some((e) => e.includes('ALREADY_APPLIED')));
        const outcome = r6e.applyPlanned(again, r6e.makeFsIo(dir));
        assert.equal(outcome.ok, false);
        assert.deepEqual(snapshot(dir), after, 'nothing written');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

scenario('any BEFORE-hash mismatch, mixed state or tampered V1 page refuses the whole apply', () => {
    for (const mutate of [
        (dir) => fs.appendFileSync(path.join(dir, 'tough.html'), '<!-- drift -->\r\n'),
        (dir) => fs.writeFileSync(path.join(dir, 'waist.html'), fs.readFileSync(path.join(dir, 'waist.html'), 'utf8').replace('waist meaning in Bangla', 'waist meaning')),
        (dir) => fs.writeFileSync(path.join(dir, 'guess.html'), r6e.withEol(production.get('guess'), 'CRLF'))
    ]) {
        const dir = makeBaselineDir('CRLF');
        try {
            mutate(dir);
            const before = snapshot(dir);
            const planned = planFor(dir);
            assert.equal(planned.ok, false);
            const outcome = r6e.applyPlanned(planned, r6e.makeFsIo(dir));
            assert.equal(outcome.ok, false);
            assert.deepEqual(snapshot(dir), before, 'nothing written');
        } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
    // a V1 baseline page that lost its shared shell or canonical would fail the invariants too
    const v1 = r6e.v1BaselinePage(root, 'good');
    assert.deepEqual(r6e.v1BaselineProblems(v1, 'good'), []);
    assert.ok(r6e.v1BaselineProblems(v1.replace(/<link rel="canonical"[^>]*>/, ''), 'good').length > 0);
    assert.ok(r6e.v1BaselineProblems(v1.replace('<footer', '<footer data-x="1"'), 'good').length > 0 || r6e.v1BaselineProblems(v1.replace('id="wordInput"', 'id="other"'), 'good').length > 0);
});

scenario('atomicity: a failure while committing rolls every page back to its exact original bytes and leaves no staging file', () => {
    for (const failAt of [0, 4, 11]) {
        const dir = makeBaselineDir('CRLF');
        try {
            const before = snapshot(dir);
            const io = r6e.makeFsIo(dir);
            let calls = 0;
            const flaky = { ...io, commit(slug) { if (calls++ === failAt) throw new Error('disk full'); return io.commit(slug); } };
            const outcome = r6e.applyPlanned(planFor(dir), flaky);
            assert.equal(outcome.ok, false);
            assert.deepEqual(outcome.unrestored, []);
            assert.deepEqual(snapshot(dir), before, 'failAt ' + failAt + ': all pages restored byte-for-byte');
        } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
    const dir = makeBaselineDir('CRLF');
    try {
        const before = snapshot(dir);
        const io = r6e.makeFsIo(dir);
        const outcome = r6e.applyPlanned(planFor(dir), { ...io, readStaged: (slug) => io.readStaged(slug) + (slug === 'repeat' ? ' ' : '') });
        assert.equal(outcome.ok, false);
        assert.deepEqual(snapshot(dir), before, 'a bad staged file stops the apply before any page is replaced');
        const corrupting = { ...io, commit(slug) { io.commit(slug); if (slug === 'savage') fs.appendFileSync(path.join(dir, 'savage.html'), 'x'); } };
        const second = r6e.applyPlanned(planFor(dir), corrupting);
        assert.equal(second.ok, false);
        assert.deepEqual(snapshot(dir), before, 'post-write verification failure rolls everything back');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

scenario('CLI: apply needs the exact confirmation token; arguments cannot name other words, paths or globs', () => {
    const run = (args) => { try { return { status: 0, out: execFileSync(process.execPath, ['scripts/dictionary-v2/r6e.js', ...args], { cwd: root, encoding: 'utf8', stdio: 'pipe' }) }; } catch (e) { return { status: e.status, out: String(e.stderr) + String(e.stdout) }; } };
    const wordsBefore = gitLines(['status', '--porcelain', '--', 'word']);
    for (const args of [['apply'], ['apply', '--confirm', 'yes'], ['apply', '--confirm', 'apply_r6e_12_v2_pilot'], ['apply', '--confirm', 'APPLY_R6E_12_V2_PILOT ', 'x'], ['apply', '--confirm', 'APPLY_R6E_12_V2_PILOT', '--slug', 'lunch'], ['apply', 'word/*.html'], ['apply', '--confirm', 'APPLY_R6E_12_V2_PILOT', '--word=lunch']]) {
        const result = run(args);
        assert.notEqual(result.status, 0, args.join(' '));
    }
    assert.match(run(['apply']).out, /APPLY_R6E_12_V2_PILOT/);
    assert.deepEqual(gitLines(['status', '--porcelain', '--', 'word']), wordsBefore, 'refused commands wrote nothing');
});

// =================================================================== the real repository after the local pilot
scenario('REAL repository: the 12 pages are at the expected V2 production output, verified against the manifest', () => {
    const planned = r6e.plan({ root, ctx, records, expectBefore: false });
    assert.equal(planned.state, 'V2_APPLIED', planned.errors.join('; '));
    assert.equal(planned.ok, true, planned.errors.join('; '));
    for (const slug of COHORT) {
        const live = fs.readFileSync(path.join(root, 'word', slug + '.html'), 'utf8');
        assert.equal(live, r6e.withEol(production.get(slug), r6e.eolOf(live)), slug);
        assert.ok(lib.isV2ProductionPage(live));
    }
    assert.equal(r6e.verify({ root }).ok, true, r6e.verify({ root }).errors.join('; '));
    const manifest = r6e.loadManifest(root);
    assert.equal(manifest.totals.senses, 31);
    assert.deepEqual(manifest.allowlist, COHORT);
});

scenario('REAL repository: exactly the 12 allowlisted word pages differ from the V1 baseline; every other word page is identical', () => {
    const changedWord = gitLines(['diff', '--name-only', lib.V1_BASELINE_COMMIT, '--', 'word']).sort();
    assert.deepEqual(changedWord, COHORT.map((s) => 'word/' + s + '.html').sort());
    assert.deepEqual(gitLines(['ls-files', '--others', '--exclude-standard', '--', 'word']), []);
    for (const slug of FROZEN_PAGES) assert.equal(gitOut(['diff', '--name-only', lib.V1_BASELINE_COMMIT, '--', 'word/' + slug + '.html']).trim(), '', slug + ' frozen page unchanged');
    assert.equal(gitLines(['diff', '--name-only', lib.V1_BASELINE_COMMIT, '--', 'word']).filter((p) => FROZEN_PAGES.some((s) => p === 'word/' + s + '.html')).length, 0);
});

scenario('REAL repository: registry, sitemaps, robots, dictionary/A-Z, explorer, deploy script, R6C records and previews are unchanged', () => {
    const files = PROTECTED_FILES.concat(fs.readdirSync(root).filter((f) => /^dictionary.*\.html$/.test(f) || /^sitemap.*\.xml$/.test(f)));
    const unique = [...new Set(files)].filter((f) => fs.existsSync(path.join(root, f)));
    assert.ok(unique.length >= 9);
    assert.deepEqual(gitLines(['diff', '--name-only', lib.V1_BASELINE_COMMIT, '--', ...unique]), [], 'protected files unchanged');
    assert.deepEqual(gitLines(['diff', '--name-only', lib.V1_BASELINE_COMMIT, '--', 'dictionary-v2/records', 'dictionary-v2/previews', 'dictionary-v2/r6c-editorial-source.json', 'dictionary-v2/r6c-editorial-report.json', 'dictionary-v2/oewn-2025-synset-lock.json', 'dictionary-v2/dictionary-v2.schema.json', 'data']), []);
    const registry = JSON.parse(readUtf8('data/approved-static-word-slugs.json'));
    const slugs = Array.isArray(registry) ? registry : registry.slugs || registry.words;
    assert.ok(slugs.length > 2000);
    for (const f of fs.readdirSync(root).filter((x) => /^sitemap.*\.xml$/.test(x))) assert.ok(!/dictionary-v2/.test(readUtf8(f)), f);
    assert.ok(!/dictionary-v2/.test(readUtf8('robots.txt')) && !/dictionary-v2/.test(readUtf8('deploy-production.ps1')));
    assert.equal(r6e.PROTECTED.some((re) => re.test('word/good.html')), false, 'word/ pages are governed by the allowlist, not the protected list');
    assert.deepEqual(gitLines(['status', '--porcelain', '--', '.wrangler', 'OVIDHAN_APPROVED_2326_WORDS.txt', 'research']).filter((l) => !l.startsWith('??')), []);
});

scenario('REAL repository: the guarded workflow uses the git V1 view so V1 tooling still works on the V2 pages', () => {
    for (const slug of COHORT) {
        const v1 = lib.readV1Page(slug);
        assert.ok(!lib.isV2ProductionPage(v1), slug + ' V1 view is the baseline page');
        assert.equal(v1, r6e.v1BaselinePage(root, slug));
    }
    const out = execFileSync(process.execPath, ['scripts/dictionary-v2/check-v1-parity.js'], { cwd: root, encoding: 'utf8' });
    assert.match(out, /FAIL: 0|0 FAIL|failed: 0/i);
});

console.log('All dictionary-v2 R6E production pilot tests passed.');
