'use strict';

const EN_TO_BN = new Map([
    ['hello', 'হ্যালো'],
    ['how are you?', 'আপনি কেমন আছেন?']
]);

const BN_TO_EN = new Map([
    ['হ্যালো', 'Hello'],
    ['আপনি কেমন আছেন?', 'How are you?']
]);

function normalizeKey(text) {
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Deterministic offline mock translator. Never uses the network.
 */
export function mockTranslate(text, source, target) {
    if (source === 'en' && target === 'bn') {
        const hit = EN_TO_BN.get(normalizeKey(text));
        if (hit) return hit;
        return '[mock bn] ' + text;
    }
    if (source === 'bn' && target === 'en') {
        const hit = BN_TO_EN.get(text.trim().replace(/\s+/g, ' '));
        if (hit) return hit;
        return '[mock en] ' + text;
    }
    throw new Error('unsupported mock pair');
}

export const MOCK_PROVIDER = 'mock';
