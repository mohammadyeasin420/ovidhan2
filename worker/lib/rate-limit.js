'use strict';

import { sha256Hex } from './cache.js';

export const RATE_LIMIT_MAX = 20;
export const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_HOST = 'https://ovidhan-translate-ratelimit.internal';

/**
 * Cache-API backed fixed-window counter.
 *
 * Limitations (honest):
 * - Cloudflare Cache API is not a strongly consistent global counter.
 * - Enforcement is best-effort per edge/cache locality; bursts across colos
 *   may briefly exceed 20/min under rare race conditions.
 * - This is intentional Phase-B cost protection, not a hard distributed quota.
 */
export function createMemoryRateLimitStore() {
    const store = new Map();
    return {
        async get(key) {
            const hit = store.get(key);
            if (!hit) return null;
            if (hit.expiresAt <= Date.now()) {
                store.delete(key);
                return null;
            }
            return { count: hit.count };
        },
        async set(key, count, ttlSeconds) {
            store.set(key, {
                count,
                expiresAt: Date.now() + ttlSeconds * 1000
            });
        },
        _store: store
    };
}

export function createCacheApiRateLimitStore(cache) {
    return {
        async get(key) {
            const request = new Request(RATE_HOST + '/' + key, { method: 'GET' });
            const hit = await cache.match(request);
            if (!hit) return null;
            try {
                const body = await hit.json();
                if (!body || typeof body.count !== 'number') return null;
                return { count: body.count };
            } catch {
                return null;
            }
        },
        async set(key, count, ttlSeconds) {
            const request = new Request(RATE_HOST + '/' + key, { method: 'GET' });
            const response = new Response(JSON.stringify({ count }), {
                status: 200,
                headers: {
                    'content-type': 'application/json; charset=utf-8',
                    'cache-control': 'max-age=' + ttlSeconds
                }
            });
            await cache.put(request, response, { expirationTtl: ttlSeconds });
        }
    };
}

export async function hashClientId(rawId) {
    return sha256Hex(String(rawId || 'unknown'));
}

export async function consumeRateLimit(store, clientId, now = Date.now()) {
    const hashed = await hashClientId(clientId);
    const windowId = Math.floor(now / (RATE_LIMIT_WINDOW_SECONDS * 1000));
    const key = hashed + ':' + windowId;
    const current = await store.get(key);
    const count = current ? current.count + 1 : 1;
    if (count > RATE_LIMIT_MAX) {
        return {
            allowed: false,
            count,
            hashedClientPrefix: hashed.slice(0, 8)
        };
    }
    await store.set(key, count, RATE_LIMIT_WINDOW_SECONDS);
    return {
        allowed: true,
        count,
        hashedClientPrefix: hashed.slice(0, 8)
    };
}

export function getClientIdFromRequest(request) {
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp;
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return 'unknown';
}
