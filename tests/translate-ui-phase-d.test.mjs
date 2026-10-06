'use strict';
// Phase D: Ovidhan Translate UI contracts.
// Run: node --test tests/translate-ui-phase-d.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pagePath = path.join(root, 'translate.html');
const html = fs.readFileSync(pagePath, 'utf8');
const script = html.match(/<script id="translate-app">([\s\S]*?)<\/script>/)[1];
const EXPECTED_WORD_COUNT = 49710;
const BASELINE_DICT_HASH = 'e12bb34469d696b2d7595f297159b7558db3e3f4c662ba4750efdd4aa813c5e3';
const EXPECTED_PHRASES = [
    'as-your-wish.html',
    'best-of-luck.html',
    'excuse-me.html',
    'mind-it.html',
    'my-pleasure.html',
    'where-are-you-from.html'
];

function sha256File(filePath) {
    return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

test('translate.html exists with required SEO metadata', () => {
    assert.equal(fs.existsSync(pagePath), true);
    assert.match(html, /<title>English ↔ Bangla Translator — Free Online Translation \| Ovidhan<\/title>/);
    assert.match(html, /rel="canonical" href="https:\/\/ovidhan\.net\/translate\.html"/);
    assert.match(html, /<h1>English ↔ Bangla Translator<\/h1>/);
    assert.match(html, /name="robots" content="index,follow"/);
    assert.match(html, /Translate English to Bangla and Bangla to English instantly with Ovidhan/);
    assert.match(html, /"@type": "WebApplication"/);
    assert.match(html, /"@type": "BreadcrumbList"/);
    assert.equal(/"@type": "FAQPage"/.test(html), false);
});

test('UI calls /api/translate only on explicit Translate; never embeds Google credentials', () => {
    assert.match(script, /fetch\(API_URL/);
    assert.match(script, /var API_URL = '\/api\/translate';/);
    assert.match(script, /sourceText\.addEventListener\('input', updateCounterAndButton\)/);
    assert.equal(/sourceText\.addEventListener\('input',\s*translate\)/.test(script), false);
    assert.equal(/translate\.googleapis\.com/i.test(html), false);
    assert.equal(/texttospeech\.googleapis\.com/i.test(html), false);
    assert.equal(/@google-cloud\/translate/i.test(html), false);
    assert.equal(/GOOGLE_TRANSLATE_API_KEY/i.test(html), false);
    assert.equal(/AIza[0-9A-Za-z_\-]{20,}/.test(html), false);
    assert.equal(/elevenlabs|openai\.com\/v1\/audio|api\.cognitive\.microsoft|polly\.aws|azure\.com\/tts/i.test(html), false);
});

test('only en/bn directions and 1000 Unicode code-point limit are exposed', () => {
    assert.match(html, /<option value="en"/);
    assert.match(html, /<option value="bn"/);
    assert.equal(/value="fr"|value="hi"|value="ar"/.test(html), false);
    assert.match(script, /var MAX_CODE_POINTS = 1000;/);
    assert.match(html, /0 \/ 1000/);
    assert.match(script, /function codePointLength\(value\) \{\s*return Array\.from\(String\(value \|\| ''\)\)\.length;/);
});

test('Copy and Listen action group with inline SVG and accessible names', () => {
    assert.match(html, /id="copyBtn"[^>]*aria-label="Copy translation"/);
    assert.match(html, /id="listenBtn"[^>]*aria-label="Listen to translation"/);
    assert.match(html, /id="listenBtn"[\s\S]*?<svg[\s\S]*?<\/svg>[\s\S]*?<span>Listen<\/span>/);
    assert.match(html, /id="copyBtn"[\s\S]*?<svg[\s\S]*?<\/svg>[\s\S]*?<span>Copy<\/span>/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /id="swapBtn"/);
    assert.match(html, /id="translateBtn"/);
    assert.match(html, /class="translate-primary"/);
    assert.match(html, /id="resultText"[^>]*aria-live="polite"/);
    assert.match(html, /id="errorBox"[^>]*role="alert"[^>]*hidden/);
    assert.match(html, /id="statusLine"[^>]*role="status"/);
    assert.match(html, /prefers-reduced-motion/);
});

test('Listen uses browser SpeechSynthesis only and never calls the translate API', () => {
    assert.match(script, /function listenResult\(\)/);
    assert.match(script, /SpeechSynthesisUtterance/);
    assert.match(script, /speechSynthesis\.cancel/);
    assert.match(script, /speechSynthesis\.speak/);
    assert.match(script, /bn-BD/);
    assert.match(script, /en-US/);
    const listenFn = script.match(/function listenResult\(\) \{[\s\S]*?\n    \}/)[0];
    assert.equal(/fetch\(/.test(listenFn), false);
    assert.equal(/API_URL/.test(listenFn), false);
    assert.equal(/new Audio\(/.test(script), false);
    assert.equal(/texttospeech|tts\.|voice\.googleapis|elevenlabs/i.test(script), false);
});

test('privacy and zero-cost non-translate interactions', () => {
    assert.equal(/localStorage/.test(html), false);
    assert.equal(/sessionStorage/.test(html), false);
    assert.equal(/history\.pushState|history\.replaceState/.test(html), false);
    assert.equal(/location\.search|URLSearchParams|location\.hash/.test(html), false);
    assert.equal(/console\.log/.test(html), false);
    assert.equal(/\/translate\/[^"']+/.test(html), false);
    assert.match(script, /if \(inFlight\) return;/);
    assert.match(script, /ctrlKey \|\| event\.metaKey/);
});

test('static learning links point to existing Ovidhan resources', () => {
    const links = [
        '/dictionary.html',
        '/tools.html',
        '/grammar.html',
        '/bangla-to-english-translation-hub.html',
        '/english-to-bangla-dictionary-online-free.html',
        '/phrase/mind-it.html',
        '/privacy.html'
    ];
    for (const href of links) {
        assert.match(html, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.equal(fs.existsSync(path.join(root, href.replace(/^\//, ''))), true, href);
    }
});

test('sitemap and robots remain unmodified by Phase D', () => {
    const diff = execFileSync('git', [
        'diff', '--name-only', 'HEAD', '--', 'sitemap.xml', 'robots.txt'
    ], { cwd: root, encoding: 'utf8' }).trim();
    assert.equal(diff, '');
});

test('dictionary, phrase, worker, and deploy invariance anchors remain intact', () => {
    const tracked = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '--', 'word/*.html'], {
        cwd: root,
        encoding: 'utf8'
    }).split(/\n/).filter(Boolean);
    assert.equal(tracked.length, EXPECTED_WORD_COUNT);

    const phrases = fs.readdirSync(path.join(root, 'phrase'))
        .filter((name) => name.endsWith('.html'))
        .sort();
    assert.deepEqual(phrases, EXPECTED_PHRASES);

    const protectedDiff = execFileSync('git', [
        'diff', '--name-only', 'HEAD', '--',
        'word', 'phrase', 'worker', 'deploy-production.ps1',
        'data/approved-static-word-slugs.json',
        'bangla-to-english-translation-hub.html',
        'english-to-bangla-dictionary-online-free.html',
        'tools/smart-translator.html',
        'tools/context-translator.html'
    ], { cwd: root, encoding: 'utf8' }).trim();
    assert.equal(protectedDiff, '');

    const tmp = fs.mkdtempSync(path.join(root, 'tmp-dict-'));
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
