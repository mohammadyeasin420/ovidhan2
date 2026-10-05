'use strict';

const FORBIDDEN_KEYS = new Set([
    'text',
    'translation',
    'input',
    'output',
    'body',
    'raw',
    'ip',
    'clientIp',
    'apiKey',
    'secret',
    'authorization',
    'google'
]);

function assertSafe(value, path) {
    if (value == null) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => assertSafe(item, path + '[' + index + ']'));
        return;
    }
    if (typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            if (FORBIDDEN_KEYS.has(key)) {
                throw new Error('privacy_log_forbidden_field:' + key);
            }
            if (/text|translation|secret|api[_-]?key|authorization/i.test(key)) {
                throw new Error('privacy_log_forbidden_field:' + key);
            }
            assertSafe(child, path + '.' + key);
        }
    }
}

/**
 * Privacy-safe structured logger. Throws if forbidden fields are present.
 * Does not print values in production Worker unless a sink is provided.
 */
export function createPrivacyLogger(sink = null) {
    const entries = [];
    return {
        entries,
        log(event) {
            assertSafe(event, 'event');
            const record = {
                ts: Date.now(),
                ...event
            };
            entries.push(record);
            if (typeof sink === 'function') sink(record);
        }
    };
}
