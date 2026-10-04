#!/usr/bin/env node
'use strict';

/*
 * SEO-R5A: static A-Z discovery pages and approved-word sitemap.
 *
 * Source of truth: data/approved-static-word-slugs.json
 * Outputs (repo root):
 *   dictionary-az.html            hub linking to every available letter page
 *   dictionary-az-<letter>.html   one page per initial letter present in the registry
 *   sitemap-approved-words.xml    exactly the approved /word/<slug>.html URLs
 *
 * The header and footer markup is copied from an existing approved word page so
 * the new pages use the production chrome. No word page is modified.
 *
 * Usage:
 *   node scripts/generate-dictionary-az.js           write files
 *   node scripts/generate-dictionary-az.js --check   verify files are up to date
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const BASE = 'https://ovidhan.net';
const CHROME_SOURCE = 'word/pillion.html';
const check = process.argv.includes('--check');

function readText(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
}

function loadRegistry() {
  const registry = JSON.parse(readText('data/approved-static-word-slugs.json'));
  if (!Array.isArray(registry)) throw new Error('Registry must be an array.');
  const seen = new Set();
  for (const slug of registry) {
    if (typeof slug !== 'string' || !/^[a-z]+$/.test(slug)) throw new Error(`Malformed slug: ${JSON.stringify(slug)}`);
    if (seen.has(slug)) throw new Error(`Duplicate slug: ${slug}`);
    seen.add(slug);
  }
  return [...seen].sort();
}

function extractChrome() {
  const html = readText(CHROME_SOURCE);
  const headerStart = html.indexOf('<!-- ');
  const bodyStart = html.indexOf('<body>');
  const headerOpen = html.indexOf('<header class="site-header">');
  const mainStart = html.indexOf('<main>');
  const styleEnd = html.lastIndexOf('</style>', mainStart);
  const footerStart = html.indexOf('<footer class="site-footer">');
  const footerEnd = html.indexOf('</footer>', footerStart);
  if ([headerStart, bodyStart, headerOpen, mainStart, styleEnd, footerStart, footerEnd].some((n) => n < 0)) {
    throw new Error('Unable to extract header/footer from ' + CHROME_SOURCE);
  }
  const header = html.slice(html.indexOf('\n', bodyStart) + 1, styleEnd + '</style>'.length);
  const footer = html.slice(footerStart, footerEnd + '</footer>'.length);
  if (/pillion/i.test(header) || /pillion/i.test(footer)) throw new Error('Chrome contains page-specific content.');
  return { header, footer };
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const letterUrl = (letter) => `/dictionary-az-${letter}.html`;
const wordUrl = (slug) => `/word/${slug}.html`;

const PAGE_STYLE = `<style>
    .az-page { max-width: 1100px; margin: 0 auto; padding: 2rem 20px 3rem; color: var(--text); }
    .az-page h1 { color: var(--gold); margin-bottom: 0.75rem; }
    .az-page p { color: var(--text-mid); line-height: 1.7; margin-bottom: 1rem; }
    .az-page a { color: var(--teal); text-decoration: none; }
    .az-page a:hover { color: var(--gold); text-decoration: underline; }
    .az-breadcrumb { font-size: 0.9rem; margin-bottom: 1rem; }
    .az-letters { display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; padding: 0; margin: 1rem 0 1.5rem; }
    .az-letters a, .az-letters span { display: inline-block; min-width: 2.4rem; text-align: center; padding: 0.4rem 0.7rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
    .az-letters span { background: var(--gold-dim); color: var(--gold); border-color: var(--gold); font-weight: 700; }
    .az-letter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; list-style: none; padding: 0; margin: 1rem 0 2rem; }
    .az-letter-grid a { display: block; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
    .az-letter-grid small { display: block; color: var(--text-soft); }
    .az-words { list-style: none; padding: 0; margin: 1rem 0 2rem; columns: 4 160px; column-gap: 1.5rem; }
    .az-words li { break-inside: avoid; padding: 0.2rem 0; }
</style>`;

function pageShell({ title, description, canonicalPath, breadcrumb, chrome, body }) {
  const canonical = BASE + canonicalPath;
  const crumbs = breadcrumb.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: BASE + c.path }));
  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs }, null, 2);
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Hind+Siliguri:wght@400;600;700&amp;display=swap">
    <link rel="stylesheet" href="/styles.css">
    <link rel="canonical" href="${canonical}">
    <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
${chrome.header}
${PAGE_STYLE}
<main class="az-page">
${body}
</main>
${chrome.footer}
</body>
</html>
`;
}

function buildFiles() {
  const slugs = loadRegistry();
  const chrome = extractChrome();
  const byLetter = new Map();
  for (const slug of slugs) {
    const letter = slug[0];
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter).push(slug);
  }
  const letters = [...byLetter.keys()].sort();
  const files = new Map();

  const hubBody = `<nav class="az-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/dictionary.html">Dictionary</a> &rsaquo; A-Z</nav>
<h1>English to Bangla Dictionary A-Z</h1>
<p>This is the A-Z index of the Ovidhan English-Bangla dictionary. Choose a letter to browse ${slugs.length.toLocaleString('en-US')} English words, each with its own page showing the Bangla meaning, English definition and an example sentence.</p>
<h2>Browse by letter</h2>
<ul class="az-letter-grid">
${letters.map((l) => `    <li><a href="${letterUrl(l)}">${l.toUpperCase()}<small>${byLetter.get(l).length} words</small></a></li>`).join('\n')}
</ul>
<p>Looking for a word that is not listed? Use the <a href="/dictionary.html">dictionary search</a>.</p>`;
  files.set('dictionary-az.html', pageShell({
    title: 'English to Bangla Dictionary A-Z | Ovidhan',
    description: `Browse the A-Z English to Bangla dictionary on Ovidhan: ${slugs.length} English words with Bangla meanings, definitions and examples, listed by letter.`,
    canonicalPath: '/dictionary-az.html',
    breadcrumb: [{ name: 'Home', path: '/' }, { name: 'Dictionary', path: '/dictionary.html' }, { name: 'A-Z', path: '/dictionary-az.html' }],
    chrome,
    body: hubBody
  }));

  for (const letter of letters) {
    const words = byLetter.get(letter);
    const upper = letter.toUpperCase();
    const nav = `<ul class="az-letters" aria-label="Browse other letters">
${letters.map((l) => (l === letter ? `    <li><span aria-current="page">${l.toUpperCase()}</span></li>` : `    <li><a href="${letterUrl(l)}">${l.toUpperCase()}</a></li>`)).join('\n')}
</ul>`;
    const body = `<nav class="az-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/dictionary.html">Dictionary</a> &rsaquo; <a href="/dictionary-az.html">A-Z</a> &rsaquo; ${upper}</nav>
<h1>English words starting with ${upper}</h1>
<p>${words.length} English ${words.length === 1 ? 'word' : 'words'} starting with ${upper}, each linked to its Bangla meaning page. Return to the <a href="/dictionary-az.html">full A-Z dictionary index</a>.</p>
${nav}
<ul class="az-words">
${words.map((s) => `    <li><a href="${wordUrl(s)}">${s}</a></li>`).join('\n')}
</ul>
${nav}
<p><a href="/dictionary-az.html">&larr; Back to the A-Z dictionary</a></p>`;
    files.set(`dictionary-az-${letter}.html`, pageShell({
      title: `English Words Starting with ${upper} - Bangla Meanings | Ovidhan`,
      description: `English words starting with ${upper} with Bangla meanings: ${words.length} dictionary pages in the Ovidhan A-Z English-Bangla dictionary.`,
      canonicalPath: letterUrl(letter),
      breadcrumb: [{ name: 'Home', path: '/' }, { name: 'Dictionary', path: '/dictionary.html' }, { name: 'A-Z', path: '/dictionary-az.html' }, { name: upper, path: letterUrl(letter) }],
      chrome,
      body
    }));
  }

  const sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    .concat(slugs.map((s) => `  <url><loc>${BASE}${wordUrl(s)}</loc></url>`))
    .concat(['</urlset>', '']).join('\n');
  files.set('sitemap-approved-words.xml', sitemap);
  return { files, letters, slugs };
}

const { files, letters, slugs } = buildFiles();
let stale = 0;
for (const [rel, content] of files) {
  const target = path.join(root, rel);
  if (check) {
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
    if (current !== content) { stale++; console.error('STALE: ' + rel); }
  } else {
    fs.writeFileSync(target, content, 'utf8');
  }
}
if (check) {
  if (stale) { console.error(`${stale} generated file(s) out of date.`); process.exit(1); }
  console.log(`OK: ${files.size} generated files up to date (${letters.length} letters, ${slugs.length} words).`);
} else {
  console.log(`Wrote ${files.size} files (${letters.length} letter pages, ${slugs.length} sitemap URLs).`);
}
