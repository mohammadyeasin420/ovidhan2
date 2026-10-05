'use strict';
// SEO-R7E-P3: build and render the remaining frozen pilot pages.
// Uses the existing production renderer. Does not widen the R6E allowlist of 12.
//
//   node scripts/dictionary-v2/r7e-p3.js
//
// Writes dictionary-v2/r7e-p1/<slug>.json for the 45 new words, rewrites those
// word pages, and appends the new slugs to the approved registry.
// Does not rewrite the three proof records. Does not touch sitemap.xml.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const lib = require('./lib');
const render = require('./render');
const { EDITORIAL } = require('./r7e-editorial');

const SELECTION = path.join(lib.ROOT, 'research', 'SEO_R7E_PILOT_SELECTION.json');
const EXPECTED_SHA = 'daee1da69b788720f660ff261aed76e22e6b54fe7fba733dab38027ed0bad877';
const PROOF = ['inspection', 'incredible', 'interact'];
const ARCHIVE = 'C:/Users/yeasi/Downloads/english-wordnet-2025.zip';
const RECORD_DIR = path.join(lib.ROOT, 'dictionary-v2', 'r7e-p1');
const PHRASE = 'Bengali';
const WEAK = [/^this is a /i, /^i saw a /i, /the \w+ was good\b/i];

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function recordFor(word, shellHash) {
    const edit = EDITORIAL[word.slug];
    return {
        schema_version: '1.0.0',
        record_status: 'V1_MIGRATION',
        slug: word.slug,
        headword: word.headword,
        attribution: lib.ATTRIBUTION,
        provenance: {
            oewn: {
                release: '2025',
                archive_sha256: '38b16326159f51853626b7d24a44c453fa88ab33f06fce5ec8fc5996d1c2be93',
                provenance_file: 'dictionary-v2/oewn-2025-provenance.json'
            },
            v1_migration: {
                tool: 'scripts/dictionary-v2/r7e-p3.js',
                source_page: 'word/' + word.slug + '.html',
                source_page_sha256_lf: shellHash
            }
        },
        senses: [{
            sense_id: 's1',
            pos: word.part_of_speech,
            v1_primary: true,
            source: { type: 'OEWN_2025', synset_id: word.intended_head_sense.id },
            definition: {
                text: word.intended_head_sense.definition,
                origin: 'OEWN_GLOSS',
                oewn_definition: word.intended_head_sense.definition
            },
            bangla_meaning: { display: edit.display, origin: 'OVIDHAN_EDITORIAL' },
            bangla_explanation: { text: edit.explanation, origin: 'OVIDHAN_EDITORIAL' },
            examples: [{ en: edit.en, bn: edit.bn, origin: 'OVIDHAN_EDITORIAL' }]
        }]
    };
}

function main() {
    const raw = fs.readFileSync(SELECTION);
    if (sha256(raw) !== EXPECTED_SHA) throw new Error('selection SHA mismatch');
    const selection = JSON.parse(raw.toString('utf8'));
    if (selection.words.length !== 48) throw new Error('pilot is not 48');
    const proof = selection.words.filter((w) => PROOF.includes(w.slug));
    const remaining = selection.words.filter((w) => !PROOF.includes(w.slug));
    if (proof.length !== 3 || remaining.length !== 45) throw new Error('48 - 3 is not 45');
    const editKeys = Object.keys(EDITORIAL).sort();
    const remainKeys = remaining.map((w) => w.slug).sort();
    if (editKeys.join('\n') !== remainKeys.join('\n')) throw new Error('editorial keys do not match the remaining 45');

    const frozen = lib.loadFrozenWords();
    const registry = lib.loadRegistry();
    const source = lib.openOewnSource({ archive: ARCHIVE });
    const provenance = lib.readJson(path.join(lib.ROOT, 'dictionary-v2', 'oewn-2025-provenance.json'));
    const sourceErrors = lib.verifyOewnSource(source, provenance);
    if (sourceErrors.length) throw new Error(sourceErrors.join('; '));
    const synsets = lib.parseOewnData(source.getFile);

    const seenText = { explanation: new Map(), en: new Map(), bn: new Map(), display: new Map() };
    for (const slug of PROOF) {
        const record = lib.readJson(path.join(RECORD_DIR, slug + '.json'));
        const sense = record.senses[0];
        seenText.explanation.set(sense.bangla_explanation.text, slug);
        seenText.en.set(sense.examples[0].en, slug);
        seenText.bn.set(sense.examples[0].bn, slug);
        seenText.display.set(sense.bangla_meaning.display, slug);
    }

    for (const word of remaining) {
        if (word.headword !== word.slug) throw new Error(word.slug + ': headword mismatch');
        if (word.lexical !== 'CLEAR' || word.polysemy !== 1) throw new Error(word.slug + ': not a clear one-sense candidate');
        if (word.frozen_experiment) throw new Error(word.slug + ': frozen');
        if (frozen.has(word.slug)) throw new Error(word.slug + ': frozen set');
        if ((word.sensitivity || []).length) throw new Error(word.slug + ': sensitivity tag');
        const pagePath = path.join(lib.ROOT, 'word', word.slug + '.html');
        if (!fs.existsSync(pagePath)) throw new Error(word.slug + ': page missing');
        const syn = synsets.get(word.intended_head_sense.id);
        if (!syn) throw new Error(word.slug + ': synset missing');
        if (syn.definition !== word.intended_head_sense.definition) throw new Error(word.slug + ': gloss mismatch');
        if (syn.pos !== word.intended_head_sense.pos || syn.pos !== word.part_of_speech) throw new Error(word.slug + ': POS mismatch');
        const edit = EDITORIAL[word.slug];
        if (!edit.display || !edit.explanation || !edit.en || !edit.bn) throw new Error(word.slug + ': empty editorial field');
        if (WEAK.some((re) => re.test(edit.en))) throw new Error(word.slug + ': weak example');
        const lower = edit.en.toLowerCase();
        if (!lower.includes(word.slug) && !lower.includes(word.slug.replace(/e$/, ''))) throw new Error(word.slug + ': example omits the headword');
        for (const quote of syn.quoted_examples) {
            if (quote && lower.includes(quote.toLowerCase())) throw new Error(word.slug + ': copies an OEWN example');
        }
        for (const [kind, map] of Object.entries(seenText)) {
            const value = kind === 'explanation' ? edit.explanation : kind === 'display' ? edit.display : edit[kind];
            if (map.has(value)) throw new Error(word.slug + ' duplicates ' + map.get(value) + ' ' + kind);
            map.set(value, word.slug);
        }
        const recordPath = path.join(RECORD_DIR, word.slug + '.json');
        if (!fs.existsSync(recordPath)) {
            const before = fs.readFileSync(pagePath);
            if (lib.isV2ProductionPage(before.toString('utf8'))) throw new Error(word.slug + ': already V2 before its record exists');
            if (registry.has(word.slug)) throw new Error(word.slug + ': already approved');
            fs.writeFileSync(recordPath, lib.canonicalJson(recordFor(word, lib.sha256Lf(before))));
        } else {
            const existing = lib.readJson(recordPath);
            const sense = existing.senses[0];
            if (sense.bangla_meaning.display !== edit.display || sense.bangla_explanation.text !== edit.explanation || sense.examples[0].en !== edit.en || sense.examples[0].bn !== edit.bn) {
                throw new Error(word.slug + ': record differs from the editorial module');
            }
        }
    }

    const cohort = selection.words.map((w) => w.slug);
    const shell = render.loadShell();
    for (const slug of cohort) {
        const record = lib.readJson(path.join(RECORD_DIR, slug + '.json'));
        if (record.slug !== slug || record.senses.length !== 1) throw new Error(slug + ': record shape');
        const html = render.renderPage(record, { mode: 'production', shell, cohort, phrase: PHRASE });
        const problems = render.productionContractProblems(html, record, { phrase: PHRASE });
        if (problems.length) throw new Error(slug + ': ' + problems.join('; '));
        if (html.includes('Meaning in Bangla') || html.includes('Bengali (Bangla)')) throw new Error(slug + ': title phrase');
        fs.writeFileSync(path.join(lib.ROOT, 'word', slug + '.html'), html.replace(/\n/g, '\r\n'));
    }

    const registryPath = path.join(lib.ROOT, 'data', 'approved-static-word-slugs.json');
    const registryText = fs.readFileSync(registryPath);
    const crlf = registryText.includes(13);
    let body = registryText.toString('utf8').replace(/\s*\]\s*$/, '');
    const nl = crlf ? '\r\n' : '\n';
    let added = 0;
    for (const slug of cohort) {
        if (registry.has(slug)) continue;
        body += ',' + nl + '  "' + slug + '"';
        added++;
    }
    body += nl + ']' + nl;
    fs.writeFileSync(registryPath, body);
    const after = JSON.parse(body);
    if (new Set(after).size !== after.length) throw new Error('registry duplicate');
    console.log('rendered ' + cohort.length + ' R7E pages; registry appended ' + added + '; approved ' + after.length);
}

if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
