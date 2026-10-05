'use strict';
// Phase B: validated mock translator API contract.
// Run: node tests/translate-worker-phase-b.test.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import worker from '../worker/index.js';
import { buildCacheKey, CACHE_TTL_SECONDS, createMemoryCache } from '../worker/lib/cache.js';
import { createMemoryRateLimitStore, RATE_LIMIT_MAX } from '../worker/lib/rate-limit.js';
import { createPrivacyLogger } from '../worker/lib/privacy-log.js';
import { codePointLength, MAX_CODE_POINTS, MAX_BODY_BYTES } from '../worker/lib/validate.js';

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
const SAMPLE_STATIC = [
    'word/lunch.html',
    'word/businesses.html',
    'phrase/mind-it.html',
    'phrase/excuse-me.html',
    '_redirects',
    '_headers'
];

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

function createDeps() {
    return {
        cache: createMemoryCache(),
        rateLimitStore: createMemoryRateLimitStore(),
        logger: createPrivacyLogger()
    };
}

async function invoke(pathname, init = {}, deps = createDeps(), assetsHandler) {
    const env = {
        ASSETS: {
            fetch: assetsHandler || (async (request) => new Response('ASSET:' + new URL(request.url).pathname, {
                status: 200,
                headers: { 'content-type': 'text/plain' }
            }))
        },
        __testCache: deps.cache,
        __testRateLimitStore: deps.rateLimitStore,
        __testLogger: deps.logger
    };
    return {
        response: await worker.fetch(new Request('https://ovidhan.net' + pathname, init), env),
        deps
    };
}

async function translate(body, options = {}) {
    const deps = options.deps || createDeps();
    const headers = { ...(options.headers || {}) };
    if (!Object.prototype.hasOwnProperty.call(options, 'headers')) {
        headers['content-type'] = 'application/json';
    }
    const init = {
        method: options.method || 'POST',
        headers,
        body: options.rawBody !== undefined ? options.rawBody : JSON.stringify(body)
    };
    if (options.ip) headers['cf-connecting-ip'] = options.ip;
    return invoke('/api/translate', init, deps);
}

async function readJson(response) {
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    assert.match(contentType, /application\/json/i);
    return JSON.parse(text);
}

function assertSuccessShape(body, expected) {
    assert.equal(body.ok, true);
    assert.equal(body.source, expected.source);
    assert.equal(body.target, expected.target);
    assert.equal(body.text, expected.text);
    assert.equal(body.translation, expected.translation);
    assert.equal(body.detectedSource, null);
    assert.equal(body.provider, 'mock');
    assert.equal(typeof body.cached, 'boolean');
    assert.deepEqual(body.enrichment, { dictionaryLinks: [], phraseLinks: [] });
    assert.deepEqual(Object.keys(body).sort(), [
        'cached', 'detectedSource', 'enrichment', 'ok', 'provider', 'source', 'target', 'text', 'translation'
    ]);
}

await scenario('valid en -> bn fixture and contract shape', async () => {
    const { response } = await translate({ text: 'hello', source: 'en', target: 'bn' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    const body = await readJson(response);
    assertSuccessShape(body, {
        source: 'en',
        target: 'bn',
        text: 'hello',
        translation: 'হ্যালো'
    });
    assert.equal(body.cached, false);
});

await scenario('valid bn -> en fixture preserves Bengali input', async () => {
    const { response } = await translate({ text: 'আপনি কেমন আছেন?', source: 'bn', target: 'en' });
    assert.equal(response.status, 200);
    const body = await readJson(response);
    assertSuccessShape(body, {
        source: 'bn',
        target: 'en',
        text: 'আপনি কেমন আছেন?',
        translation: 'How are you?'
    });
});

await scenario('GET /api/translate -> 405 and unsupported /api -> 404', async () => {
    const getResult = await invoke('/api/translate', { method: 'GET' });
    assert.equal(getResult.response.status, 405);
    const getBody = await readJson(getResult.response);
    assert.equal(getBody.error.code, 'method_not_allowed');

    const missing = await invoke('/api/nope', { method: 'POST' });
    assert.equal(missing.response.status, 404);
    const missingBody = await readJson(missing.response);
    assert.equal(missingBody.error.code, 'not_found');
});

await scenario('non-API request delegates to ASSETS', async () => {
    let seen = null;
    const { response } = await invoke('/phrase/mind-it.html', { method: 'GET' }, createDeps(), async (request) => {
        seen = new URL(request.url).pathname;
        return new Response('PHRASE', { status: 200 });
    });
    assert.equal(seen, '/phrase/mind-it.html');
    assert.equal(await response.text(), 'PHRASE');
});

await scenario('validation matrix rejects unsafe or invalid input', async () => {
    const cases = [
        [{}, { headers: {} }, 415, 'invalid_content_type'],
        [{}, { headers: { 'content-type': 'text/plain' } }, 415, 'invalid_content_type'],
        [{}, { rawBody: '{bad' }, 400, 'invalid_json'],
        [{}, { rawBody: '' }, 400, 'invalid_json'],
        [{ source: 'en', target: 'bn' }, {}, 400, 'empty_text'],
        [{ text: 123, source: 'en', target: 'bn' }, {}, 400, 'empty_text'],
        [{ text: '   ', source: 'en', target: 'bn' }, {}, 400, 'empty_text'],
        [{ text: 'x', target: 'bn' }, {}, 400, 'unsupported_pair'],
        [{ text: 'x', source: 'en' }, {}, 400, 'unsupported_pair'],
        [{ text: 'x', source: 'fr', target: 'bn' }, {}, 400, 'unsupported_pair'],
        [{ text: 'x', source: 'en', target: 'en' }, {}, 400, 'unsupported_pair'],
        [{ text: 'x', source: 'en', target: 'bn', extra: true }, {}, 400, 'unexpected_field']
    ];
    for (const [body, options, status, code] of cases) {
        const { response } = await translate(body, options);
        assert.equal(response.status, status, code);
        const json = await readJson(response);
        assert.equal(json.ok, false);
        assert.equal(json.error.code, code);
    }

    const overPoints = 'あ'.repeat(MAX_CODE_POINTS + 1);
    assert.equal(codePointLength(overPoints), MAX_CODE_POINTS + 1);
    const overRes = await translate({ text: overPoints, source: 'en', target: 'bn' });
    assert.equal(overRes.response.status, 400);
    assert.equal((await readJson(overRes.response)).error.code, 'text_too_long');

    const overBody = 'a'.repeat(MAX_BODY_BYTES + 1);
    const big = await translate({}, { rawBody: overBody, headers: { 'content-type': 'application/json' } });
    assert.equal(big.response.status, 400);
    assert.equal((await readJson(big.response)).error.code, 'text_too_long');
});

await scenario('Unicode code-point limit accepts 1000 astral characters', async () => {
    const text = '😀'.repeat(MAX_CODE_POINTS);
    assert.equal(text.length, MAX_CODE_POINTS * 2); // UTF-16 units
    assert.equal(codePointLength(text), MAX_CODE_POINTS);
    const { response } = await translate({ text, source: 'en', target: 'bn' });
    assert.equal(response.status, 200);
    const body = await readJson(response);
    assert.equal(body.text, text);
    assert.match(body.translation, /^\[mock bn\]/);
});

await scenario('cache hit/miss, direction keys, and raw-text-free cache URLs', async () => {
    const deps = createDeps();
    const first = await translate({ text: 'hello', source: 'en', target: 'bn' }, { deps });
    assert.equal((await readJson(first.response)).cached, false);

    const second = await translate({ text: 'hello', source: 'en', target: 'bn' }, { deps });
    const secondBody = await readJson(second.response);
    assert.equal(secondBody.cached, true);
    assert.equal(secondBody.translation, 'হ্যালো');

    const reverse = await translate({ text: 'হ্যালো', source: 'bn', target: 'en' }, { deps });
    assert.equal((await readJson(reverse.response)).cached, false);

    const key = await buildCacheKey('hello', 'en', 'bn');
    assert.equal(key.url.includes('hello'), false);
    assert.equal(decodeURIComponent(key.url).includes('hello'), false);
    assert.match(key.url, /^https:\/\/ovidhan-translate-cache\.internal\/v1\/[a-f0-9]{64}$/);
    assert.equal(CACHE_TTL_SECONDS, 24 * 60 * 60);

    // Unsuccessful responses are not cached: repeated invalid requests stay uncached errors.
    const bad1 = await translate({ text: '', source: 'en', target: 'bn' }, { deps });
    const bad2 = await translate({ text: '', source: 'en', target: 'bn' }, { deps });
    assert.equal((await readJson(bad1.response)).error.code, 'empty_text');
    assert.equal((await readJson(bad2.response)).error.code, 'empty_text');
});

await scenario('rate limit allows 20 and rejects 21 for one client; other client unaffected', async () => {
    const deps = createDeps();
    for (let i = 1; i <= RATE_LIMIT_MAX; i += 1) {
        const { response } = await translate(
            { text: 'hello ' + i, source: 'en', target: 'bn' },
            { deps, ip: '1.2.3.4' }
        );
        assert.equal(response.status, 200, 'request ' + i);
    }
    const blocked = await translate(
        { text: 'hello overflow', source: 'en', target: 'bn' },
        { deps, ip: '1.2.3.4' }
    );
    assert.equal(blocked.response.status, 429);
    const blockedBody = await readJson(blocked.response);
    assert.equal(blockedBody.error.code, 'rate_limited');
    assert.equal(JSON.stringify(blockedBody).includes('1.2.3.4'), false);

    const other = await translate(
        { text: 'hello other', source: 'en', target: 'bn' },
        { deps, ip: '9.9.9.9' }
    );
    assert.equal(other.response.status, 200);
});

await scenario('privacy logger forbids raw text/translation/ip fields', async () => {
    const logger = createPrivacyLogger();
    assert.throws(() => logger.log({ text: 'secret input' }), /privacy_log_forbidden_field:text/);
    assert.throws(() => logger.log({ translation: 'secret output' }), /privacy_log_forbidden_field/);
    assert.throws(() => logger.log({ ip: '1.2.3.4' }), /privacy_log_forbidden_field:ip/);

    const deps = createDeps();
    await translate({ text: 'hello', source: 'en', target: 'bn' }, { deps });
    const serialized = JSON.stringify(deps.logger.entries);
    assert.equal(serialized.includes('hello'), false);
    assert.equal(serialized.includes('হ্যালো'), false);
    assert.equal(/GOOGLE_|API_KEY|translate\.googleapis/i.test(serialized), false);
    assert.equal(deps.logger.entries.some((e) => e.pair === 'en>bn'), true);
});

await scenario('worker source contains no Google/network translation provider', () => {
    const files = [];
    function walk(dir) {
        for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            if (fs.statSync(full).isDirectory()) walk(full);
            else files.push(full);
        }
    }
    walk(path.join(root, 'worker'));
    const joined = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    assert.equal(/translate\.googleapis\.com/i.test(joined), false);
    assert.equal(/@google-cloud\/translate/i.test(joined), false);
    assert.equal(/GOOGLE_TRANSLATE_API_KEY/i.test(joined), false);
    assert.equal(/fetch\(\s*['"`]https?:\/\//i.test(joined), false);
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

    for (const rel of SAMPLE_STATIC) {
        assert.equal(fs.existsSync(path.join(root, rel)), true, rel);
    }

    const protectedDiff = execFileSync('git', [
        'diff', '--name-only', 'HEAD', '--',
        'word', 'phrase', 'sitemap.xml', 'robots.txt', '_redirects', '_headers',
        'data/approved-static-word-slugs.json',
        'bangla-to-english-translation-hub.html',
        'english-to-bangla-dictionary-online-free.html'
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

console.log('All Phase-B translator API checks passed.');
