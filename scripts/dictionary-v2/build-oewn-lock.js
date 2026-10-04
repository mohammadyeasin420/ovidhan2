'use strict';
// SEO-R6A: builds / checks the compact OEWN synset lock (only the synsets referenced by
// dictionary-v2/records/*.json). The full OEWN distribution is never committed.
//
// Usage:
//   node scripts/dictionary-v2/build-oewn-lock.js --archive <english-wordnet-2025.zip> [--check]
//   node scripts/dictionary-v2/build-oewn-lock.js --oewn-dir <extracted oewn2025 dir> [--check]
//
// The OEWN source is verified against dictionary-v2/oewn-2025-provenance.json first (archive SHA-256,
// size, and SHA-256/size of every member). Any mismatch aborts before anything is written.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');

const LOCK_FILE = path.join(lib.V2_DIR, 'oewn-2025-synset-lock.json');

function referencedSynsetIds(recordsDir) {
    const ids = new Set();
    for (const file of fs.readdirSync(recordsDir).filter((f) => f.endsWith('.json')).sort()) {
        const record = lib.readJson(path.join(recordsDir, file));
        for (const sense of record.senses || []) if (sense.source && sense.source.synset_id) ids.add(sense.source.synset_id);
    }
    return [...ids].sort();
}

function buildLock({ synsets, ids, provenance }) {
    const entries = ids.map((id) => {
        const s = synsets.get(id);
        if (!s) throw new Error('Referenced synset not present in OEWN source: ' + id);
        const entry = {
            id: s.id, offset: s.offset, pos: s.pos, ss_type: s.ss_type, words: s.words,
            gloss: s.gloss, definition: s.definition, quoted_examples: s.quoted_examples, line_sha256: s.line_sha256
        };
        const antonyms = lib.lexicalAntonyms(s, synsets);
        if (antonyms.length) entry.lexical_antonyms = antonyms;
        return entry;
    });
    return {
        schema: 'ovidhan.oewn-synset-lock/1',
        oewn_release: '2025',
        archive_sha256: provenance.source.archive_sha256.toLowerCase(),
        license: provenance.source.license,
        purpose: 'Compact, hash-pinned extract of the OEWN synsets referenced by dictionary-v2 records, so validation works offline. Regenerate or check with scripts/dictionary-v2/build-oewn-lock.js.',
        synsets: entries
    };
}

function main() {
    const argv = process.argv.slice(2);
    const args = { check: false };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--check') args.check = true;
        else if (argv[i] === '--archive') args.archive = argv[++i];
        else if (argv[i] === '--oewn-dir') args.dir = argv[++i];
        else throw new Error('Unknown argument: ' + argv[i]);
    }
    const provenance = lib.readJson(path.join(lib.V2_DIR, 'oewn-2025-provenance.json'));
    const source = lib.openOewnSource({ archive: args.archive, dir: args.dir });
    const errors = lib.verifyOewnSource(source, provenance);
    if (errors.length) { console.error('OEWN source verification FAILED:\n' + errors.join('\n')); process.exit(1); }
    const synsets = lib.parseOewnData(source.getFile);
    const ids = referencedSynsetIds(path.join(lib.V2_DIR, 'records'));
    const text = lib.canonicalJson(buildLock({ synsets, ids, provenance }));
    if (args.check) {
        const existing = fs.existsSync(LOCK_FILE) ? lib.toLf(fs.readFileSync(LOCK_FILE, 'utf8')) : null;
        if (existing !== text) { console.error('Synset lock differs from the verified OEWN source.'); process.exit(1); }
        console.log('Synset lock OK: ' + ids.length + ' synsets match the verified source (' + source.kind + ').');
    } else {
        fs.writeFileSync(LOCK_FILE, text, 'utf8');
        console.log('Wrote lock with ' + ids.length + ' synsets (' + source.kind + ' verified).');
    }
}

module.exports = { buildLock, referencedSynsetIds, LOCK_FILE };
if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
