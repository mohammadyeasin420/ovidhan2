'use strict';

/**
 * Ovidhan production Worker — Phase A.
 * Intercepts /api/* only; all other requests fall through to static Assets.
 * Translation upstream is intentionally not configured yet.
 */

function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store'
        }
    });
}

function handleApi(request, url) {
    if (url.pathname === '/api/translate' || url.pathname === '/api/translate/') {
        if (request.method !== 'POST') {
            return jsonResponse(405, {
                ok: false,
                error: {
                    code: 'method_not_allowed',
                    message: 'Only POST is allowed for /api/translate.'
                }
            });
        }
        return jsonResponse(503, {
            ok: false,
            error: {
                code: 'translator_not_configured',
                message: 'Translation service is not configured yet.'
            }
        });
    }

    return jsonResponse(404, {
        ok: false,
        error: {
            code: 'not_found',
            message: 'API route not found.'
        }
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
            try {
                return handleApi(request, url);
            } catch {
                return jsonResponse(500, {
                    ok: false,
                    error: {
                        code: 'internal_error',
                        message: 'Unexpected API error.'
                    }
                });
            }
        }

        return env.ASSETS.fetch(request);
    }
};
