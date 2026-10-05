'use strict';

import { MAX_BODY_BYTES, errorBody, validateTranslateRequest } from './validate.js';
import { readCachedTranslation, writeCachedTranslation, buildCacheKey, CACHE_TTL_SECONDS } from './cache.js';
import { consumeRateLimit, getClientIdFromRequest } from './rate-limit.js';
import { googleTranslate, GOOGLE_PROVIDER, ProviderError } from './google-translate.js';

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

function providerErrorResponse(error) {
    const code = error && error.code ? error.code : 'internal_error';
    const status = error && error.httpStatus ? error.httpStatus : 500;
    const message = error && typeof error.message === 'string' && error.code
        ? error.message
        : 'Unexpected API error.';
    return jsonResponse(status, errorBody(code, message));
}

export async function handleTranslatePost(request, deps) {
    const started = Date.now();
    const {
        cache,
        rateLimitStore,
        logger,
        apiKey = null,
        translateProvider = googleTranslate
    } = deps;

    if (!contentTypeIsJson(request)) {
        logger.log({
            route: 'translate',
            status: 415,
            errorCode: 'invalid_content_type',
            cached: false,
            providerCalls: 0
        });
        return jsonResponse(415, errorBody('invalid_content_type', 'Content-Type must be application/json.'));
    }

    const raw = await request.arrayBuffer();
    if (raw.byteLength > MAX_BODY_BYTES) {
        logger.log({
            route: 'translate',
            status: 400,
            errorCode: 'text_too_long',
            cached: false,
            providerCalls: 0
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
            providerCalls: 0
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
            providerCalls: 0
        });
        return jsonResponse(validated.status, validated.body);
    }

    const rate = await consumeRateLimit(rateLimitStore, getClientIdFromRequest(request));
    if (!rate.allowed) {
        logger.log({
            route: 'translate',
            status: 429,
            errorCode: 'rate_limited',
            cached: false,
            providerCalls: 0,
            clientPrefix: rate.hashedClientPrefix
        });
        return jsonResponse(429, errorBody('rate_limited', 'Too many requests. Please wait and try again.'));
    }

    const { text, source, target } = validated.value;
    const pair = source + '>' + target;

    const cachedBody = await readCachedTranslation(cache, text, source, target);
    if (cachedBody) {
        const responseBody = {
            ok: true,
            source: cachedBody.source,
            target: cachedBody.target,
            text: cachedBody.text,
            translation: cachedBody.translation,
            detectedSource: null,
            provider: GOOGLE_PROVIDER,
            cached: true,
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
            clientPrefix: rate.hashedClientPrefix,
            providerCalls: 0,
            provider: GOOGLE_PROVIDER
        });
        return jsonResponse(200, responseBody);
    }

    let providerResult;
    try {
        providerResult = await translateProvider({
            text,
            source,
            target,
            apiKey
        });
    } catch (error) {
        if (error instanceof ProviderError) {
            logger.log({
                route: 'translate',
                status: error.httpStatus,
                errorCode: error.code,
                cached: false,
                pair,
                latencyMs: Date.now() - started,
                clientPrefix: rate.hashedClientPrefix,
                providerCalls: 1,
                providerStatus: error.code
            });
            return providerErrorResponse(error);
        }
        logger.log({
            route: 'translate',
            status: 500,
            errorCode: 'internal_error',
            cached: false,
            pair,
            latencyMs: Date.now() - started,
            clientPrefix: rate.hashedClientPrefix,
            providerCalls: 1,
            providerStatus: 'internal_error'
        });
        return jsonResponse(500, errorBody('internal_error', 'Unexpected API error.'));
    }

    if (!providerResult || typeof providerResult.translation !== 'string' || !providerResult.translation) {
        logger.log({
            route: 'translate',
            status: 503,
            errorCode: 'translator_unavailable',
            cached: false,
            pair,
            latencyMs: Date.now() - started,
            clientPrefix: rate.hashedClientPrefix,
            providerCalls: 1,
            providerStatus: 'translator_unavailable'
        });
        return jsonResponse(503, errorBody('translator_unavailable', 'Translation service is temporarily unavailable.'));
    }

    const responseBody = {
        ok: true,
        source,
        target,
        text,
        translation: providerResult.translation,
        detectedSource: null,
        provider: GOOGLE_PROVIDER,
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
        translation: providerResult.translation,
        detectedSource: null,
        provider: GOOGLE_PROVIDER,
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
        cacheTtlSeconds: CACHE_TTL_SECONDS,
        providerCalls: 1,
        provider: GOOGLE_PROVIDER
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
                cached: false,
                providerCalls: 0
            });
            return jsonResponse(405, errorBody('method_not_allowed', 'Only POST is allowed for /api/translate.'));
        }
        return handleTranslatePost(request, deps);
    }

    return jsonResponse(404, errorBody('not_found', 'API route not found.'));
}

export { buildCacheKey, CACHE_TTL_SECONDS, GOOGLE_PROVIDER };
