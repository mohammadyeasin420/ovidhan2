'use strict';
// SEO-R6D: deterministic Dictionary V2 HTML renderer + LOCAL-ONLY visual pilot for the 12 R6C words.
//
//   node scripts/dictionary-v2/render.js build   [--out <dir>]   write the 12 preview pages (default dictionary-v2/previews)
//   node scripts/dictionary-v2/render.js check   [--out <dir>]   fail unless the pages on disk equal the freshly rendered pages
//   node scripts/dictionary-v2/render.js guard   [--base <sha>]   prove R6D changed nothing outside the preview scope
//   node scripts/dictionary-v2/render.js list                    print the cohort, preview paths and sense counts
//
// The renderer is a pure function of (a V2 record, the production page shell). It never reads or writes word/*.html
// other than reading ONE stable production page to reuse the exact header/footer shell. Lexical content comes only from
// dictionary-v2/records/<slug>.json; nothing about a word is written in this file.
//
// Output is deterministic: UTF-8 without BOM, LF line endings, one trailing newline, fixed sense order (the R6C
// learner-first order of record.senses; V1 order is never restored), no timestamps, no randomness.
//
// Two render modes share one body:
//   preview     development only: noindex,nofollow, no canonical, visible DEV banner, asset paths for dictionary-v2/previews/.
//   production  the eventual SEO contract (canonical, indexable). Implemented so the contract can be tested; this phase
//               never writes production pages.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');
const r6c = require('./r6c');
const enrich = require('./r6c-enrich');
const { loadContext, validateRecord } = require('./validate');

const PREVIEW_DIR = 'dictionary-v2/previews';
const BASE_COMMIT = '1dcae77a9d0d2b1bbdf562ea5e370e4255e0763c'; // R6C checkpoint
const SITE = 'https://ovidhan.net';
const RENDERER_VERSION = 'r6d-1';

// The cohort allowlist. Nothing outside it can be rendered by this phase.
const COHORT = Object.freeze([...enrich.COHORT]);

// One stable, non-cohort production page supplies the shared header/footer shell, so the V2 result sits inside the real
// Ovidhan shell and is never re-typed here. The two hashes make a change to the production shell fail closed: it must be
// reviewed, and the previews regenerated, on purpose.
const SHELL = Object.freeze({
    source: 'word/lunch.html',
    headerStart: '<!-- ═══ HEADER TEMPLATE ═══ -->',
    mainStart: '    <main>',
    footerStart: '<footer class="site-footer">',
    footerEnd: '</footer>',
    headerSha256: '15cdf6417643daf3836ed5bdc2deeb3c5945023c64a71f8289ba3b001049cdf5',
    footerSha256: 'f5abc6d0a1407ca8593de84f2308f1b1109ba2be6c81266b2e3aa90a91cd147a'
});

function loadShell(root = lib.ROOT) {
    const html = lib.toLf(lib.readText(path.join(root, SHELL.source)));
    const hStart = html.indexOf(SHELL.headerStart);
    const mStart = html.indexOf(SHELL.mainStart);
    const fStart = html.indexOf(SHELL.footerStart);
    const fEnd = html.indexOf(SHELL.footerEnd, fStart);
    if (hStart < 0 || mStart < hStart || fStart < mStart || fEnd < fStart) throw new Error('production shell markers not found in ' + SHELL.source);
    const header = html.slice(hStart, mStart);
    const footer = html.slice(fStart, fEnd + SHELL.footerEnd.length) + '\n';
    const headerSha = lib.sha256(Buffer.from(header, 'utf8'));
    const footerSha = lib.sha256(Buffer.from(footer, 'utf8'));
    if (headerSha !== SHELL.headerSha256) throw new Error('production header shell changed (sha256 ' + headerSha + '); review it and update SHELL.headerSha256');
    if (footerSha !== SHELL.footerSha256) throw new Error('production footer shell changed (sha256 ' + footerSha + '); review it and update SHELL.footerSha256');
    return { header, footer };
}

const esc = (value) => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);
const jsonLd = (value) => JSON.stringify(value, null, 2).replace(/</g, '\\u003c');

// ------------------------------------------------------------------ structured data
// Approach (documented in dictionary-v2/README.md): ONE JSON-LD @graph with a schema.org DefinedTermSet for the entry and
// ONE DefinedTerm per rendered sense, in the visible order. Every property is read from the record:
//   DefinedTerm.name = headword; .description = the sense's English definition; .alternateName = its concise Bangla meaning;
//   .termCode = the visible sense number; .url/@id = the page URL + #sense-N (the visible anchor).
// A single-sense word is the same shape with one DefinedTerm. No ratings, FAQ, pronunciation, synonyms or POS invention
// (schema.org has no part-of-speech property on DefinedTerm, so POS stays visible-only).
function pageUrl(record) { return SITE + '/word/' + record.slug + '.html'; }

function buildStructuredData(record) {
    const url = pageUrl(record);
    const setId = url + '#entry';
    const terms = record.senses.map((sense, index) => ({
        '@type': 'DefinedTerm',
        '@id': url + '#sense-' + (index + 1),
        name: record.headword,
        termCode: String(index + 1),
        description: sense.definition.text,
        alternateName: sense.bangla_meaning.display,
        url: url + '#sense-' + (index + 1),
        inLanguage: ['en', 'bn'],
        inDefinedTermSet: { '@id': setId }
    }));
    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
            { '@type': 'ListItem', position: 2, name: 'Dictionary', item: SITE + '/dictionary.html' },
            { '@type': 'ListItem', position: 3, name: record.headword, item: url }
        ]
    };
    const definedTerms = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'DefinedTermSet',
                '@id': setId,
                name: record.headword,
                url,
                inLanguage: ['en', 'bn'],
                hasDefinedTerm: terms.map((term) => ({ '@id': term['@id'] }))
            },
            ...terms
        ]
    };
    return { breadcrumb, definedTerms };
}

// ------------------------------------------------------------------ styles
// Scoped to .v2-entry and built only from the existing site tokens (colors, radius, fonts). When the renderer moves to
// production this block moves into styles.css unchanged; it is inlined here so no shared production file is touched.
const CSS = `
    .v2-entry { max-width: 880px; margin: 0 auto; padding: 1.25rem 1.25rem 0.5rem; }
    .v2-breadcrumb ol { list-style: none; display: flex; flex-wrap: wrap; gap: 0.15rem 0.5rem; font-family: var(--font-en); font-size: 0.85rem; color: var(--text-mid); margin: 0 0 0.9rem; }
    .v2-breadcrumb li + li::before { content: "\\203A"; margin-right: 0.5rem; color: var(--text-mid); }
    .v2-breadcrumb a { color: var(--teal); }
    .v2-breadcrumb a:hover { color: var(--gold); }
    .v2-entry h1 { font-family: var(--font-en); font-size: clamp(1.45rem, 4.2vw, 1.9rem); line-height: 1.3; font-weight: 700; color: var(--text); }
    .v2-headword { color: var(--gold); }
    .v2-quick { background: var(--surface); border: 1px solid var(--border); border-left: 4px solid var(--gold); border-radius: var(--radius); padding: 0.9rem 1.25rem 1rem; margin: 0.9rem 0 1.6rem; }
    .v2-kicker { font-family: var(--font-en); font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-mid); }
    .v2-quick-meaning { font-size: clamp(1.7rem, 5.5vw, 2.35rem); line-height: 1.35; font-weight: 700; color: var(--gold); margin: 0.1rem 0 0.35rem; }
    .v2-quick-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-family: var(--font-en); font-size: 0.85rem; color: var(--text-mid); }
    .v2-pos { display: inline-block; background: var(--surface2); border: 1px solid var(--border); border-radius: 20px; padding: 0 0.7rem; color: var(--teal); font-size: 0.8rem; line-height: 1.6; }
    .v2-jump { list-style: none; display: flex; flex-wrap: wrap; gap: 0.4rem 0.5rem; margin: 0.85rem 0 0; padding-top: 0.8rem; border-top: 1px solid var(--border); }
    .v2-jump a { display: inline-flex; align-items: center; gap: 0.4rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 20px; padding: 0.1rem 0.8rem 0.1rem 0.3rem; color: var(--text); font-size: 0.95rem; }
    .v2-jump a:hover { border-color: var(--gold); color: var(--gold); }
    .v2-jump-n, .v2-num { display: inline-flex; align-items: center; justify-content: center; flex: none; min-width: 1.5rem; height: 1.5rem; border-radius: 50%; background: var(--gold); color: #0B1F1A; font-family: var(--font-en); font-weight: 700; font-size: 0.82rem; line-height: 1; }
    .v2-section-title { font-family: var(--font-en); font-size: 1.15rem; font-weight: 600; color: var(--text); margin: 0 0 0.8rem; }
    .v2-senses { list-style: none; display: grid; gap: 1rem; }
    .v2-sense { scroll-margin-top: 5rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.25rem 1.1rem; }
    .v2-sense-title { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.7rem; margin: 0 0 0.7rem; font-weight: 600; font-size: 1.2rem; line-height: 1.4; }
    .v2-sense-pos { font-family: var(--font-en); font-size: 0.85rem; font-weight: 500; color: var(--teal); }
    .v2-sense-bn { color: var(--text); font-size: 1.3rem; font-weight: 700; }
    .v2-detail { display: grid; gap: 0.7rem; }
    .v2-row { display: grid; grid-template-columns: 1fr; gap: 0.1rem; }
    .v2-row dt { font-family: var(--font-en); font-size: 0.78rem; letter-spacing: 0.03em; color: var(--text-mid); }
    .v2-row dd { margin: 0; }
    .v2-def { font-family: var(--font-en); color: var(--text); }
    .v2-example { border-left: 3px solid var(--gold); padding-left: 0.8rem; }
    .v2-example + .v2-example { margin-top: 0.6rem; }
    .v2-example-en { font-family: var(--font-en); color: var(--text); }
    .v2-example-bn { color: var(--text-mid); }
    .v2-source { margin-top: 1.4rem; font-size: 0.8rem; line-height: 1.5; color: var(--text-mid); }
    .v2-source a { color: var(--teal); text-decoration: underline; }
    .v2-entry a:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; border-radius: 4px; }
    .v2-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    @media (min-width: 640px) {
        .v2-entry { padding-top: 1.75rem; }
        .v2-row { grid-template-columns: 8.5rem 1fr; gap: 1rem; }
        .v2-row dt { padding-top: 0.3rem; }
    }
    @media (max-width: 480px) {
        .v2-entry { padding-left: 0.9rem; padding-right: 0.9rem; }
        .v2-quick { padding: 0.8rem 1rem 0.9rem; }
        .v2-sense { padding: 0.85rem 1rem 0.95rem; }
    }
`;

// Only emitted in preview mode: the visible development banner.
const DEV_CSS = `
    .v2-devbar { background: #3a2a06; color: #ffd978; font-family: var(--font-en); font-size: 0.78rem; line-height: 1.4; padding: 0.35rem 1rem; text-align: center; border-bottom: 1px solid #5c4410; }
`;

// ------------------------------------------------------------------ rendering
function renderSenseRows(sense, notes) {
    const rows = [];
    rows.push('<div class="v2-row"><dt>Definition</dt><dd class="v2-def" lang="en">' + esc(sense.definition.text) + '</dd></div>');
    rows.push('<div class="v2-row"><dt lang="bn">বাংলা ব্যাখ্যা</dt><dd lang="bn">' + esc(sense.bangla_explanation.text) + '</dd></div>');
    const examples = sense.examples.map((example) =>
        '<div class="v2-example"><p class="v2-example-en" lang="en">' + esc(example.en) + '</p><p class="v2-example-bn" lang="bn">' + esc(example.bn) + '</p></div>').join('');
    rows.push('<div class="v2-row"><dt>' + (sense.examples.length > 1 ? 'Examples' : 'Example') + '</dt><dd>' + examples + '</dd></div>');
    for (const note of notes) rows.push('<div class="v2-row"><dt lang="bn">ব্যবহার</dt><dd class="v2-note" lang="bn">' + esc(note.text) + '</dd></div>');
    return rows.map((row) => '                    ' + row).join('\n');
}

function renderArticle(record) {
    const senses = record.senses;
    const multi = senses.length > 1;
    const primary = senses[0];
    const notesBySense = new Map();
    for (const note of record.usage_notes || []) {
        if (!notesBySense.has(note.sense_id)) notesBySense.set(note.sense_id, []);
        notesBySense.get(note.sense_id).push(note);
    }
    const a = record.attribution;
    const lines = [];
    lines.push('        <article class="dictionary-answer v2-entry">');
    lines.push('            <nav class="v2-breadcrumb" aria-label="Breadcrumb">');
    lines.push('                <ol>');
    lines.push('                    <li><a href="/">Home</a></li>');
    lines.push('                    <li><a href="/dictionary.html">Dictionary</a></li>');
    lines.push('                    <li><span aria-current="page">' + esc(record.headword) + '</span></li>');
    lines.push('                </ol>');
    lines.push('            </nav>');
    lines.push('            <h1><span class="v2-headword">' + esc(record.headword) + '</span> meaning in Bangla</h1>');
    lines.push('            <section class="v2-quick" aria-label="Quick answer">');
    lines.push('                <p class="v2-kicker">Bangla meaning</p>');
    lines.push('                <p class="v2-quick-meaning" lang="bn">' + esc(primary.bangla_meaning.display) + '</p>');
    lines.push('                <p class="v2-quick-meta"><span class="v2-pos">' + esc(primary.pos) + '</span>' + (multi ? '<span>' + senses.length + ' meanings</span>' : '') + '</p>');
    if (multi) {
        lines.push('                <ol class="v2-jump" role="list" aria-label="Jump to a meaning">');
        senses.forEach((sense, index) => {
            lines.push('                    <li><a href="#sense-' + (index + 1) + '"><span class="v2-jump-n">' + (index + 1) + '</span><span lang="bn">' + esc(sense.bangla_meaning.display) + '</span></a></li>');
        });
        lines.push('                </ol>');
    }
    lines.push('            </section>');
    if (multi) {
        lines.push('            <section class="v2-meanings" aria-labelledby="meanings-title">');
        lines.push('                <h2 class="v2-section-title" id="meanings-title">Meanings</h2>');
        lines.push('                <ol class="v2-senses" role="list">');
        senses.forEach((sense, index) => {
            const n = index + 1;
            lines.push('                    <li class="v2-sense" id="sense-' + n + '">');
            lines.push('                        <h3 class="v2-sense-title"><span class="v2-sr">Meaning </span><span class="v2-num">' + n + '</span><span class="v2-sense-pos">' + esc(sense.pos) + '</span><span class="v2-sense-bn" lang="bn">' + esc(sense.bangla_meaning.display) + '</span></h3>');
            lines.push('                        <dl class="v2-detail">');
            lines.push(renderSenseRows(sense, notesBySense.get(sense.sense_id) || []));
            lines.push('                        </dl>');
            lines.push('                    </li>');
        });
        lines.push('                </ol>');
        lines.push('            </section>');
    } else {
        lines.push('            <section class="v2-meanings" aria-labelledby="meanings-title">');
        lines.push('                <h2 class="v2-section-title" id="meanings-title">Meaning and example</h2>');
        lines.push('                <div class="v2-sense" id="sense-1">');
        lines.push('                    <dl class="v2-detail">');
        lines.push(renderSenseRows(primary, notesBySense.get(primary.sense_id) || []));
        lines.push('                    </dl>');
        lines.push('                </div>');
        lines.push('            </section>');
    }
    lines.push('            <p class="lexical-source v2-source"><small>English definition source: <a href="' + esc(a.source_url) + '" rel="noopener">' + esc(a.definition_source) + '</a>, <a href="' + esc(a.license_url) + '" rel="license noopener">' + esc(a.license) + '</a>. ' + esc(a.editorial_statement) + '</small></p>');
    lines.push('        </article>');
    return lines.join('\n');
}

function renderExplorer(record) {
    return [
        '        <div class="explorer-container" style="padding:2rem;">',
        '            <h2>🔍 Learning Explorer</h2>',
        '            <div class="search-box">',
        '                <input type="text" id="wordInput" aria-label="Type a word" placeholder="Type a word..." value="' + esc(record.headword) + '">',
        '                <button onclick="searchWord()" class="btn-primary">Search</button>',
        '            </div>',
        '            <div id="resultArea"></div>',
        '        </div>'
    ].join('\n');
}

function metaDescription(record) {
    const primary = record.senses[0];
    const head = capitalize(record.headword) + ' meaning in Bangla: ' + primary.bangla_meaning.display + '.';
    if (record.senses.length === 1) return head + ' Learn the ' + primary.pos + ' meaning, English definition, Bangla explanation and an example.';
    return head + ' Learn ' + record.senses.length + ' meanings with English definitions, Bangla explanations and examples.';
}

// mode: 'preview' (default; development only) or 'production' (the eventual indexable contract).
function renderPage(record, { mode = 'preview', shell = loadShell() } = {}) {
    if (!['preview', 'production'].includes(mode)) throw new Error('unknown render mode: ' + mode);
    if (!COHORT.includes(record.slug)) throw new Error('renderer cohort allowlist: ' + record.slug + ' is not one of the 12 R6D words');
    const preview = mode === 'preview';
    const prefix = preview ? '../../' : '../';
    const data = buildStructuredData(record);
    const title = capitalize(record.headword) + ' Meaning in Bangla | Ovidhan';
    const out = [];
    out.push('<!DOCTYPE html>');
    if (preview) out.push('<!-- DEVELOPMENT PREVIEW ONLY (SEO-R6D). Generated by scripts/dictionary-v2/render.js from dictionary-v2/records/' + record.slug + '.json. NOT a production page: noindex,nofollow, no canonical, not in the sitemap or the approved registry, never deployed. -->');
    out.push('<html lang="en">');
    out.push('<head>');
    out.push('    <meta charset="UTF-8">');
    out.push('    <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    out.push('    <title>' + esc(preview ? '[V2 preview] ' + title : title) + '</title>');
    out.push('    <meta name="description" content="' + esc(metaDescription(record)) + '">');
    if (preview) {
        out.push('    <meta name="robots" content="noindex,nofollow">');
        out.push('    <meta name="ovidhan-dev-preview" content="SEO-R6D dictionary-v2 renderer ' + RENDERER_VERSION + '">');
    }
    out.push('    <link rel="stylesheet" href="' + prefix + 'styles.css">');
    if (!preview) out.push('    <link rel="canonical" href="' + pageUrl(record) + '">');
    out.push('    <style id="dictionary-v2-entry-styles">' + (preview ? CSS + DEV_CSS : CSS).replace(/\s+$/, '') + '\n    </style>');
    out.push('    <script type="application/ld+json">' + jsonLd(data.breadcrumb) + '</script>');
    out.push('    <script type="application/ld+json">' + jsonLd(data.definedTerms) + '</script>');
    out.push('</head>');
    out.push('<body>');
    out.push(shell.header.replace(/\n$/, ''));
    out.push('    <main>');
    if (preview) out.push('        <div class="v2-devbar" role="note">Development preview &middot; Dictionary V2 (R6D) &middot; not a production page, not indexed</div>');
    out.push(renderArticle(record));
    out.push(renderExplorer(record));
    out.push('    </main>');
    out.push('    <script src="' + prefix + 'learning-explorer.js"></script>');
    out.push(shell.footer.replace(/\n$/, ''));
    out.push('</body>');
    out.push('</html>');
    return out.join('\n') + '\n';
}

// ------------------------------------------------------------------ build / check
function previewPath(slug) { return PREVIEW_DIR + '/' + slug + '.html'; }

// records: Map slug -> record (injectable for tests). Every record is validated before it is rendered.
function renderCohort({ root = lib.ROOT, ctx = loadContext({ root }), records = r6c.loadRecords(ctx.v2), mode = 'preview', shell = loadShell(root), validate = true } = {}) {
    const rendered = new Map();
    for (const slug of COHORT) {
        const record = records.get(slug);
        if (!record) throw new Error('cohort record missing: ' + slug);
        if (validate) {
            const errors = validateRecord(record, ctx);
            if (errors.length) throw new Error('refusing to render invalid record ' + slug + ': ' + errors[0]);
        }
        rendered.set(slug, renderPage(record, { mode, shell }));
    }
    return rendered;
}

function build({ root = lib.ROOT, out = path.join(root, PREVIEW_DIR) } = {}) {
    const rendered = renderCohort({ root });
    fs.mkdirSync(out, { recursive: true });
    for (const [slug, html] of rendered) fs.writeFileSync(path.join(out, slug + '.html'), html, 'utf8');
    return rendered;
}

// Returns a list of problems (empty = the directory is exactly the freshly rendered cohort).
function check({ root = lib.ROOT, out = path.join(root, PREVIEW_DIR), rendered = renderCohort({ root }) } = {}) {
    const problems = [];
    const expected = new Set([...rendered.keys()].map((slug) => slug + '.html'));
    const actual = fs.existsSync(out) ? fs.readdirSync(out) : [];
    for (const file of actual) if (!expected.has(file)) problems.push('unexpected file in preview directory: ' + file);
    for (const [slug, html] of rendered) {
        const file = path.join(out, slug + '.html');
        if (!fs.existsSync(file)) { problems.push('missing preview: ' + slug + '.html'); continue; }
        const onDisk = fs.readFileSync(file);
        if (onDisk.toString('utf8') !== html || !onDisk.equals(Buffer.from(html, 'utf8'))) problems.push('preview differs from the freshly rendered page: ' + slug + '.html');
    }
    return problems;
}

// ------------------------------------------------------------------ R6D scope guard
// R6D may add the previews, the renderer, its tests and README documentation. It may NOT change the R6C lexical data
// (records, editorial source/report, lock, schema, provenance) or any production file.
const R6D_ALLOWED = [
    new RegExp('^dictionary-v2/previews/(' + COHORT.join('|') + ')\\.html$'), /^dictionary-v2\/README\.md$/,
    /^scripts\/dictionary-v2\/render\.js$/, /^tests\/dictionary-v2-r6d[^/]*\.js$/
];
const R6D_NEVER = [
    /^dictionary-v2\/records\//, /^dictionary-v2\/r6c-editorial-/, /^dictionary-v2\/oewn-2025-/, /^dictionary-v2\/dictionary-v2\.schema\.json$/,
    /^dictionary-v2\/definition-cleanup-manifest\.json$/, /^dictionary-v2\/prototype-cohort\.json$/,
    /^styles\.css$/, /^learning-explorer\.js$/, /^_headers$/, /^_redirects$/, /^index\.html$/
];
function r6dGuardCheck(changedPaths) {
    const errors = [];
    for (const raw of changedPaths) {
        const p = raw.replace(/\\/g, '/');
        if (r6c.NEVER_CHANGE.some((re) => re.test(p))) errors.push('protected production path changed: ' + p);
        else if (R6D_NEVER.some((re) => re.test(p))) errors.push('R6C lexical data or shared asset changed: ' + p);
        else if (!R6D_ALLOWED.some((re) => re.test(p))) errors.push('path outside the R6D scope changed: ' + p);
    }
    return errors;
}

// ------------------------------------------------------------------ CLI
function main() {
    const argv = process.argv.slice(2);
    const command = argv.shift();
    const args = { base: BASE_COMMIT, out: null };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
        else if (argv[i] === '--base') args.base = argv[++i];
        else throw new Error('Unknown argument: ' + argv[i]);
    }
    const out = args.out || path.join(lib.ROOT, PREVIEW_DIR);
    if (command === 'build') {
        const rendered = build({ out });
        console.log('Rendered ' + rendered.size + ' preview pages into ' + path.relative(lib.ROOT, out).replace(/\\/g, '/') + '/ (development only, noindex).');
    } else if (command === 'check') {
        const problems = check({ out });
        if (problems.length) { console.error('R6D CHECK FAILED'); for (const p of problems) console.error('  - ' + p); process.exit(1); }
        console.log('R6D check OK: ' + COHORT.length + ' preview pages are byte-identical to the freshly rendered output.');
    } else if (command === 'guard') {
        const changed = r6c.changedSince(lib.ROOT, args.base);
        const errors = r6dGuardCheck(changed);
        if (errors.length) { console.error('R6D GUARD FAILED'); for (const e of errors) console.error('  - ' + e); process.exit(1); }
        console.log('R6D GUARD OK: ' + changed.length + ' changed/new paths since ' + args.base.slice(0, 10) + ', all inside the R6D scope; zero word/*.html, registry, sitemap, robots.txt, dictionary page, deploy script, R6C data or frozen artifact changes.');
        for (const p of changed) console.log('  ' + p);
    } else if (command === 'list') {
        const records = r6c.loadRecords(path.join(lib.ROOT, 'dictionary-v2'));
        for (const slug of COHORT) console.log(previewPath(slug) + '  ' + records.get(slug).senses.length + ' sense(s)');
    } else {
        throw new Error('Usage: render.js build|check|guard|list (see header)');
    }
}

module.exports = {
    COHORT, PREVIEW_DIR, BASE_COMMIT, SHELL, CSS, DEV_CSS, RENDERER_VERSION,
    loadShell, renderPage, renderCohort, buildStructuredData, metaDescription, build, check, previewPath, r6dGuardCheck, R6D_ALLOWED, R6D_NEVER, pageUrl
};
if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
