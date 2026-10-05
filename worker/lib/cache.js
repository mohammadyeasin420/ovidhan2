'use strict';

export const CACHE_TTL_SECONDS = 24 * 60 * 60;
const CACHE_HOST = 'https://ovidhan-translate-cache.internal';

export async function sha256Hex(value) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildCacheKey(text, source, target) {
    const material = text + '|' + source + '|' + target;
    const hash = await sha256Hex(material);
    // Hash only — never embed raw translation text in the cache URL.
    return new Request(CACHE_HOST + '/v1/' + hash, { method: 'GET' });
}

export function createMemoryCache() {
    const store = new Map();
    return {
        async match(request) {
            const key = typeof request === 'string' ? request : request.url;
            const hit = store.get(key);
            if (!hit) return undefined;
            if (hit.expiresAt <= Date.now()) {
                store.delete(key);
                return undefined;
            }
            return hit.response.clone();
        },
        async put(request, response, options = {}) {
            const key = typeof request === 'string' ? request : request.url;
            const ttlMs = (options.expirationTtl || CACHE_TTL_SECONDS) * 1000;
            store.set(key, {
                expiresAt: Date.now() + ttlMs,
                response: response.clone()
            });
        },
        _store: store
    };
}

export async function readCachedTranslation(cache, text, source, target) {
    const key = await buildCacheKey(text, source, target);
    const hit = await cache.match(key);
    if (!hit) return null;
    try {
        const body = await hit.json();
        if (!body || body.ok !== true || typeof body.translation !== 'string') return null;
        return body;
    } catch {
        return null;
    }
}

export async function writeCachedTranslation(cache, text, source, target, payload) {
    const key = await buildCacheKey(text, source, target);
    const response = new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'max-age=' + CACHE_TTL_SECONDS
        }
    });
    await cache.put(key, response, { expirationTtl: CACHE_TTL_SECONDS });
    return key;
}
