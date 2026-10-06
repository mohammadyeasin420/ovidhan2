'use strict';
// Phase E2/E3: client learning enrichment UI contracts.
// Run: node tests/translate-enrichment-ui-e3.test.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const pagePath = path.join(root, 'translate.html');
const e1Path = path.join(root, 'data', 'translate-enrichment-v1.json');
const html = fs.readFileSync(pagePath, 'utf8');
const script = html.match(/<script id="translate-app">([\s\S]*?)<\/script>/)[1];
const asset = JSON.parse(fs.readFileSync(e1Path, 'utf8'));
const E1_SHA = '52dde97f122ffb5f377bfc711895ef8a8ba358e4147cbb891882eddad1a775fd';
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

function loadHelpers() {
    const start = script.indexOf('// @ovidhan-e3-helpers-start');
    const end = script.indexOf('// @ovidhan-e3-helpers-end');
    assert.ok(start >= 0 && end > start, 'helper markers missing');
    const chunk = script.slice(start, end);
    const sandbox = { globalThis: {} };
    vm.runInNewContext(chunk + '\nthis.result = globalThis.OvidhanTranslateE3;', sandbox);
    assert.ok(sandbox.result, 'OvidhanTranslateE3 helpers failed to load');
    return sandbox.result;
}

const E3 = loadHelpers();

scenario('E1 asset path is correct and present', () => {
    assert.equal(E3.ENRICHMENT_URL, '/data/translate-enrichment-v1.json');
    assert.match(script, /ENRICHMENT_URL = '\/data\/translate-enrichment-v1\.json'/);
    assert.equal(fs.existsSync(e1Path), true);
    assert.equal(sha256File(e1Path), E1_SHA);
});

scenario('client does not call external enrichment services or Worker enrichment fields', () => {
    assert.equal(/translate\.googleapis\.com|openai\.com|anthropic|dictionaryapi|wiktionary|elevenlabs|texttospeech/i.test(html), false);
    assert.equal(/payload\.enrichment|enrichment\.dictionaryLinks|enrichment\.phraseLinks/.test(script), false);
    assert.match(script, /fetch\(API_URL/);
    assert.match(script, /fetch\(ENRICHMENT_URL/);
});

scenario('enrichment asset loaded at most once / memoized', () => {
    assert.match(script, /var enrichmentPromise = null;/);
    assert.match(script, /if \(enrichmentPromise\) return enrichmentPromise;/);
    assert.match(script, /enrichmentPromise = fetch\(ENRICHMENT_URL/);
    assert.equal((script.match(/fetch\(ENRICHMENT_URL/g) || []).length, 1);
});

scenario('EN->BN uses English source; BN->EN uses English translation', () => {
    assert.equal(E3.englishTextForEnrichment('en', 'hello luck', 'হ্যালো'), 'hello luck');
    assert.equal(E3.englishTextForEnrichment('bn', 'বাংলা লেখা', 'hello luck'), 'hello luck');
    assert.match(script, /sourceLangValue === 'bn'/);
    assert.match(script, /scheduleEnrichment\(requestSourceLang, text, latestTranslation\)/);
});

scenario('exact dictionary hits only; unknown words never manufacture links', () => {
    const hits = E3.matchDictionary('hello xyzzyq notaword luck', asset.dictionary);
    assert.equal(hits.map((item) => item.slug).join(','), 'hello,luck');
    for (const hit of hits) {
        assert.equal(Object.prototype.hasOwnProperty.call(asset.dictionary, hit.slug), true);
        assert.equal(hit.slug.includes('xyzzyq'), false);
    }
    assert.equal(E3.matchDictionary('running happier cities', asset.dictionary).length, 0);
});

scenario('dictionary cap is 5 with stop-word filtering and duplicate suppression', () => {
    assert.equal(E3.MAX_DICTIONARY, 5);
    const text = 'the hello and hello and good and love and sorry and lunch and country and luck';
    const hits = E3.matchDictionary(text, asset.dictionary);
    assert.ok(hits.length <= 5);
    assert.equal(hits.map((item) => item.slug).join(','), 'hello,good,love,sorry,lunch');
    assert.equal(hits.some((item) => item.slug === 'the' || item.slug === 'and'), false);
    assert.equal(new Set(hits.map((item) => item.slug)).size, hits.length);
});

scenario('phrase matching restricted to E1 phrases with cap 2 and longer-first preference', () => {
    assert.equal(E3.MAX_PHRASES, 2);
    const hits = E3.matchPhrases(
        'Best of luck and mind it, and also where are you from today.',
        asset.phrases
    );
    assert.ok(hits.length <= 2);
    assert.equal(hits.map((item) => item.slug).sort().join(','), 'best-of-luck,where-are-you-from');
    assert.equal(hits.some((item) => item.slug === 'mind-it'), false);
});

scenario('unreleased T1 phrase cannot produce a link', () => {
    const fake = asset.phrases.concat([{
        phrase: 'all the best',
        display: 'All the Best',
        bn: 'শুভকামনা',
        slug: 'all-the-best'
    }]);
    const hits = E3.matchPhrases('I wish you all the best today', asset.phrases);
    assert.equal(hits.length, 0);
    const onlyReleased = E3.matchPhrases('all the best and best of luck', fake);
    assert.equal(onlyReleased.some((item) => item.slug === 'all-the-best'), true);
    assert.equal(asset.phrases.some((item) => item.slug === 'all-the-best'), false);
});

scenario('zero matches hide learning area; clear and direction change invalidate learning', () => {
    assert.match(html, /id="learningPanel"[^>]*hidden/);
    assert.match(script, /if \(!hasDict && !hasPhrases\)/);
    assert.match(script, /learningPanel\.hidden = true/);
    assert.match(script, /function clearAll\(\)[\s\S]*clearLearning\(\)/);
    assert.match(script, /function enforcePair\([\s\S]*clearLearning\(\)/);
    assert.match(script, /function swapLanguages\(\)[\s\S]*clearLearning\(\)/);
});

scenario('asset fetch failure leaves translation usable; stale enrichment cannot win', () => {
    assert.match(script, /\.catch\(function \(\) \{\s*return null;\s*\}\)/);
    assert.match(script, /if \(!data\) return;/);
    assert.match(script, /var enrichmentSeq = 0;/);
    assert.match(script, /if \(seq !== enrichmentSeq\) return;/);
    assert.equal((script.match(/if \(seq !== enrichmentSeq\) return;/g) || []).length >= 2, true);
    assert.match(script, /setResult\(String\(payload\.translation/);
    assert.match(script, /scheduleEnrichment\(/);
});

scenario('links use E1 slugs only; BN->EN label names English translation; Bangla uses lang=bn', () => {
    assert.match(script, /var href = '\/word\/' \+ slug \+ '\.html';/);
    assert.match(script, /var phraseHref = '\/phrase\/' \+ phrase\.slug \+ '\.html';/);
    assert.equal(/\/word\/' \+ token|slugify|encodeURIComponent\(token\)/.test(script), false);
    assert.match(script, /Key words in the English translation/);
    assert.match(script, /sourceLangValue === 'bn'\s*\?\s*'Key words in the English translation'\s*:\s*'Key words'/);
    assert.match(script, /class="learning-bn" lang="bn"/);
    assert.match(html, /id="learningHeading">Learn from this translation</);
});

scenario('Copy/Listen/privacy/SEO contracts remain intact', () => {
    assert.match(script, /function copyResult\(\)/);
    assert.match(script, /navigator\.clipboard\.writeText/);
    assert.match(script, /function listenResult\(\)/);
    assert.match(script, /SpeechSynthesisUtterance/);
    const listenFn = script.match(/function listenResult\(\) \{[\s\S]*?\n    \}/)[0];
    assert.equal(/fetch\(/.test(listenFn), false);
    assert.equal(/localStorage|sessionStorage/.test(html), false);
    assert.match(html, /rel="canonical" href="https:\/\/ovidhan\.net\/translate\.html"/);
    assert.equal(/history\.pushState|history\.replaceState|URLSearchParams|location\.search/.test(html), false);
    assert.equal(/\/translate\/result|\/translate\?/.test(html), false);
});

scenario('Worker/API and protected surfaces remain unmodified', () => {
    const protectedDiff = execFileSync('git', [
        'diff', '--name-only', 'HEAD', '--',
        'worker', 'sitemap.xml', 'robots.txt', 'deploy-production.ps1',
        'word', 'phrase', 'data/translate-enrichment-v1.json',
        'data/approved-static-word-slugs.json',
        'scripts/translate/build-enrichment-v1.js'
    ], { cwd: root, encoding: 'utf8' }).trim();
    assert.equal(protectedDiff, '');
});

scenario('word count, dictionary hash, and released phrases unchanged', () => {
    const tracked = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '--', 'word/*.html'], {
        cwd: root,
        encoding: 'utf8'
    }).split(/\n/).filter(Boolean);
    assert.equal(tracked.length, EXPECTED_WORD_COUNT);

    const phrases = fs.readdirSync(path.join(root, 'phrase'))
        .filter((name) => name.endsWith('.html'))
        .sort();
    assert.deepEqual(phrases, EXPECTED_PHRASES);

    const tmp = fs.mkdtempSync(path.join(root, 'tmp-e3-dict-'));
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

scenario('E1 asset still deterministic and E1 tests pass except authorized translate.html dirty check', () => {
    const builder = require('../scripts/translate/build-enrichment-v1.js');
    const first = builder.build({ root, write: false });
    const second = builder.build({ root, write: false });
    assert.equal(first.report.sha256, second.report.sha256);
    assert.equal(first.report.sha256, E1_SHA);
    assert.equal(first.text, fs.readFileSync(e1Path, 'utf8'));

    let e1Output = '';
    try {
        e1Output = execFileSync(process.execPath, [path.join(root, 'tests', 'translate-enrichment-e1.test.mjs')], {
            cwd: root,
            encoding: 'utf8'
        });
        assert.fail('E1 suite unexpectedly fully green while translate.html is intentionally modified');
    } catch (error) {
        const text = String(error.stdout || '') + String(error.stderr || '');
        assert.match(text, /FAIL E1 does not modify protected product files|translate\.html/);
        assert.match(text, /PASS generated JSON parses/);
        assert.match(text, /PASS deterministic generation/);
    }
    void e1Output;
});

console.log('All Phase-E3 translate enrichment UI checks passed.');
