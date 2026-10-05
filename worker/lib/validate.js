'use strict';

export const MAX_BODY_BYTES = 4096;
export const MAX_CODE_POINTS = 1000;
export const ALLOWED_LANGS = new Set(['en', 'bn']);
export const ALLOWED_FIELDS = new Set(['text', 'source', 'target']);

export function codePointLength(text) {
    return Array.from(text).length;
}

export function errorBody(code, message) {
    return {
        ok: false,
        error: { code, message }
    };
}

/**
 * Validate a parsed JSON object for POST /api/translate.
 * Returns { ok:true, value } or { ok:false, status, body }.
 */
export function validateTranslateRequest(payload) {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
        return {
            ok: false,
            status: 400,
            body: errorBody('invalid_json', 'Request body must be a JSON object.')
        };
    }

    for (const key of Object.keys(payload)) {
        if (!ALLOWED_FIELDS.has(key)) {
            return {
                ok: false,
                status: 400,
                body: errorBody('unexpected_field', 'Unexpected field in request body.')
            };
        }
    }

    if (!Object.prototype.hasOwnProperty.call(payload, 'text')) {
        return {
            ok: false,
            status: 400,
            body: errorBody('empty_text', 'text is required.')
        };
    }
    if (typeof payload.text !== 'string') {
        return {
            ok: false,
            status: 400,
            body: errorBody('empty_text', 'text must be a string.')
        };
    }

    const text = payload.text.trim();
    if (text.length === 0) {
        return {
            ok: false,
            status: 400,
            body: errorBody('empty_text', 'text must not be empty.')
        };
    }
    if (codePointLength(text) > MAX_CODE_POINTS) {
        return {
            ok: false,
            status: 400,
            body: errorBody('text_too_long', 'text exceeds the 1000 character limit.')
        };
    }

    if (!Object.prototype.hasOwnProperty.call(payload, 'source') || !Object.prototype.hasOwnProperty.call(payload, 'target')) {
        return {
            ok: false,
            status: 400,
            body: errorBody('unsupported_pair', 'source and target are required.')
        };
    }
    if (typeof payload.source !== 'string' || typeof payload.target !== 'string') {
        return {
            ok: false,
            status: 400,
            body: errorBody('unsupported_pair', 'source and target must be strings.')
        };
    }
    if (!ALLOWED_LANGS.has(payload.source) || !ALLOWED_LANGS.has(payload.target)) {
        return {
            ok: false,
            status: 400,
            body: errorBody('unsupported_pair', 'Only en and bn language codes are supported.')
        };
    }
    if (payload.source === payload.target) {
        return {
            ok: false,
            status: 400,
            body: errorBody('unsupported_pair', 'source and target must differ.')
        };
    }
    if (!((payload.source === 'en' && payload.target === 'bn') || (payload.source === 'bn' && payload.target === 'en'))) {
        return {
            ok: false,
            status: 400,
            body: errorBody('unsupported_pair', 'Only en->bn and bn->en are allowed.')
        };
    }

    return {
        ok: true,
        value: {
            text,
            source: payload.source,
            target: payload.target
        }
    };
}
