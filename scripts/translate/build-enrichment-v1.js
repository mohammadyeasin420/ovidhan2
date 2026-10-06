'use strict';
// Phase E1: build compact Translate enrichment lookup (dictionary + released phrases).
// Offline only. Never writes under word/, phrase/, worker/, or translate.html.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const phraseLib = require('../phrase/lib');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_REL = path.join('data', 'translate-enrichment-v1.json');
const APPROVED_REL = path.join('data', 'approved-static-word-slugs.json');
const COMMON5K_REL = '5000-common-words-data.json';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BENGALI_RE = /[\u0980-\u09FF]/;
const MAX_BN_CHARS = 80;
const TRUSTED_POS = new Set([
    'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition',
    'conjunction', 'determiner', 'article', 'modal', 'auxiliary', 'interjection'
]);

// Prefer foundation records, then later reviewed cohorts (first path wins per slug).
const V2_RECORD_DIRS = Object.freeze([
    path.join('dictionary-v2', 'records'),
    path.join('dictionary-v2', 'r7e-p1'),
    path.join('dictionary-v2', 'r7f-b1'),
    path.join('dictionary-v2', 'r7f-b2'),
    path.join('dictionary-v2', 'r7f-final3k')
]);

function sha256Buffer(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function readJson(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
}

function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
        return out;
    }
    return value;
}

function canonicalJson(value) {
    return JSON.stringify(sortKeys(value), null, 2) + '\n';
}

function assertSafeSlug(slug) {
    if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
        throw new Error('unsafe or invalid slug: ' + String(slug));
    }
    return slug;
}

function wordPagePath(root, slug) {
    return path.join(root, 'word', slug + '.html');
}

function phrasePagePath(root, slug) {
    return path.join(root, 'phrase', slug + '.html');
}

function isTrustworthyBangla(value) {
    if (typeof value !== 'string') return false;
    const text = value.trim();
    if (!text || text.length > MAX_BN_CHARS) return false;
    if (/[<>]|https?:\/\/|www\./i.test(text)) return false;
    if (/^(n\/?a|null|undefined|todo|tbd|xxx|placeholder)$/i.test(text)) return false;
    if (text === '-' || text === '—' || text === '–') return false;
    if (!BENGALI_RE.test(text)) return false;
    return true;
}

function normalizePos(value) {
    if (typeof value !== 'string') return null;
    const pos = value.trim().toLowerCase();
    if (!pos || !TRUSTED_POS.has(pos)) return null;
    return pos;
}

function primarySense(record) {
    const senses = Array.isArray(record.senses) ? record.senses : [];
    return senses.find((sense) => sense && sense.v1_primary === true) || senses[0] || null;
}

function walkV2RecordFiles(root) {
    const files = [];
    for (const rel of V2_RECORD_DIRS) {
        const dir = path.join(root, rel);
        if (!fs.existsSync(dir)) continue;
        const names = fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
        for (const name of names) {
            files.push(path.join(dir, name));
        }
    }
    return files;
}

function loadV2BySlug(root) {
    const bySlug = new Map();
    for (const filePath of walkV2RecordFiles(root)) {
        let record;
        try {
            record = readJson(filePath);
        } catch (error) {
            throw new Error('malformed V2 record JSON: ' + filePath + ' (' + error.message + ')');
        }
        if (!record || typeof record !== 'object' || typeof record.slug !== 'string' || !Array.isArray(record.senses)) {
            continue;
        }
        if (!SLUG_RE.test(record.slug)) continue;
        if (bySlug.has(record.slug)) continue;
        bySlug.set(record.slug, record);
    }
    return bySlug;
}

function loadApprovedSlugs(root) {
    const filePath = path.join(root, APPROVED_REL);
    if (!fs.existsSync(filePath)) throw new Error('missing approved registry: ' + APPROVED_REL);
    const data = readJson(filePath);
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('approved registry must be a non-empty array');
    }
    const seen = new Set();
    const slugs = [];
    for (const item of data) {
        if (typeof item !== 'string' || !SLUG_RE.test(item)) {
            throw new Error('approved registry contains invalid slug: ' + String(item));
        }
        if (seen.has(item)) throw new Error('approved registry contains duplicate slug: ' + item);
        seen.add(item);
        slugs.push(item);
    }
    return slugs;
}

function loadCommon5kBySlug(root) {
    const filePath = path.join(root, COMMON5K_REL);
    if (!fs.existsSync(filePath)) throw new Error('missing 5000-common-words-data.json');
    const rows = readJson(filePath);
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('5000-common-words-data.json must be a non-empty array');
    }
    const bySlug = new Map();
    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const slug = String(row.word || '').toLowerCase().trim();
        if (!SLUG_RE.test(slug)) continue;
        if (bySlug.has(slug)) continue;
        bySlug.set(slug, row);
    }
    return bySlug;
}

function buildDictionary(root, approvedSlugs) {
    const approved = new Set(approvedSlugs);
    const v2BySlug = loadV2BySlug(root);
    const common5k = loadCommon5kBySlug(root);

    const dictionary = Object.create(null);
    const stats = {
        approvedTotal: approvedSlugs.length,
        approvedWithPage: 0,
        accepted: 0,
        withPos: 0,
        source: { v2: 0, common5k: 0 },
        rejected: {
            missingPage: 0,
            noTrustedBangla: 0,
            v2PresentButRejected: 0,
            common5kPresentButRejected: 0
        }
    };

    for (const slug of approvedSlugs) {
        assertSafeSlug(slug);
        if (!fs.existsSync(wordPagePath(root, slug))) {
            stats.rejected.missingPage += 1;
            continue;
        }
        stats.approvedWithPage += 1;

        let bn = null;
        let pos = null;
        let source = null;

        const v2 = v2BySlug.get(slug);
        if (v2) {
            const sense = primarySense(v2);
            const display = sense && sense.bangla_meaning && sense.bangla_meaning.display;
            if (isTrustworthyBangla(display)) {
                bn = display.trim();
                pos = normalizePos(sense.pos);
                source = 'v2';
            } else {
                stats.rejected.v2PresentButRejected += 1;
            }
        }

        if (!bn) {
            const row = common5k.get(slug);
            if (row) {
                if (isTrustworthyBangla(row.bangla)) {
                    bn = String(row.bangla).trim();
                    pos = normalizePos(row.pos);
                    source = 'common5k';
                } else {
                    stats.rejected.common5kPresentButRejected += 1;
                }
            }
        }

        if (!bn || !source) {
            stats.rejected.noTrustedBangla += 1;
            continue;
        }

        if (!approved.has(slug)) {
            throw new Error('internal error: non-approved slug leaked: ' + slug);
        }

        const entry = { slug, bn };
        if (pos) entry.pos = pos;
        dictionary[slug] = entry;
        stats.accepted += 1;
        stats.source[source] += 1;
        if (pos) stats.withPos += 1;
    }

    return { dictionary, stats };
}

function buildPhrases(root) {
    const allowlist = phraseLib.loadAllowlist(root);
    const released = [...phraseLib.releasedSlugs(root, allowlist)];
    if (released.length === 0) {
        throw new Error('no released phrases found via releasedSlugs()');
    }

    const phrases = [];
    for (const slug of released.sort()) {
        assertSafeSlug(slug);
        if (!fs.existsSync(phrasePagePath(root, slug))) {
            throw new Error('released phrase page missing: phrase/' + slug + '.html');
        }
        const record = phraseLib.loadRecord(slug, root);
        if (!record || record.status !== 'REVIEWED') {
            throw new Error('released phrase record is not REVIEWED: ' + slug);
        }
        const bn = record.quick_answer && record.quick_answer.bangla_display;
        if (!isTrustworthyBangla(bn)) {
            throw new Error('released phrase lacks trustworthy Bangla display: ' + slug);
        }
        const display = typeof record.phrase_display === 'string' && record.phrase_display.trim()
            ? record.phrase_display.trim()
            : String(record.phrase || '').trim();
        const phrase = phraseLib.normalizeText(record.phrase);
        if (!phrase || !display) {
            throw new Error('released phrase missing English phrase text: ' + slug);
        }
        phrases.push({
            phrase,
            display,
            bn: String(bn).trim(),
            slug
        });
    }
    return phrases;
}

function build({ root = ROOT, write = true } = {}) {
    const approvedSlugs = loadApprovedSlugs(root);
    const { dictionary, stats } = buildDictionary(root, approvedSlugs);
    const phrases = buildPhrases(root);

    if (stats.accepted === 0) {
        throw new Error('dictionary lookup is empty after quality gates');
    }

    const payload = {
        version: 1,
        dictionary,
        phrases
    };

    const text = canonicalJson(payload);
    const buffer = Buffer.from(text, 'utf8');
    const outPath = path.join(root, OUT_REL);

    if (write) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, buffer);
    }

    const report = {
        ...stats,
        phraseCount: phrases.length,
        phraseSlugs: phrases.map((item) => item.slug),
        bytes: buffer.byteLength,
        sha256: sha256Buffer(buffer),
        coveragePct: Number(((100 * stats.accepted) / stats.approvedTotal).toFixed(2)),
        posCoveragePct: Number(((100 * stats.withPos) / stats.approvedTotal).toFixed(2)),
        outPath
    };

    return { payload, text, buffer, report, outPath };
}

function printReport(report) {
    console.log('translate-enrichment-v1 build report');
    console.log('  approvedTotal          ', report.approvedTotal);
    console.log('  approvedWithPage       ', report.approvedWithPage);
    console.log('  acceptedBangla         ', report.accepted, '(' + report.coveragePct + '%)');
    console.log('  acceptedWithPos        ', report.withPos, '(' + report.posCoveragePct + '%)');
    console.log('  source.v2              ', report.source.v2);
    console.log('  source.common5k        ', report.source.common5k);
    console.log('  rejected.missingPage   ', report.rejected.missingPage);
    console.log('  rejected.noTrustedBangla', report.rejected.noTrustedBangla);
    console.log('  rejected.v2Bad         ', report.rejected.v2PresentButRejected);
    console.log('  rejected.common5kBad   ', report.rejected.common5kPresentButRejected);
    console.log('  phrases                ', report.phraseCount, report.phraseSlugs.join(', '));
    console.log('  bytes                  ', report.bytes);
    console.log('  sha256                 ', report.sha256);
    console.log('  wrote                  ', report.outPath);
}

if (require.main === module) {
    const result = build({ root: ROOT, write: true });
    printReport(result.report);
}

module.exports = {
    ROOT,
    OUT_REL,
    V2_RECORD_DIRS,
    MAX_BN_CHARS,
    build,
    canonicalJson,
    isTrustworthyBangla,
    normalizePos,
    sha256Buffer
};
