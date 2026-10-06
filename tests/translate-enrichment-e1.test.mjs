'use strict';
// Phase E1: compact Translate enrichment lookup contracts.
// Run: node tests/translate-enrichment-e1.test.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const builder = require('../scripts/translate/build-enrichment-v1.js');
const phraseLib = require('../scripts/phrase/lib.js');

const EXPECTED_WORD_COUNT = 49710;
const BASELINE_DICT_HASH = 'e12bb34469d696b2d7595f297159b7558db3e3f4c662ba4750efdd4aa813c5e3';
const OUT_PATH = path.join(root, 'data', 'translate-enrichment-v1.json');
const MAX_ASSET_BYTES = 400 * 1024;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BENGALI_RE = /[\u0980-\u09FF]/;

function scenario(name, fn) {
    try {
        fn();
        console.log('PASS', name);
    } catch (error) {
        console.error('FAIL', name);
        throw error;
    }
}

function sha256File(filePath) {
    return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha256Text(text) {
    return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

scenario('generated JSON parses with version 1 and non-empty dictionary', () => {
    assert.equal(fs.existsSync(OUT_PATH), true, 'missing data/translate-enrichment-v1.json — run the builder first');
    const raw = fs.readFileSync(OUT_PATH, 'utf8');
    const data = JSON.parse(raw);
    assert.equal(data.version, 1);
    assert.equal(typeof data.dictionary, 'object');
    assert.equal(Array.isArray(data.phrases), true);
    assert.ok(Object.keys(data.dictionary).length > 0);
    assert.deepEqual(Object.keys(data).sort(), ['dictionary', 'phrases', 'version']);
});

scenario('every dictionary slug is approved, unique, page-backed, and has Bangla', () => {
    const data = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    const approved = new Set(JSON.parse(fs.readFileSync(path.join(root, 'data', 'approved-static-word-slugs.json'), 'utf8')));
    const keys = Object.keys(data.dictionary);
    assert.equal(keys.length, new Set(keys).size);

    for (const key of keys) {
        const entry = data.dictionary[key];
        assert.equal(key, entry.slug);
        assert.equal(SLUG_RE.test(entry.slug), true, entry.slug);
        assert.equal(approved.has(entry.slug), true, 'not approved: ' + entry.slug);
        assert.equal(fs.existsSync(path.join(root, 'word', entry.slug + '.html')), true, entry.slug);
        assert.equal(typeof entry.bn, 'string');
        assert.ok(entry.bn.trim().length > 0, entry.slug);
        assert.match(entry.bn, BENGALI_RE);
        assert.equal(/[<>]|https?:\/\/|www\./i.test(entry.bn), false, entry.slug);
        if ('pos' in entry) {
            assert.equal(typeof entry.pos, 'string');
            assert.ok(entry.pos.trim().length > 0);
        }
        assert.deepEqual(Object.keys(entry).sort().filter((k) => k !== 'pos'), ['bn', 'slug']);
    }
});

scenario('emitted dictionary slugs cannot escape /word/', () => {
    const data = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    for (const entry of Object.values(data.dictionary)) {
        assert.equal(entry.slug.includes('..'), false);
        assert.equal(entry.slug.includes('/') || entry.slug.includes('\\'), false);
        const href = '/word/' + entry.slug + '.html';
        assert.match(href, /^\/word\/[a-z0-9]+(?:-[a-z0-9]+)*\.html$/);
        const resolved = path.resolve(path.join(root, 'word'), entry.slug + '.html');
        assert.equal(resolved.startsWith(path.resolve(root, 'word') + path.sep), true);
    }
});

scenario('phrases match exactly the current released set and pages exist', () => {
    const data = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    const allowlist = phraseLib.loadAllowlist(root);
    const released = [...phraseLib.releasedSlugs(root, allowlist)].sort();
    const emitted = data.phrases.map((item) => item.slug).sort();
    assert.deepEqual(emitted, released);
    assert.equal(data.phrases.length, released.length);
    assert.equal(data.phrases.length, 6);

    const allowlistOnly = allowlist.slugs.filter((slug) => !released.includes(slug));
    for (const slug of allowlistOnly) {
        assert.equal(emitted.includes(slug), false, 'unreleased T1 phrase leaked: ' + slug);
    }

    for (const item of data.phrases) {
        assert.equal(SLUG_RE.test(item.slug), true);
        assert.equal(fs.existsSync(path.join(root, 'phrase', item.slug + '.html')), true, item.slug);
        assert.equal(typeof item.phrase, 'string');
        assert.equal(typeof item.display, 'string');
        assert.equal(typeof item.bn, 'string');
        assert.ok(item.phrase.trim().length > 0);
        assert.ok(item.display.trim().length > 0);
        assert.ok(item.bn.trim().length > 0);
        assert.match(item.bn, BENGALI_RE);
        assert.deepEqual(Object.keys(item).sort(), ['bn', 'display', 'phrase', 'slug']);
    }
});

scenario('asset contains no secrets, API keys, or user-translation fields', () => {
    const raw = fs.readFileSync(OUT_PATH, 'utf8');
    const lower = raw.toLowerCase();
    for (const needle of [
        'api_key', 'apikey', 'authorization', 'google_translate', 'bearer ',
        'sk-', 'client_secret', 'user translation', 'source text'
    ]) {
        assert.equal(lower.includes(needle), false, needle);
    }
    const data = JSON.parse(raw);
    assert.equal('text' in data, false);
    assert.equal('translation' in data, false);
    assert.equal('examples' in data, false);
    assert.equal('synonyms' in data, false);
});

scenario('compact asset stays under hard size ceiling', () => {
    const bytes = fs.statSync(OUT_PATH).size;
    assert.ok(bytes > 1024, 'asset unexpectedly tiny');
    assert.ok(bytes <= MAX_ASSET_BYTES, 'asset too large: ' + bytes);
});

scenario('deterministic generation: two builds yield identical SHA-256', () => {
    const first = builder.build({ root, write: false });
    const second = builder.build({ root, write: false });
    assert.equal(sha256Text(first.text), sha256Text(second.text));
    assert.equal(first.report.sha256, second.report.sha256);
    assert.equal(first.text, fs.readFileSync(OUT_PATH, 'utf8'));
});

scenario('tracked word count and production dictionary hash remain unchanged', () => {
    const wordCount = fs.readdirSync(path.join(root, 'word')).filter((name) => name.endsWith('.html')).length;
    assert.equal(wordCount, EXPECTED_WORD_COUNT);

    const tmp = fs.mkdtempSync(path.join(root, 'tmp-e1-dict-'));
    try {
        const out = path.join(tmp, 'enriched-dictionary.json');
        execFileSync(process.execPath, [
            path.join(root, 'scripts', 'minify-production-dictionary.js'),
            path.join(root, 'enriched-dictionary.json'),
            out
        ], { cwd: root, stdio: 'pipe' });
        assert.equal(sha256File(out), BASELINE_DICT_HASH);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

scenario('E1 does not modify protected product files', () => {
    const protectedDiff = execFileSync('git', [
        'diff', '--name-only', 'HEAD', '--',
        'translate.html', 'worker', 'sitemap.xml', 'robots.txt',
        'phrase', 'word', 'deploy-production.ps1'
    ], { cwd: root, encoding: 'utf8' }).trim();
    assert.equal(protectedDiff, '');
});

console.log('All Phase-E1 translate enrichment checks passed.');
