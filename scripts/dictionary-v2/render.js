'use strict';
// SEO-R6D: deterministic Dictionary V2 HTML renderer + LOCAL-ONLY visual pilot for the 12 R6C words.
//
//   node scripts/dictionary-v2/render.js build   [--out <dir>]   write the 12 preview pages (default dictionary-v2/previews)
//   node scripts/dictionary-v2/render.js check   [--out <dir>]   fail unless the pages on disk equal the freshly rendered pages
//   node scripts/dictionary-v2/render.js guard   [--base <sha>] [--head <sha>]
//                                                prove R6D changed nothing outside the preview scope. With --head the
//                                                committed range base..head is checked (the closed R6D range is
//                                                1dcae77a9d..b023002b5c); without it the working tree is checked.
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

// The shared header/footer regions of any production word page (LF-normalised), or null when the markers are absent.
function extractShell(rawHtml) {
    const html = lib.toLf(rawHtml);
    const hStart = html.indexOf(SHELL.headerStart);
    const mStart = html.indexOf(SHELL.mainStart);
    const fStart = html.indexOf(SHELL.footerStart);
    const fEnd = html.indexOf(SHELL.footerEnd, fStart);
    if (hStart < 0 || mStart < hStart || fStart < mStart || fEnd < fStart) return null;
    return { header: html.slice(hStart, mStart), footer: html.slice(fStart, fEnd + SHELL.footerEnd.length) + '\n' };
}
const shellHashes = (shell) => ({ header: lib.sha256(Buffer.from(shell.header, 'utf8')), footer: lib.sha256(Buffer.from(shell.footer, 'utf8')) });

function loadShell(root = lib.ROOT) {
    const shell = extractShell(lib.readText(path.join(root, SHELL.source)));
    if (!shell) throw new Error('production shell markers not found in ' + SHELL.source);
    const { header, footer } = shell;
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

// ------------------------------------------------------------------ production mode (SEO-R6E)
// Production pages are generated ONLY for the explicit 12-word R6E allowlist below, by the same renderPage() that writes the
// R6D previews (mode 'production'); there is no second generator. The allowlist is a literal on purpose: it must not widen
// just because the preview cohort does.
const PRODUCTION_COHORT = Object.freeze(['swarm', 'good', 'chaos', 'designation', 'introvert', 'tough', 'savage', 'repeat', 'crush', 'guess', 'potential', 'waist']);
const PRODUCTION_DIR = 'word';
function productionPath(slug) {
    if (!PRODUCTION_COHORT.includes(slug)) throw new Error('R6E production allowlist: ' + slug + ' is not one of the 12 pilot words');
    return PRODUCTION_DIR + '/' + slug + '.html';
}

const DEV_MARKERS = /noindex|nofollow|DEVELOPMENT PREVIEW|ovidhan-dev-preview|v2-devbar|\[V2 preview\]|R6D|<meta name="robots"/;
const FORBIDDEN_LD_KEYS = ['aggregateRating', 'review', 'rating', 'mainEntity', 'acceptedAnswer', 'pronunciation', 'synonym', 'antonym', 'sameAs', 'speakable', 'author', 'datePublished'];
const textOf = (html) => html.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<style\b[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// Everything a production word page must satisfy; returns a list of problems (empty = the page meets the R6E contract).
function productionContractProblems(html, record) {
    const problems = [];
    const need = (condition, message) => { if (!condition) problems.push(message); };
    const count = (re) => (html.match(re) || []).length;
    const url = pageUrl(record);
    const senses = record.senses;
    need(html.startsWith('<!DOCTYPE html>\n<html lang="en">\n<head>'), 'document must start with the production head (no development comment)');
    need(html.endsWith('</html>\n') && !html.includes('\r'), 'LF output with one trailing newline');
    need(!DEV_MARKERS.test(html), 'contains a development/preview/noindex marker');
    need(count(/<link rel="canonical"/g) === 1 && html.includes('<link rel="canonical" href="' + url + '">'), 'exactly one self-referencing canonical ' + url);
    need(count(/<title>/g) === 1 && html.includes('<title>' + capitalize(record.headword) + ' Meaning in Bangla | Ovidhan</title>'), 'production title contract');
    need(html.includes('<meta name="description" content="' + esc(metaDescription(record)) + '">'), 'meta description from the structured record');
    need(html.includes('<link rel="stylesheet" href="../styles.css">') && count(/<script src="\.\.\/learning-explorer\.js"><\/script>/g) === 1, 'production asset paths');
    const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    need(h1s.length === 1 && textOf(h1s[0][1]) === record.headword + ' meaning in Bangla', 'exactly one H1 "<word> meaning in Bangla"');
    const quick = /class="v2-quick-meaning" lang="bn">([^<]*)</.exec(html);
    need(quick && quick[1] === esc(senses[0].bangla_meaning.display), 'primary Bangla answer is the first sense');
    need(html.includes('<span class="v2-pos">' + esc(senses[0].pos) + '</span>'), 'primary part of speech');
    need(count(/class="v2-sense" id="sense-\d+"/g) === senses.length, 'every approved sense is rendered (' + senses.length + ')');
    need(senses.length === 1 ? !html.includes('class="v2-jump"') && !html.includes('class="v2-senses"') : html.includes('class="v2-jump"') && html.includes(senses.length + ' meanings'), 'sense overview present only for multi-sense words');
    let cursor = -1;
    senses.forEach((sense, i) => {
        const checks = [sense.definition.text, sense.bangla_explanation.text, ...sense.examples.flatMap((e) => [e.en, e.bn])];
        const start = html.indexOf('id="sense-' + (i + 1) + '"');
        need(start > cursor, 'sense ' + (i + 1) + ' is rendered in approved order');
        cursor = start;
        for (const part of checks) need(html.indexOf(esc(part), start) > start, 'sense ' + (i + 1) + ' is missing: ' + part);
        if (senses.length > 1) need(html.indexOf('class="v2-sense-bn" lang="bn">' + esc(sense.bangla_meaning.display), start) > start, 'sense ' + (i + 1) + ' Bangla meaning');
    });
    for (const note of record.usage_notes || []) need(html.includes(esc(note.text)), 'usage note present: ' + note.text);
    need(!/class="v2-note"/.test(html) || (record.usage_notes || []).length === count(/class="v2-note"/g), 'no usage line unless the record has one');
    need(count(/class="lexical-source v2-source"/g) === 1 && html.includes('English definition source: <a href="https://en-word.net/" rel="noopener">Open English WordNet 2025</a>, <a href="https://creativecommons.org/licenses/by/4.0/" rel="license noopener">CC BY 4.0</a>.'), 'one compact OEWN attribution');
    need(html.indexOf('</article>') > 0 && html.indexOf('</article>') < html.indexOf('class="explorer-container"') && html.includes('<h2>🔍 Learning Explorer</h2>') && html.includes('id="wordInput"') && html.includes('value="' + esc(record.headword) + '"') && html.includes('<div id="resultArea"></div>'), 'Learning Explorer below the complete static answer');
    need(html.indexOf('</main>') < html.indexOf('learning-explorer.js'), 'explorer script placement matches the production pages');
    need(!/staticWordContent|ovidhan-word-data/.test(html), 'no explorer-hiding hook');
    need(!/\b\d{8}-[nvasr]\b/.test(html) && !/synset|OEWN_|OVIDHAN_EDITORIAL|v1_original|v1_revision|v1_primary|provenance|archive_sha256|record_status| data-/.test(html), 'no internal provenance or synset ids');
    need(!/\bFAQ|aggregateRating|ratingValue|pronunciation|IPA\b/.test(html), 'no fake FAQ, rating or pronunciation');
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    need(blocks.length === 2, 'exactly two JSON-LD blocks (breadcrumb + definitions)');
    let parsed = [];
    try { parsed = blocks.map((b) => JSON.parse(b)); } catch (error) { problems.push('JSON-LD is not valid JSON: ' + error.message); }
    if (parsed.length === 2) {
        const expected = buildStructuredData(record);
        need(JSON.stringify(parsed[0]) === JSON.stringify(expected.breadcrumb), 'BreadcrumbList equals the deterministic breadcrumb');
        need(JSON.stringify(parsed[1]) === JSON.stringify(expected.definedTerms), 'DefinedTermSet/DefinedTerm data equals the deterministic structured data');
        const keys = new Set(); (function walk(v) { if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); } })(parsed[1]);
        for (const key of FORBIDDEN_LD_KEYS) need(!keys.has(key), 'JSON-LD must not contain ' + key);
        const graph = parsed[1]['@graph'] || [];
        need(graph.filter((n) => n['@type'] === 'DefinedTerm').length === senses.length && graph.filter((n) => n['@type'] === 'DefinedTermSet').length === 1, 'one DefinedTermSet and one DefinedTerm per sense');
        need(graph.filter((n) => n['@type'] === 'DefinedTerm').every((n, i) => n.description === senses[i].definition.text && n.alternateName === senses[i].bangla_meaning.display && n.termCode === String(i + 1)), 'DefinedTerms are ordered and equal the visible text');
    }
    return problems;
}

// The only production renderer entry point: allowlist + production mode + contract check.
function renderProductionPage(record, { shell = loadShell() } = {}) {
    productionPath(record.slug); // throws unless the slug is on the R6E allowlist
    const html = renderPage(record, { mode: 'production', shell });
    const problems = productionContractProblems(html, record);
    if (problems.length) throw new Error('production page for ' + record.slug + ' violates the R6E contract: ' + problems.join('; '));
    return html;
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

// Writes PREVIEW pages only. It refuses any output directory inside the production word/ namespace, so a preview-mode page
// (noindex, no canonical, development banner) can never be written into word/.
function assertNotProductionDir(out, root = lib.ROOT) {
    const resolved = path.resolve(out);
    const word = path.resolve(root, PRODUCTION_DIR);
    if (resolved === word || resolved.startsWith(word + path.sep)) throw new Error('refusing to write preview pages into the production word/ namespace: ' + resolved);
}

function build({ root = lib.ROOT, out = path.join(root, PREVIEW_DIR) } = {}) {
    assertNotProductionDir(out, root);
    const rendered = renderCohort({ root, mode: 'preview' });
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
        else if (argv[i] === '--head') args.head = argv[++i];
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
        const changed = r6c.changedSince(lib.ROOT, args.base, args.head);
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
    PRODUCTION_COHORT, PRODUCTION_DIR, productionPath, productionContractProblems, renderProductionPage, assertNotProductionDir,
    extractShell, shellHashes, loadShell, renderPage, renderCohort, buildStructuredData, metaDescription, build, check, previewPath, r6dGuardCheck, R6D_ALLOWED, R6D_NEVER, pageUrl
};
if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
