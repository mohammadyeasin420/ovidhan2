'use strict';
// Shared helpers for the isolated Phrase T1 system.
// No third-party dependencies. Never writes under word/.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data', 'phrase-t1');
const RECORDS_DIR = path.join(DATA_DIR, 'records');
const OUTPUT_DIR = path.join(ROOT, 'phrase');
const ALLOWLIST_PATH = path.join(DATA_DIR, 'allowlist.json');
const CSS_PATH = path.join(__dirname, 'phrase-entry.css');
const COHORT = 'PHRASE-T1-30';
const SITE = 'https://ovidhan.net';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SHELL = Object.freeze({
    source: 'word/lunch.html',
    headerStart: '<!-- ═══ HEADER TEMPLATE ═══ -->',
    mainStart: '    <main>',
    footerStart: '<footer class="site-footer">',
    footerEnd: '</footer>',
    headerSha256: '15cdf6417643daf3836ed5bdc2deeb3c5945023c64a71f8289ba3b001049cdf5',
    footerSha256: 'f5abc6d0a1407ca8593de84f2308f1b1109ba2be6c81266b2e3aa90a91cd147a'
});

const BREADCRUMB_PARENT = Object.freeze({
    name: 'Real-Life English',
    href: '/real-life-english.html',
    url: SITE + '/real-life-english.html'
});

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const stripBom = (text) => text.replace(/^\uFEFF/, '');
const toLf = (text) => text.replace(/\r\n/g, '\n');
const readText = (file) => stripBom(fs.readFileSync(file, 'utf8'));
const readJson = (file) => JSON.parse(readText(file));

function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
        return out;
    }
    return value;
}

const canonicalJson = (value) => JSON.stringify(sortKeys(value), null, 2) + '\n';
const esc = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function loadAllowlist(root = ROOT) {
    const file = path.join(root, 'data', 'phrase-t1', 'allowlist.json');
    const data = readJson(file);
    if (data.cohort !== COHORT) throw new Error('allowlist cohort mismatch');
    if (!Array.isArray(data.slugs) || data.slugs.length !== 30 || data.count !== 30) {
        throw new Error('allowlist must contain exactly 30 slugs');
    }
    if (new Set(data.slugs).size !== 30) throw new Error('allowlist has duplicate slugs');
    for (const slug of data.slugs) {
        if (!SLUG_RE.test(slug)) throw new Error('invalid allowlist slug: ' + slug);
    }
    return Object.freeze({
        cohort: data.cohort,
        count: 30,
        slugs: Object.freeze([...data.slugs]),
        indexOf: (slug) => data.slugs.indexOf(slug)
    });
}

function FROZEN_SLUGS() {
    return loadAllowlist().slugs;
}

function recordPath(slug, root = ROOT) {
    return path.join(root, 'data', 'phrase-t1', 'records', slug + '.json');
}

function outputPath(slug, root = ROOT) {
    assertSafeSlug(slug);
    return path.join(root, 'phrase', slug + '.html');
}

function pageUrl(slug) {
    assertSafeSlug(slug);
    return SITE + '/phrase/' + slug + '.html';
}

function assertSafeSlug(slug) {
    if (!SLUG_RE.test(slug)) throw new Error('unsafe slug: ' + slug);
}

function assertOutputPath(filePath, root = ROOT) {
    const resolved = path.resolve(filePath);
    const phraseRoot = path.resolve(path.join(root, 'phrase')) + path.sep;
    if (!resolved.startsWith(phraseRoot) && resolved !== path.resolve(path.join(root, 'phrase'))) {
        throw new Error('output path escapes phrase/: ' + filePath);
    }
    if (resolved.includes(path.sep + 'word' + path.sep) || resolved.endsWith(path.sep + 'word')) {
        throw new Error('refusing word/ path: ' + filePath);
    }
    const base = path.basename(resolved);
    if (!base.endsWith('.html')) throw new Error('output must be .html: ' + filePath);
    const slug = base.slice(0, -5);
    assertSafeSlug(slug);
    return resolved;
}

function loadRecord(slug, root = ROOT) {
    assertSafeSlug(slug);
    return readJson(recordPath(slug, root));
}

function listRecordSlugs(root = ROOT) {
    const dir = path.join(root, 'data', 'phrase-t1', 'records');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((name) => name.endsWith('.json')).map((name) => name.slice(0, -5)).sort();
}

// Reviewed release set: allowlisted slugs that currently have reviewed records.
// Related-phrase hrefs may point only at this set, never at stale HTML alone.
function releasedSlugs(root = ROOT, allowlist = loadAllowlist(root)) {
    const allowed = new Set(allowlist.slugs);
    return Object.freeze(listRecordSlugs(root).filter((slug) => allowed.has(slug)));
}

function extractShell(rawHtml) {
    const html = toLf(rawHtml);
    const hStart = html.indexOf(SHELL.headerStart);
    const mStart = html.indexOf(SHELL.mainStart);
    const fStart = html.indexOf(SHELL.footerStart);
    const fEnd = html.indexOf(SHELL.footerEnd, fStart);
    if (hStart < 0 || mStart < hStart || fStart < mStart || fEnd < fStart) return null;
    return {
        header: html.slice(hStart, mStart),
        footer: html.slice(fStart, fEnd + SHELL.footerEnd.length) + '\n'
    };
}

function loadShell(root = ROOT) {
    const shell = extractShell(readText(path.join(root, SHELL.source)));
    if (!shell) throw new Error('production shell markers not found in ' + SHELL.source);
    const headerSha = sha256(Buffer.from(shell.header, 'utf8'));
    const footerSha = sha256(Buffer.from(shell.footer, 'utf8'));
    if (headerSha !== SHELL.headerSha256) throw new Error('production header shell changed');
    if (footerSha !== SHELL.footerSha256) throw new Error('production footer shell changed');
    return shell;
}

function loadCss(root = ROOT) {
    return toLf(readText(path.join(root, 'scripts', 'phrase', 'phrase-entry.css'))).replace(/\s+$/, '');
}

function wrapMarks(text, { bold = [], italic = [], bn_spans = [] } = {}) {
    let out = esc(text);
    const marks = [];
    for (const value of bold) marks.push({ value, open: '<strong>', close: '</strong>' });
    for (const value of italic) marks.push({ value, open: '<em>', close: '</em>' });
    for (const value of bn_spans) marks.push({ value, open: '<span lang="bn">', close: '</span>' });
    marks.sort((a, b) => b.value.length - a.value.length);
    for (const mark of marks) {
        const needle = esc(mark.value);
        if (!needle) continue;
        const index = out.indexOf(needle);
        if (index < 0) throw new Error('emphasis target missing from text: ' + mark.value);
        out = out.slice(0, index) + mark.open + needle + mark.close + out.slice(index + needle.length);
    }
    return out;
}

function resolveLocalHref(href, root = ROOT) {
    if (!href || typeof href !== 'string') return null;
    if (!href.startsWith('/') || href.startsWith('//')) return null;
    const clean = href.split('#')[0];
    if (!clean || clean === '/') return root;
    return path.join(root, clean.replace(/^\//, '').split('/').join(path.sep));
}

module.exports = {
    ROOT, DATA_DIR, RECORDS_DIR, OUTPUT_DIR, ALLOWLIST_PATH, CSS_PATH, COHORT, SITE, SLUG_RE,
    SHELL, BREADCRUMB_PARENT,
    sha256, stripBom, toLf, readText, readJson, sortKeys, canonicalJson, esc, normalizeText,
    loadAllowlist, FROZEN_SLUGS, recordPath, outputPath, pageUrl, assertSafeSlug, assertOutputPath,
    loadRecord, listRecordSlugs, releasedSlugs, extractShell, loadShell, loadCss, wrapMarks, resolveLocalHref
};
