'use strict';

/**
 * Ovidhan production Worker — Phase C.
 * Intercepts /api/* only; all other requests fall through to static Assets.
 * Translation uses Google Cloud Translation v2 via env.GOOGLE_TRANSLATE_API_KEY.
 * No production fallback to mock translations.
 */

import { handleApi, jsonResponse } from './lib/api.js';
import { createMemoryCache } from './lib/cache.js';
import { createCacheApiRateLimitStore, createMemoryRateLimitStore } from './lib/rate-limit.js';
import { createPrivacyLogger } from './lib/privacy-log.js';
import { errorBody } from './lib/validate.js';
import { googleTranslate } from './lib/google-translate.js';

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

function resolveTranslateProvider(env) {
    if (env && typeof env.__testTranslateProvider === 'function') return env.__testTranslateProvider;
    return googleTranslate;
}

function resolveApiKey(env) {
    if (env && Object.prototype.hasOwnProperty.call(env, '__testApiKey')) return env.__testApiKey;
    if (env && typeof env.GOOGLE_TRANSLATE_API_KEY === 'string') return env.GOOGLE_TRANSLATE_API_KEY;
    return null;
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
                    logger: resolveLogger(env),
                    apiKey: resolveApiKey(env),
                    translateProvider: resolveTranslateProvider(env)
                };
                return await handleApi(request, url, deps);
            } catch {
                return jsonResponse(500, errorBody('internal_error', 'Unexpected API error.'));
            }
        }

        return env.ASSETS.fetch(request);
    }
};
