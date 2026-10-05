'use strict';

import { MAX_BODY_BYTES, errorBody, validateTranslateRequest } from './validate.js';
import { mockTranslate, MOCK_PROVIDER } from './mock-translate.js';
import { readCachedTranslation, writeCachedTranslation, buildCacheKey, CACHE_TTL_SECONDS } from './cache.js';
import { consumeRateLimit, getClientIdFromRequest } from './rate-limit.js';

export function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
            'referrer-policy': 'no-referrer'
        }
    });
}

function contentTypeIsJson(request) {
    const value = request.headers.get('content-type') || '';
    return /^application\/json\s*(;|$)/i.test(value.trim());
}

export async function handleTranslatePost(request, deps) {
    const started = Date.now();
    const { cache, rateLimitStore, logger } = deps;

    if (!contentTypeIsJson(request)) {
        logger.log({
            route: 'translate',
            status: 415,
            errorCode: 'invalid_content_type',
            cached: false
        });
        return jsonResponse(415, errorBody('invalid_content_type', 'Content-Type must be application/json.'));
    }

    const rate = await consumeRateLimit(rateLimitStore, getClientIdFromRequest(request));
    if (!rate.allowed) {
        logger.log({
            route: 'translate',
            status: 429,
            errorCode: 'rate_limited',
            cached: false,
            clientPrefix: rate.hashedClientPrefix
        });
        return jsonResponse(429, errorBody('rate_limited', 'Too many requests. Please wait and try again.'));
    }

    const raw = await request.arrayBuffer();
    if (raw.byteLength > MAX_BODY_BYTES) {
        logger.log({
            route: 'translate',
            status: 400,
            errorCode: 'text_too_long',
            cached: false,
            clientPrefix: rate.hashedClientPrefix
        });
        return jsonResponse(400, errorBody('text_too_long', 'Request body exceeds the 4096-byte limit.'));
    }

    let payload;
    try {
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(raw);
        if (decoded.trim().length === 0) {
            throw new Error('empty');
        }
        payload = JSON.parse(decoded);
    } catch {
        logger.log({
            route: 'translate',
            status: 400,
            errorCode: 'invalid_json',
            cached: false,
            clientPrefix: rate.hashedClientPrefix
        });
        return jsonResponse(400, errorBody('invalid_json', 'Request body must be valid JSON.'));
    }

    const validated = validateTranslateRequest(payload);
    if (!validated.ok) {
        logger.log({
            route: 'translate',
            status: validated.status,
            errorCode: validated.body.error.code,
            cached: false,
            clientPrefix: rate.hashedClientPrefix
        });
        return jsonResponse(validated.status, validated.body);
    }

    const { text, source, target } = validated.value;
    const pair = source + '>' + target;

    const cachedBody = await readCachedTranslation(cache, text, source, target);
    if (cachedBody) {
        const responseBody = {
            ...cachedBody,
            cached: true,
            provider: MOCK_PROVIDER,
            detectedSource: null,
            enrichment: {
                dictionaryLinks: [],
                phraseLinks: []
            }
        };
        logger.log({
            route: 'translate',
            status: 200,
            errorCode: null,
            cached: true,
            pair,
            latencyMs: Date.now() - started,
            clientPrefix: rate.hashedClientPrefix
        });
        return jsonResponse(200, responseBody);
    }

    const translation = mockTranslate(text, source, target);
    const responseBody = {
        ok: true,
        source,
        target,
        text,
        translation,
        detectedSource: null,
        provider: MOCK_PROVIDER,
        cached: false,
        enrichment: {
            dictionaryLinks: [],
            phraseLinks: []
        }
    };

    await writeCachedTranslation(cache, text, source, target, {
        ok: true,
        source,
        target,
        text,
        translation,
        detectedSource: null,
        provider: MOCK_PROVIDER,
        enrichment: {
            dictionaryLinks: [],
            phraseLinks: []
        }
    });

    logger.log({
        route: 'translate',
        status: 200,
        errorCode: null,
        cached: false,
        pair,
        latencyMs: Date.now() - started,
        clientPrefix: rate.hashedClientPrefix,
        cacheTtlSeconds: CACHE_TTL_SECONDS
    });

    return jsonResponse(200, responseBody);
}

export async function handleApi(request, url, deps) {
    if (url.pathname === '/api/translate' || url.pathname === '/api/translate/') {
        if (request.method !== 'POST') {
            deps.logger.log({
                route: 'translate',
                status: 405,
                errorCode: 'method_not_allowed',
                cached: false
            });
            return jsonResponse(405, errorBody('method_not_allowed', 'Only POST is allowed for /api/translate.'));
        }
        return handleTranslatePost(request, deps);
    }

    return jsonResponse(404, errorBody('not_found', 'API route not found.'));
}

// Re-export for tests that inspect cache-key construction.
export { buildCacheKey, CACHE_TTL_SECONDS };
