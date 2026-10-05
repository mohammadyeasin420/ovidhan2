'use strict';

export const GOOGLE_PROVIDER = 'google';
export const GOOGLE_TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
export const UPSTREAM_TIMEOUT_MS = 8000;

export class ProviderError extends Error {
    constructor(code, message, httpStatus = 503) {
        super(message);
        this.name = 'ProviderError';
        this.code = code;
        this.httpStatus = httpStatus;
    }
}

function mapHttpStatusToError(status) {
    if (status === 429) {
        return new ProviderError(
            'translator_quota_exceeded',
            'Translation quota was exceeded. Please try again later.',
            503
        );
    }
    if (status === 401 || status === 403) {
        return new ProviderError(
            'translator_unavailable',
            'Translation service is temporarily unavailable.',
            503
        );
    }
    if (status >= 400 && status < 500) {
        return new ProviderError(
            'translator_unavailable',
            'Translation service rejected the request.',
            503
        );
    }
    return new ProviderError(
        'translator_unavailable',
        'Translation service is temporarily unavailable.',
        503
    );
}

function extractTranslatedText(payload) {
    const translations = payload && payload.data && Array.isArray(payload.data.translations)
        ? payload.data.translations
        : null;
    if (!translations || translations.length < 1) {
        throw new ProviderError(
            'translator_unavailable',
            'Translation service returned an unexpected response.',
            503
        );
    }
    const translatedText = translations[0] && translations[0].translatedText;
    if (typeof translatedText !== 'string' || translatedText.length === 0) {
        throw new ProviderError(
            'translator_unavailable',
            'Translation service returned an unexpected response.',
            503
        );
    }
    return translatedText;
}

/**
 * Google Cloud Translation API v2 (Basic) provider.
 * Credential must be supplied by the caller from env.GOOGLE_TRANSLATE_API_KEY.
 * fetchImpl is injectable for deterministic offline tests.
 */
export async function googleTranslate({
    text,
    source,
    target,
    apiKey,
    fetchImpl = globalThis.fetch,
    timeoutMs = UPSTREAM_TIMEOUT_MS
}) {
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new ProviderError(
            'translator_not_configured',
            'Translation service is not configured yet.',
            503
        );
    }
    if (typeof fetchImpl !== 'function') {
        throw new ProviderError('internal_error', 'Translation transport is unavailable.', 500);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
        response = await fetchImpl(GOOGLE_TRANSLATE_ENDPOINT, {
            method: 'POST',
            headers: {
                'content-type': 'application/json; charset=utf-8',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                q: text,
                source,
                target,
                format: 'text'
            }),
            signal: controller.signal
        });
    } catch (error) {
        if (error && (error.name === 'AbortError' || error.code === 'ABORT_ERR')) {
            throw new ProviderError(
                'translator_timeout',
                'Translation service timed out. Please try again.',
                504
            );
        }
        throw new ProviderError(
            'translator_unavailable',
            'Translation service is temporarily unavailable.',
            503
        );
    } finally {
        clearTimeout(timer);
    }

    let payload = null;
    const rawText = await response.text();
    if (rawText) {
        try {
            payload = JSON.parse(rawText);
        } catch {
            payload = null;
        }
    }

    if (!response.ok) {
        throw mapHttpStatusToError(response.status);
    }
    if (payload == null) {
        throw new ProviderError(
            'translator_unavailable',
            'Translation service returned an unexpected response.',
            503
        );
    }

    const translatedText = extractTranslatedText(payload);
    return {
        translation: translatedText,
        provider: GOOGLE_PROVIDER
    };
}
