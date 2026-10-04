'use strict';
// SEO-R6C: lists EVERY OEWN 2025 synset in which a cohort lemma appears (all parts of speech), straight from the
// verified OEWN archive. Used by the editor to inspect the full candidate set before choosing learner senses, and by
// r6c.js to prove that the editorial report inspected every candidate. Read-only.
//
// Usage: node scripts/dictionary-v2/r6c-candidates.js --archive <zip> [lemma ...] [--json]

const path = require('node:path');
const lib = require('./lib');

function loadOewn(archive) {
    const provenance = lib.readJson(path.join(lib.V2_DIR, 'oewn-2025-provenance.json'));
    const source = lib.openOewnSource({ archive });
    const errors = lib.verifyOewnSource(source, provenance);
    if (errors.length) throw new Error('OEWN source verification FAILED:\n' + errors.join('\n'));
    const synsets = lib.parseOewnData(source.getFile);
    return { source, provenance, synsets, oewn: lib.oewnFromSynsets(synsets) };
}

// All synsets whose word list contains the lemma (case-insensitive), in OEWN file order within each POS file
// (n, v, a, r); satellites (ss_type "s") are adjective synsets.
function candidatesFor(oewn, lemma) {
    const order = { n: 0, v: 1, a: 2, r: 3 };
    return oewn.synsetsForLemma(lemma)
        .map((s) => ({
            synset_id: s.id, pos: s.pos, ss_type: s.ss_type, words: s.words,
            definition: s.definition, gloss: s.gloss, quoted_examples: s.quoted_examples
        }))
        .sort((a, b) => order[a.synset_id.slice(-1)] - order[b.synset_id.slice(-1)] || (a.synset_id < b.synset_id ? -1 : 1));
}

function main() {
    const argv = process.argv.slice(2);
    let archive = null; let json = false; const lemmas = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--archive') archive = argv[++i];
        else if (argv[i] === '--json') json = true;
        else lemmas.push(argv[i]);
    }
    if (!archive) throw new Error('--archive <zip> is required');
    const { oewn } = loadOewn(archive);
    const out = lemmas.map((lemma) => ({ lemma, candidates: candidatesFor(oewn, lemma) }));
    if (json) { console.log(JSON.stringify(out, null, 2)); return; }
    for (const { lemma, candidates } of out) {
        console.log('\n=== ' + lemma + ' (' + candidates.length + ' candidate synsets) ===');
        for (const c of candidates) console.log(c.synset_id + ' [' + c.pos + '] {' + c.words.join(', ') + '} ' + c.definition + (c.quoted_examples.length ? '  // ' + c.quoted_examples.join(' | ') : ''));
    }
}

module.exports = { loadOewn, candidatesFor };
if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
