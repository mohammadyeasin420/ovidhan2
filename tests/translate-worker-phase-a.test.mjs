'use strict';
// Phase A: Worker + Assets infrastructure contracts.
// Run: node tests/translate-worker-phase-a.test.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import worker from '../worker/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const EXPECTED_WORD_COUNT = 49710;
const EXPECTED_PHRASES = [
    'as-your-wish.html',
    'best-of-luck.html',
    'excuse-me.html',
    'mind-it.html',
    'my-pleasure.html',
    'where-are-you-from.html'
];
const BASELINE_DICT_HASH = 'e12bb34469d696b2d7595f297159b7558db3e3f4c662ba4750efdd4aa813c5e3';

function scenario(name, fn) {
    return Promise.resolve()
        .then(fn)
        .then(() => console.log('PASS', name))
        .catch((error) => {
            console.error('FAIL', name);
            throw error;
        });
}

function sha256File(filePath) {
    return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJsonc(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const stripped = raw.replace(/^\uFEFF/, '').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return JSON.parse(stripped);
}

async function invoke(pathname, init = {}, assetsHandler, envExtra = {}) {
    const env = {
        ASSETS: {
            fetch: assetsHandler || (async (request) => new Response('ASSET:' + new URL(request.url).pathname, {
                status: 200,
                headers: { 'content-type': 'text/plain' }
            }))
        },
        ...envExtra
    };
    const request = new Request('https://ovidhan.net' + pathname, init);
    return worker.fetch(request, env);
}

async function readJson(response) {
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    assert.match(contentType, /application\/json/i);
    return JSON.parse(text);
}

await scenario('POST /api/translate fails closed without secret and never embeds credentials', async () => {
    const response = await invoke('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'hello', source: 'en', target: 'bn' })
    });
    assert.equal(response.status, 503);
    const body = await readJson(response);
    assert.equal(body.ok, false);
    assert.equal(body.error.code, 'translator_not_configured');
    assert.equal(response.headers.get('cache-control'), 'no-store');

    const config = readJsonc(path.join(root, 'worker', 'wrangler.jsonc'));
    assert.equal('vars' in config, false);
    const workerText = [
        fs.readFileSync(path.join(root, 'worker', 'index.js'), 'utf8'),
        fs.readFileSync(path.join(root, 'worker', 'wrangler.jsonc'), 'utf8')
    ].join('\n');
    assert.equal(/AIza[0-9A-Za-z_\-]{20,}/.test(workerText), false);
    assert.equal(/GOOGLE_TRANSLATE_API_KEY\s*[:=]\s*['"][^'"]+['"]/.test(workerText), false);
});

await scenario('unsupported /api route returns controlled JSON 404', async () => {
    const response = await invoke('/api/unknown', { method: 'GET' });
    assert.equal(response.status, 404);
    const body = await readJson(response);
    assert.equal(body.ok, false);
    assert.equal(body.error.code, 'not_found');
});

await scenario('non-API request delegates to ASSETS', async () => {
    let seen = null;
    const response = await invoke('/word/lunch.html', { method: 'GET' }, async (request) => {
        seen = new URL(request.url).pathname;
        return new Response('WORD', { status: 200 });
    });
    assert.equal(seen, '/word/lunch.html');
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'WORD');
});

await scenario('API errors are JSON and Worker config remains assets-safe', async () => {
    const response = await invoke('/api/translate', { method: 'GET' });
    assert.equal(response.status, 405);
    const body = await readJson(response);
    assert.equal(body.ok, false);
    assert.equal(body.error.code, 'method_not_allowed');

    assert.equal(fs.existsSync(path.join(root, 'worker', 'lib', 'google-translate.js')), true);
    const config = readJsonc(path.join(root, 'worker', 'wrangler.jsonc'));
    assert.equal(config.main, 'index.js');
    assert.equal(config.assets.binding, 'ASSETS');
    assert.equal(config.assets.html_handling, 'none');
    assert.equal(config.assets.not_found_handling, 'none');
    assert.deepEqual(config.assets.run_worker_first, ['/api/*']);
    assert.equal('vars' in config, false);
});

await scenario('static production invariance anchors remain intact', () => {
    const tracked = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '--', 'word/*.html'], {
        cwd: root,
        encoding: 'utf8'
    }).split(/\n/).filter(Boolean);
    assert.equal(tracked.length, EXPECTED_WORD_COUNT);

    const phrases = fs.readdirSync(path.join(root, 'phrase'))
        .filter((name) => name.endsWith('.html'))
        .sort();
    assert.deepEqual(phrases, EXPECTED_PHRASES);

    for (const name of ['lunch.html', 'businesses.html', 'textbooks.html', 'ability.html']) {
        assert.equal(fs.existsSync(path.join(root, 'word', name)), true, name);
    }

    const wordDiff = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'word'], {
        cwd: root,
        encoding: 'utf8'
    }).trim();
    assert.equal(wordDiff, '');

    const phraseDiff = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'phrase'], {
        cwd: root,
        encoding: 'utf8'
    }).trim();
    assert.equal(phraseDiff, '');

    const protectedDiff = execFileSync('git', [
        'diff', '--name-only', 'HEAD', '--',
        'sitemap.xml', 'robots.txt', '_redirects', '_headers',
        'bangla-to-english-translation-hub.html',
        'english-to-bangla-dictionary-online-free.html',
        'tools/smart-translator.html',
        'tools/context-translator.html',
        'tools/phrase-builder.html',
        'data/approved-static-word-slugs.json'
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

console.log('All Phase-A translator Worker checks passed.');
