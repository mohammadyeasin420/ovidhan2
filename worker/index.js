'use strict';

/**
 * Ovidhan production Worker — Phase B.
 * Intercepts /api/* only; all other requests fall through to static Assets.
 * Translation uses a deterministic offline mock provider (no Google, no secrets).
 */

import { handleApi, jsonResponse } from './lib/api.js';
import { createMemoryCache } from './lib/cache.js';
import { createCacheApiRateLimitStore, createMemoryRateLimitStore } from './lib/rate-limit.js';
import { createPrivacyLogger } from './lib/privacy-log.js';
import { errorBody } from './lib/validate.js';

function resolveCache(env) {
    if (env && env.__testCache) return env.__testCache;
    if (typeof caches !== 'undefined' && caches.default) return caches.default;
    return createMemoryCache();
}

function resolveRateLimitStore(env, cache) {
    if (env && env.__testRateLimitStore) return env.__testRateLimitStore;
    if (cache && typeof cache.match === 'function' && typeof cache.put === 'function') {
        return createCacheApiRateLimitStore(cache);
    }
    return createMemoryRateLimitStore();
}

function resolveLogger(env) {
    if (env && env.__testLogger) return env.__testLogger;
    return createPrivacyLogger();
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
            try {
                const cache = resolveCache(env);
                const deps = {
                    cache,
                    rateLimitStore: resolveRateLimitStore(env, cache),
                    logger: resolveLogger(env)
                };
                return await handleApi(request, url, deps);
            } catch {
                return jsonResponse(500, errorBody('internal_error', 'Unexpected API error.'));
            }
        }

        return env.ASSETS.fetch(request);
    }
};
