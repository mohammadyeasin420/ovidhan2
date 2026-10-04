'use strict';
// SEO-R6C: turns the authored editorial source (dictionary-v2/r6c-editorial-source.json) into Dictionary V2 records.
//
// Rules this module enforces by construction:
//   * a definition is ALWAYS the exact OEWN definition of the selected synset (never written by hand);
//   * the V1 sense is taken verbatim from the migrated V1 record and keeps v1_primary: true wherever it is placed;
//   * every Ovidhan-written field carries origin OVIDHAN_EDITORIAL;
//   * a word whose only selected sense is the V1 sense is returned UNCHANGED (still a V1_MIGRATION record).
// Pure functions only: nothing here touches the file system except loadSource.

const path = require('node:path');
const lib = require('./lib');

const PHASE = 'SEO-R6C';
const COHORT_ID = 'SEO_R6C_EDITORIAL_12';
const REPORT_FILE = 'dictionary-v2/r6c-editorial-report.json';
const SOURCE_FILE = 'dictionary-v2/r6c-editorial-source.json';
const SCHEMA_VERSION = '1.2.0';
// The R6C cohort, exactly as specified. Adding or substituting a word is an explicit decision made here.
const COHORT = Object.freeze(['swarm', 'good', 'chaos', 'designation', 'introvert', 'tough', 'savage', 'repeat', 'crush', 'guess', 'potential', 'waist']);

function loadSource(root = lib.ROOT) {
    return lib.readJson(path.join(root, SOURCE_FILE));
}

function wordSource(source, slug) {
    return source.words.find((w) => w.slug === slug) || null;
}

// A word keeps its V1_MIGRATION record when the V1 sense is its only selected sense.
function isEnriched(word) {
    return !(word.selected.length === 1 && word.selected[0].v1 === true);
}

const REVISABLE = ['bangla_meaning', 'bangla_explanation', 'example_en', 'example_bn'];

// Challenge pass: a V1 learner field may be deliberately improved. The exact V1 text is preserved in
// sense.v1_revision.v1_original (so V1 parity and traceability hold) and the reason is recorded. The OEWN definition and
// synset identity of the V1 sense are never revised.
function reviseV1Sense(sense, revision, slug) {
    if (!revision) return sense;
    const fields = Object.keys(revision.learner || {});
    if (!fields.length || fields.some((f) => !REVISABLE.includes(f))) throw new Error(slug + ': v1_revision must revise at least one of ' + REVISABLE.join(', ') + ' and nothing else');
    const current = { bangla_meaning: sense.bangla_meaning.display, bangla_explanation: sense.bangla_explanation.text, example_en: sense.examples[0].en, example_bn: sense.examples[0].bn };
    const original = {};
    for (const field of fields) {
        if (revision.learner[field] === current[field]) throw new Error(slug + ': v1_revision.' + field + ' equals the V1 text');
        original[field] = current[field];
    }
    if (revision.learner.bangla_meaning !== undefined) sense.bangla_meaning = { ...sense.bangla_meaning, display: revision.learner.bangla_meaning };
    if (revision.learner.bangla_explanation !== undefined) sense.bangla_explanation = { ...sense.bangla_explanation, text: revision.learner.bangla_explanation };
    sense.examples = [{ ...sense.examples[0], ...(revision.learner.example_en !== undefined ? { en: revision.learner.example_en } : {}), ...(revision.learner.example_bn !== undefined ? { bn: revision.learner.example_bn } : {}) }, ...sense.examples.slice(1)];
    sense.v1_revision = { reason: revision.reason, v1_original: original, origin: 'OVIDHAN_EDITORIAL' };
    return sense;
}

// Inverse of reviseV1Sense: the sense exactly as the live V1 page shows it (used by tests and traceability checks).
function restoreV1Learner(sense) {
    const out = JSON.parse(JSON.stringify(sense));
    if (!out.v1_revision) return out;
    const original = out.v1_revision.v1_original;
    if (original.bangla_meaning !== undefined) out.bangla_meaning.display = original.bangla_meaning;
    if (original.bangla_explanation !== undefined) out.bangla_explanation.text = original.bangla_explanation;
    if (original.example_en !== undefined) out.examples[0].en = original.example_en;
    if (original.example_bn !== undefined) out.examples[0].bn = original.example_bn;
    delete out.v1_revision;
    return out;
}

function enrichRecord({ base, word, oewn }) {
    if (!isEnriched(word)) return base;
    if (base.senses.length !== 1 || base.senses[0].v1_primary !== true) throw new Error(base.slug + ': R6C enrichment needs the single-sense V1 migration record as its base');
    const v1Sense = base.senses[0];
    const synsetIds = word.selected.map((s) => s.synset_id);
    if (new Set(synsetIds).size !== synsetIds.length) throw new Error(base.slug + ': duplicate selected synset');
    if (synsetIds.filter((id) => id === v1Sense.source.synset_id).length !== 1 || word.selected.filter((s) => s.v1).length !== 1) throw new Error(base.slug + ': the V1 sense must be selected exactly once');
    if (word.selected.find((s) => s.v1).synset_id !== v1Sense.source.synset_id) throw new Error(base.slug + ': the source marks a synset as V1 that is not the V1 page synset');

    const senses = word.selected.map((selected, index) => {
        const sense_id = 's' + (index + 1);
        if (selected.v1) return reviseV1Sense({ ...JSON.parse(JSON.stringify(v1Sense)), sense_id }, selected.v1_revision, base.slug);
        const synset = oewn.get(selected.synset_id);
        if (!synset) throw new Error(base.slug + ': selected synset ' + selected.synset_id + ' not found in OEWN');
        const learner = selected.learner;
        if (!learner) throw new Error(base.slug + ': selected synset ' + selected.synset_id + ' has no learner layer');
        return {
            sense_id,
            pos: synset.pos,
            source: { type: 'OEWN_2025', synset_id: synset.id },
            definition: { text: synset.definition, origin: 'OEWN_GLOSS', oewn_definition: synset.definition },
            bangla_meaning: { display: learner.bangla_meaning, origin: 'OVIDHAN_EDITORIAL' },
            bangla_explanation: { text: learner.bangla_explanation, origin: 'OVIDHAN_EDITORIAL' },
            examples: [{ en: learner.example_en, bn: learner.example_bn, origin: 'OVIDHAN_EDITORIAL' }]
        };
    });
    const senseIdOf = (synsetId) => senses.find((s) => s.source.synset_id === synsetId).sense_id;
    const v1Index = senses.findIndex((s) => s.v1_primary === true);

    const record = {
        ...JSON.parse(JSON.stringify(base)),
        schema_version: SCHEMA_VERSION,
        record_status: 'EDITORIAL_ENRICHED',
        senses,
        editorial_enrichment: {
            phase: PHASE,
            report: REPORT_FILE,
            v1_sense_id: senses[v1Index].sense_id,
            v1_synset_id: v1Sense.source.synset_id,
            order_changed: v1Index !== 0,
            order_rationale: word.order_rationale,
            origin: 'OVIDHAN_EDITORIAL'
        }
    };
    if (word.usage_notes && word.usage_notes.length) {
        record.usage_notes = word.usage_notes
            .map((note) => ({ text: note.text, sense_id: senseIdOf(note.synset_id), origin: 'OVIDHAN_EDITORIAL' }))
            .sort((a, b) => ((a.sense_id + '|' + a.text) < (b.sense_id + '|' + b.text) ? -1 : 1));
    }
    return record;
}

module.exports = { PHASE, COHORT_ID, REPORT_FILE, SOURCE_FILE, SCHEMA_VERSION, COHORT, loadSource, wordSource, isEnriched, enrichRecord, restoreV1Learner };
