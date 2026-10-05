'use strict';
// Phase C: Google Cloud Translation provider behind the Phase-B API boundary.
// Run: node tests/translate-worker-phase-c.test.mjs
// This suite never contacts Google. All upstream calls are injected fakes.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import worker from '../worker/index.js';
import {
    googleTranslate,
    GOOGLE_PROVIDER,
    GOOGLE_TRANSLATE_ENDPOINT,
    UPSTREAM_TIMEOUT_MS,
    ProviderError
} from '../worker/lib/google-translate.js';
import { buildCacheKey, CACHE_TTL_SECONDS, createMemoryCache } from '../worker/lib/cache.js';
import { createMemoryRateLimitStore, RATE_LIMIT_MAX } from '../worker/lib/rate-limit.js';
import { createPrivacyLogger } from '../worker/lib/privacy-log.js';

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
const FAKE_KEY = 'test-fake-key-not-real';

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

function googleSuccess(translatedText) {
    return {
        ok: true,
        status: 200,
        json: {
            data: {
                translations: [{ translatedText }]
            }
        }
    };
}

function createCountingFetch(handler) {
    const state = { calls: 0, requests: [] };
    const fetchImpl = async (url, init = {}) => {
        state.calls += 1;
        const body = init.body ? JSON.parse(init.body) : null;
        state.requests.push({
            url: String(url),
            method: init.method || 'GET',
            headers: init.headers || {},
            body
        });
        const result = await handler(url, init, body);
        const status = result.status || (result.ok === false ? 500 : 200);
        const payload = Object.prototype.hasOwnProperty.call(result, 'raw')
            ? result.raw
            : JSON.stringify(result.json ?? {});
        return new Response(payload, {
            status,
            headers: { 'content-type': 'application/json' }
        });
    };
    return { fetchImpl, state };
}

function createDeps(fetchHandler) {
    const { fetchImpl, state } = createCountingFetch(fetchHandler || (async () => googleSuccess('হ্যালো')));
    return {
        cache: createMemoryCache(),
        rateLimitStore: createMemoryRateLimitStore(),
        logger: createPrivacyLogger(),
        apiKey: FAKE_KEY,
        providerState: state,
        translateProvider: (args) => googleTranslate({
            ...args,
            apiKey: args.apiKey,
            fetchImpl,
            timeoutMs: 50
        })
    };
}

async function invoke(pathname, init = {}, deps, assetsHandler) {
    const env = {
        ASSETS: {
            fetch: assetsHandler || (async (request) => new Response('ASSET:' + new URL(request.url).pathname, {
                status: 200,
                headers: { 'content-type': 'text/plain' }
            }))
        },
        __testCache: deps.cache,
        __testRateLimitStore: deps.rateLimitStore,
        __testLogger: deps.logger,
        __testApiKey: deps.apiKey,
        __testTranslateProvider: deps.translateProvider
    };
    return {
        response: await worker.fetch(new Request('https://ovidhan.net' + pathname, init), env),
        deps
    };
}

async function translate(body, options = {}) {
    const deps = options.deps || createDeps(options.fetchHandler);
    const headers = { ...(options.headers || {}) };
    if (!Object.prototype.hasOwnProperty.call(options, 'headers')) {
        headers['content-type'] = 'application/json';
    }
    if (options.ip) headers['cf-connecting-ip'] = options.ip;
    return invoke('/api/translate', {
        method: options.method || 'POST',
        headers,
        body: options.rawBody !== undefined ? options.rawBody : JSON.stringify(body)
    }, deps);
}

async function readJson(response) {
    const text = await response.text();
    assert.match(response.headers.get('content-type') || '', /application\/json/i);
    return JSON.parse(text);
}

await scenario('en -> bn and bn -> en success with provider=google', async () => {
    const deps = createDeps(async (_url, _init, body) => {
        if (body.source === 'en' && body.target === 'bn') return googleSuccess('হ্যালো');
        if (body.source === 'bn' && body.target === 'en') return googleSuccess('How are you?');
        return { ok: false, status: 400, json: { error: { message: 'bad pair' } } };
    });

    const en = await translate({ text: 'Hello', source: 'en', target: 'bn' }, { deps });
    assert.equal(en.response.status, 200);
    const enBody = await readJson(en.response);
    assert.equal(enBody.provider, 'google');
    assert.equal(enBody.translation, 'হ্যালো');
    assert.equal(enBody.detectedSource, null);
    assert.equal(enBody.cached, false);
    assert.equal(deps.providerState.calls, 1);
    assert.equal(deps.providerState.requests[0].body.q, 'Hello');
    assert.equal(deps.providerState.requests[0].body.source, 'en');
    assert.equal(deps.providerState.requests[0].body.target, 'bn');
    assert.equal(deps.providerState.requests[0].body.format, 'text');
    assert.equal(deps.providerState.requests[0].url, GOOGLE_TRANSLATE_ENDPOINT);
    assert.equal(deps.providerState.requests[0].headers['x-goog-api-key'], FAKE_KEY);

    const bn = await translate({ text: 'আপনি কেমন আছেন?', source: 'bn', target: 'en' }, { deps });
    assert.equal(bn.response.status, 200);
    const bnBody = await readJson(bn.response);
    assert.equal(bnBody.translation, 'How are you?');
    assert.equal(bnBody.text, 'আপনি কেমন আছেন?');
    assert.equal(deps.providerState.calls, 2);
});

await scenario('missing secret returns translator_not_configured and never calls provider', async () => {
    const deps = createDeps();
    deps.apiKey = null;
    const { response, deps: used } = await translate({ text: 'hello', source: 'en', target: 'bn' }, { deps });
    assert.equal(response.status, 503);
    const body = await readJson(response);
    assert.equal(body.error.code, 'translator_not_configured');
    assert.equal(JSON.stringify(body).includes(FAKE_KEY), false);
    assert.equal(used.providerState.calls, 0);
});

await scenario('cache hit makes zero additional provider calls; reverse direction is separate', async () => {
    const deps = createDeps(async () => googleSuccess('হ্যালো'));
    const first = await translate({ text: 'hello', source: 'en', target: 'bn' }, { deps });
    assert.equal((await readJson(first.response)).cached, false);
    assert.equal(deps.providerState.calls, 1);

    const second = await translate({ text: 'hello', source: 'en', target: 'bn' }, { deps });
    const secondBody = await readJson(second.response);
    assert.equal(secondBody.cached, true);
    assert.equal(secondBody.provider, 'google');
    assert.equal(deps.providerState.calls, 1);

    const reverseDeps = createDeps(async () => googleSuccess('Hello'));
    // share cache? separate is fine — prove different key via buildCacheKey
    const keyA = (await buildCacheKey('hello', 'en', 'bn')).url;
    const keyB = (await buildCacheKey('hello', 'bn', 'en')).url;
    assert.notEqual(keyA, keyB);
    assert.equal(keyA.includes('hello'), false);
    assert.equal(CACHE_TTL_SECONDS, 24 * 60 * 60);
    assert.equal(UPSTREAM_TIMEOUT_MS, 8000);
    assert.equal(reverseDeps.providerState.calls, 0);
});

await scenario('invalid and rate-limited requests make zero provider calls', async () => {
    const deps = createDeps(async () => googleSuccess('ok'));
    const invalid = await translate({ text: '', source: 'en', target: 'bn' }, { deps });
    assert.equal((await readJson(invalid.response)).error.code, 'empty_text');
    assert.equal(deps.providerState.calls, 0);

    for (let i = 1; i <= RATE_LIMIT_MAX; i += 1) {
        const result = await translate({ text: 'item ' + i, source: 'en', target: 'bn' }, { deps, ip: '1.1.1.1' });
        assert.equal(result.response.status, 200, 'req ' + i);
    }
    const before = deps.providerState.calls;
    assert.equal(before, RATE_LIMIT_MAX);
    const blocked = await translate({ text: 'overflow', source: 'en', target: 'bn' }, { deps, ip: '1.1.1.1' });
    assert.equal(blocked.response.status, 429);
    assert.equal((await readJson(blocked.response)).error.code, 'rate_limited');
    assert.equal(deps.providerState.calls, before);
});

await scenario('provider failures map to controlled errors and are not cached', async () => {
    const cases = [
        [{ ok: false, status: 400, json: { error: { message: 'bad' } } }, 'translator_unavailable'],
        [{ ok: false, status: 401, json: { error: { message: 'auth' } } }, 'translator_unavailable'],
        [{ ok: false, status: 403, json: { error: { message: 'forbid' } } }, 'translator_unavailable'],
        [{ ok: false, status: 429, json: { error: { message: 'quota' } } }, 'translator_quota_exceeded'],
        [{ ok: false, status: 500, json: { error: { message: 'boom' } } }, 'translator_unavailable'],
        [{ ok: true, status: 200, raw: '{bad-json' }, 'translator_unavailable'],
        [{ ok: true, status: 200, json: { data: { translations: [{}] } } }, 'translator_unavailable']
    ];

    for (const [upstream, code] of cases) {
        const deps = createDeps(async () => upstream);
        const first = await translate({ text: 'hello', source: 'en', target: 'bn' }, { deps });
        const body = await readJson(first.response);
        assert.equal(body.ok, false, code);
        assert.equal(body.error.code, code);
        assert.equal(JSON.stringify(body).includes('bad'), false);
        assert.equal(JSON.stringify(body).includes('boom'), false);
        assert.equal(JSON.stringify(body).includes(FAKE_KEY), false);

        const second = await translate({ text: 'hello', source: 'en', target: 'bn' }, { deps });
        assert.equal((await readJson(second.response)).error.code, code);
        assert.equal(deps.providerState.calls, 2, 'failed responses must not be cached: ' + code);
    }
});

await scenario('upstream timeout and network exception map cleanly', async () => {
    const timeoutDeps = createDeps();
    const timeoutResult = await translate({ text: 'hello', source: 'en', target: 'bn' }, {
        deps: {
            ...timeoutDeps,
            translateProvider: (args) => googleTranslate({
                ...args,
                timeoutMs: 10,
                fetchImpl: async (_url, init) => {
                    timeoutDeps.providerState.calls += 1;
                    return await new Promise((_, reject) => {
                        const err = new Error('aborted');
                        err.name = 'AbortError';
                        init.signal.addEventListener('abort', () => reject(err));
                    });
                }
            })
        }
    });
    assert.equal(timeoutResult.response.status, 504);
    assert.equal((await readJson(timeoutResult.response)).error.code, 'translator_timeout');
    assert.equal(timeoutDeps.providerState.calls, 1);

    const netDeps = createDeps();
    const netResult = await translate({ text: 'hello', source: 'en', target: 'bn' }, {
        deps: {
            ...netDeps,
            translateProvider: (args) => googleTranslate({
                ...args,
                fetchImpl: async () => {
                    netDeps.providerState.calls += 1;
                    throw new TypeError('network down');
                }
            })
        }
    });
    assert.equal(netResult.response.status, 503);
    assert.equal((await readJson(netResult.response)).error.code, 'translator_unavailable');
    assert.equal(netDeps.providerState.calls, 1);
});

await scenario('security headers, no CORS wildcard, no secret leakage in logs/responses', async () => {
    const deps = createDeps(async () => googleSuccess('হ্যালো'));
    const { response } = await translate({ text: 'hello', source: 'en', target: 'bn' }, { deps });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    const bodyText = await response.clone().text();
    assert.equal(bodyText.includes(FAKE_KEY), false);
    const logs = JSON.stringify(deps.logger.entries);
    assert.equal(logs.includes(FAKE_KEY), false);
    assert.equal(logs.includes('hello'), false);
    assert.equal(logs.includes('হ্যালো'), false);
    assert.equal(GOOGLE_PROVIDER, 'google');
});

await scenario('direct provider rejects missing key and malformed success payload', async () => {
    await assert.rejects(
        () => googleTranslate({ text: 'x', source: 'en', target: 'bn', apiKey: '', fetchImpl: async () => new Response('{}') }),
        (error) => error instanceof ProviderError && error.code === 'translator_not_configured'
    );
    await assert.rejects(
        () => googleTranslate({
            text: 'x',
            source: 'en',
            target: 'bn',
            apiKey: FAKE_KEY,
            fetchImpl: async () => new Response(JSON.stringify({ data: {} }), { status: 200 })
        }),
        (error) => error instanceof ProviderError && error.code === 'translator_unavailable'
    );
});

await scenario('static production invariance anchors remain intact', () => {
    const tracked = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '--', 'word/*.html'], {
        cwd: root,
        encoding: 'utf8'
    }).split(/\n/).filter(Boolean);
    assert.equal(tracked.length, EXPECTED_WORD_COUNT);
    const phrases = fs.readdirSync(path.join(root, 'phrase')).filter((n) => n.endsWith('.html')).sort();
    assert.deepEqual(phrases, EXPECTED_PHRASES);

    const protectedDiff = execFileSync('git', [
        'diff', '--name-only', 'HEAD', '--',
        'word', 'phrase', 'sitemap.xml', 'robots.txt', '_redirects', '_headers',
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

    const wrangler = fs.readFileSync(path.join(root, 'worker', 'wrangler.jsonc'), 'utf8');
    assert.equal(/GOOGLE_TRANSLATE_API_KEY\s*[:=]\s*['"][^'"]+['"]/.test(wrangler), false);
    assert.equal(/AIza[0-9A-Za-z_\-]{20,}/.test(wrangler), false);
});

console.log('All Phase-C Google provider checks passed.');
