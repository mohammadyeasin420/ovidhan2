'use strict';
// SEO-R6C: tests for the 12-word editorial enrichment prototype.
// Run: node tests/dictionary-v2-r6c.test.js
// Offline by design (committed records, report and OEWN lock). The archive-dependent scenarios run only when the
// verified OEWN archive is present (see OVIDHAN_OEWN_ARCHIVE) and are otherwise skipped with a message.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lib = require('../scripts/dictionary-v2/lib');
const r6c = require('../scripts/dictionary-v2/r6c');
const enrich = require('../scripts/dictionary-v2/r6c-enrich');
const { loadContext, validateRecord, validateAll } = require('../scripts/dictionary-v2/validate');
const { buildRecord } = require('../scripts/dictionary-v2/migrate-v1');
const { runParity } = require('../scripts/dictionary-v2/check-v1-parity');
const { candidatesFor, loadOewn } = require('../scripts/dictionary-v2/r6c-candidates');

const root = lib.ROOT;
const ctx = loadContext();
const clone = (value) => JSON.parse(JSON.stringify(value));
const source = enrich.loadSource();
const report = lib.readJson(path.join(root, r6c.REPORT_PATH));
const records = r6c.loadRecords(ctx.v2);
const readPage = (slug) => lib.readV1Page(slug); // the V1 page (live, or its baseline once SEO-R6E replaced it)
const hasError = (errors, fragment) => errors.some((e) => e.includes(fragment));
const validateWith = (overrides = {}) => r6c.validateEditorial({ ctx, source, report, records, ...overrides });
const withRecord = (slug, fn) => { const copy = new Map([...records].map(([k, v]) => [k, clone(v)])); fn(copy.get(slug)); return copy; };
const withReport = (fn) => { const copy = clone(report); fn(copy); return copy; };
const entryOf = (copy, slug) => copy.words.find((w) => w.lemma === slug);

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

const COHORT = ['swarm', 'good', 'chaos', 'designation', 'introvert', 'tough', 'savage', 'repeat', 'crush', 'guess', 'potential', 'waist'];
// The reviewed editorial outcome, frozen here so any change to a selection is a deliberate, visible edit.
const EXPECTED = {
    swarm: ['07382354-n', '02090118-v', '02799106-v'],
    good: ['01131475-a', '02242939-a', '02052395-a', '00065152-a'],
    chaos: ['11275622-n'],
    designation: ['05730691-n', '00159791-n', '00147836-n'],
    introvert: ['08733148-n'],
    tough: ['00755165-a', '02466962-a', '00714724-a', '02464114-a'],
    savage: ['01271347-a', '01166056-v', '00859201-v'],
    repeat: ['00998302-v', '00356508-v', '06728539-n'],
    crush: ['01646506-v', '06932945-n', '01858229-v'],
    guess: ['00703659-v', '00661042-v', '05187326-n'],
    potential: ['01897352-a', '11784386-n'],
    waist: ['04936258-n']
};
const V1_SYNSET = { swarm: '07382354-n', good: '01131475-a', chaos: '11275622-n', designation: '05730691-n', introvert: '08733148-n', tough: '00755165-a', savage: '01271347-a', repeat: '00998302-v', crush: '06932945-n', guess: '05187326-n', potential: '01897352-a', waist: '04936258-n' };

scenario('cohort is exactly the 12 specified words, in the specified order, everywhere', () => {
    assert.deepEqual([...enrich.COHORT], COHORT);
    assert.deepEqual(source.words.map((w) => w.slug), COHORT);
    assert.deepEqual(report.words.map((w) => w.lemma), COHORT);
    assert.equal(new Set(COHORT).size, 12);
    for (const slug of COHORT) {
        assert.ok(records.has(slug), slug + ' record exists');
        assert.ok(ctx.cohort.words.includes(slug), slug + ' in prototype cohort');
        assert.ok(ctx.registry.has(slug), slug + ' approved');
        assert.ok(!ctx.frozen.has(slug), slug + ' not frozen');
    }
    assert.equal(records.size, 28, 'no record was added or removed');
});

scenario('the committed source, report and records validate offline with zero errors', () => {
    assert.deepEqual(validateWith(), []);
    assert.deepEqual(validateAll(ctx), []);
});

scenario('selected synsets, order, counts and V1 identity are exactly the reviewed editorial outcome', () => {
    let total = 0;
    for (const slug of COHORT) {
        const record = records.get(slug);
        assert.deepEqual(record.senses.map((s) => s.source.synset_id), EXPECTED[slug], slug);
        assert.deepEqual(entryOf(report, slug).selected.map((s) => s.synset_id), EXPECTED[slug], slug + ' report');
        assert.equal(entryOf(report, slug).selected_count, EXPECTED[slug].length);
        assert.equal(record.senses.find((s) => s.v1_primary).source.synset_id, V1_SYNSET[slug], slug + ' V1 sense');
        total += EXPECTED[slug].length;
    }
    assert.equal(total, 31);
    assert.equal(report.totals.selected_senses, 31);
    assert.equal(report.totals.new_senses_added, 19);
    assert.equal(report.totals.v1_senses_retained, 12);
    assert.equal(report.totals.candidates_inspected, 91);
    assert.equal(report.totals.rejected_candidates, 60);
    assert.equal(report.totals.words_enriched, 9);
    assert.equal(report.totals.words_unchanged, 3);
    assert.equal(report.totals.words_with_more_than_three_senses, 2);
    assert.deepEqual(report.totals.editorial_risk, { HIGH: 1, LOW: 4, MEDIUM: 7 });
});

scenario('challenge pass: good keeps 4 distinct senses; tough adds the sturdy sense; savage keeps the criticize verb; designation gets both action senses', () => {
    const bangla = (slug) => records.get(slug).senses.map((s) => s.bangla_meaning.display);
    assert.deepEqual(bangla('good'), ['ভালো', 'দক্ষ, পটু', 'সৎ ও নীতিবান', 'উপকারী']);
    assert.equal(new Set(records.get('good').senses.map((s) => s.definition.text)).size, 4);
    assert.ok(records.get('tough').senses.some((s) => s.source.synset_id === '00714724-a' && s.definition.text === 'substantially made or constructed'));
    assert.equal(new Set(bangla('tough')).size, 4);
    assert.ok(entryOf(report, 'tough').more_than_three_justification.includes('sturdy'));
    assert.ok(entryOf(report, 'tough').rejected.every((r) => !/stay within three|keep the entry at/i.test(r.reason)), 'no rejection is justified by a sense-count cap');
    assert.ok(records.get('savage').senses.some((s) => s.source.synset_id === '00859201-v'));
    assert.ok(entryOf(report, 'savage').selected.find((s) => s.synset_id === '00859201-v').reason.includes('Compared with every other modern candidate'));
    assert.ok(!records.get('savage').senses.some((s) => ['09052360-n', '00416181-a'].includes(s.source.synset_id)), 'dated/derogatory person senses stay out');
    assert.deepEqual(entryOf(report, 'designation').rejected, []);
    assert.equal(entryOf(report, 'designation').candidates.length, 3);
    assert.ok(entryOf(report, 'designation').candidates.every((c) => c.decision === 'SELECTED'));
    for (const word of report.words) for (const r of word.rejected) assert.ok(!/stay within three|keep the entry at|four-sense cap/i.test(r.reason), word.lemma + ' ' + r.synset_id);
});

scenario('a deliberately improved V1 learner text is not preferred merely for parity: V2 teaches the new text, V1 text is kept as proof', () => {
    const good = records.get('good');
    const v1 = good.senses.find((s) => s.v1_primary);
    assert.equal(v1.examples[0].bn, 'প্রতি রাতে পড়াশোনা করে সে ভালো ফল করেছিল।');
    assert.equal(v1.v1_revision.v1_original.example_bn, 'প্রতিরাত পড়ে সে ভালো ফল করেছিল।');
    assert.deepEqual(Object.keys(v1.v1_revision.v1_original), ['example_bn'], 'only the awkward Bangla translation was revised');
    assert.equal(v1.examples[0].en, 'She got a good result after studying every night.', 'the English example is unchanged');
    assert.equal(readPage('good').includes(v1.v1_revision.v1_original.example_bn), true, 'the live V1 page still shows exactly the preserved V1 text');
    assert.equal(readPage('good').includes(v1.examples[0].bn), false, 'the live page was not changed');
    assert.equal(v1.definition.v1_original.cleanup_manifest, 'dictionary-v2/definition-cleanup-manifest.json', 'the R6B definition cleanup trail is intact');
    assert.deepEqual(COHORT.filter((slug) => records.get(slug).senses.some((s) => s.v1_revision)), ['good']);
    assert.deepEqual(entryOf(report, 'good').v1_sense_revision.fields_revised, ['example_bn']);
    // parity passes on the preserved original and fails on the revised text
    assert.equal(runParity().results.find((r) => r.slug === 'good').status, 'PASS_CLEANED');
    const html = readPage('good');
    const cleanupEntry = ctx.cleanupManifest.entries.find((e) => e.slug === 'good');
    const { checkParity } = require('../scripts/dictionary-v2/check-v1-parity');
    const noTrail = clone(good); delete noTrail.senses.find((s) => s.v1_primary).v1_revision;
    assert.equal(checkParity(noTrail, html, cleanupEntry).status, 'FAIL', 'the revised text without its V1 trail no longer matches the page');
});

scenario('v1_revision fails closed: only on the V1 sense of an enriched record, must really differ, must be reasoned and consistent', () => {
    const onOther = withRecord('good', (r) => { r.senses[1].v1_revision = clone(r.senses[0].v1_revision); });
    assert.ok(hasError(validateWith({ records: onOther }), 'only the V1 sense may carry v1_revision') || hasError(validateWith({ records: onOther }), 'only allowed on the v1_primary sense'));
    const unchanged = withRecord('good', (r) => { r.senses[0].v1_revision.v1_original.example_bn = r.senses[0].examples[0].bn; });
    assert.ok(hasError(validateWith({ records: unchanged }), 'nothing was revised'));
    const empty = withRecord('good', (r) => { r.senses[0].v1_revision.v1_original = {}; });
    assert.ok(validateWith({ records: empty }).length > 0);
    const noReason = withRecord('good', (r) => { r.senses[0].v1_revision.reason = 'too short'; });
    assert.ok(hasError(validateWith({ records: noReason }), 'must explain the revision'));
    const wrongOriginal = withRecord('good', (r) => { r.senses[0].v1_revision.v1_original.example_bn = 'এটি ভিন্ন লেখা।'; });
    assert.ok(hasError(validateWith({ records: wrongOriginal }), 'V1 parity failed'), 'a wrong preserved original no longer matches the page');
    const reportDenies = withReport((r) => { delete entryOf(r, 'good').v1_sense_revision; });
    assert.ok(hasError(validateWith({ report: reportDenies }), 'v1_revision must be declared consistently'));
    const unknownField = withRecord('good', (r) => { r.senses[0].v1_revision.v1_original.definition = 'x'; });
    assert.ok(validateWith({ records: unknownField }).length > 0);
    const plain = withRecord('swarm', (r) => { r.senses[0].v1_revision = { reason: 'a long enough reason for this', origin: 'OVIDHAN_EDITORIAL', v1_original: { example_bn: 'x' } }; });
    assert.ok(validateWith({ records: plain }).length > 0);
    const oewn = lib.oewnFromLock(ctx.lock);
    const base = buildRecord({ slug: 'good', html: readPage('good'), oewn, archiveSha256: ctx.provenance.source.archive_sha256.toLowerCase(), cleanupEntry: ctx.cleanupManifest.entries.find((e) => e.slug === 'good') });
    const word = clone(enrich.wordSource(source, 'good'));
    word.selected[0].v1_revision.learner.example_bn = base.senses[0].examples[0].bn;
    assert.throws(() => enrich.enrichRecord({ base, word, oewn }), /equals the V1 text/);
    word.selected[0].v1_revision.learner = { definition: 'x' };
    assert.throws(() => enrich.enrichRecord({ base, word, oewn }), /nothing else/);
});

scenario('single-sense words stay byte-identical V1 migrations; enriched words are schema 1.2.0', () => {
    for (const slug of ['chaos', 'introvert', 'waist']) {
        const record = records.get(slug);
        assert.equal(record.record_status, 'V1_MIGRATION', slug);
        assert.equal(record.senses.length, 1);
        assert.ok(!('editorial_enrichment' in record));
        assert.equal(entryOf(report, slug).record_outcome, 'UNCHANGED_V1_RETAINED');
        assert.equal(entryOf(report, slug).v1_learner_gap.meaningful, false);
    }
    for (const slug of ['swarm', 'good', 'designation', 'tough', 'savage', 'repeat', 'crush', 'guess', 'potential']) {
        const record = records.get(slug);
        assert.equal(record.record_status, 'EDITORIAL_ENRICHED', slug);
        assert.equal(record.schema_version, '1.2.0');
        assert.ok(record.senses.length >= 2);
        assert.equal(entryOf(report, slug).v1_learner_gap.meaningful, true);
    }
    for (const slug of ctx.cohort.words.filter((w) => !COHORT.includes(w))) assert.equal(records.get(slug).record_status, 'V1_MIGRATION', slug + ' untouched');
});

scenario('V1 sense is retained verbatim and traceable; only crush and guess change the order', () => {
    const changed = COHORT.filter((slug) => records.get(slug).senses[0].v1_primary !== true);
    assert.deepEqual(changed, ['crush', 'guess']);
    assert.deepEqual(report.words.filter((w) => w.order_changed).map((w) => w.lemma), ['crush', 'guess']);
    const oewn = lib.oewnFromLock(ctx.lock);
    const sha = ctx.provenance.source.archive_sha256.toLowerCase();
    const cleanupEntries = new Map(ctx.cleanupManifest.entries.map((e) => [e.slug, e]));
    for (const slug of COHORT) {
        const migrated = buildRecord({ slug, html: readPage(slug), oewn, archiveSha256: sha, cleanupEntry: cleanupEntries.get(slug) });
        const record = records.get(slug);
        const v1 = record.senses.find((s) => s.v1_primary);
        assert.deepEqual({ ...enrich.restoreV1Learner(v1), sense_id: 's1' }, migrated.senses[0], slug + ': V1 sense is the migrated V1 sense verbatim (a declared v1_revision reverts to it exactly)');
        assert.deepEqual(record.provenance, migrated.provenance, slug + ': V1 provenance preserved');
        if (record.editorial_enrichment) {
            assert.equal(record.editorial_enrichment.v1_sense_id, v1.sense_id);
            assert.equal(record.editorial_enrichment.v1_synset_id, V1_SYNSET[slug]);
            assert.ok(record.editorial_enrichment.order_rationale.length > 20);
        }
    }
    const crush = records.get('crush');
    assert.equal(crush.editorial_enrichment.order_changed, true);
    assert.equal(crush.editorial_enrichment.v1_sense_id, 's2');
});

scenario('V1 parity is unchanged by R6C: 19 PASS + 9 PASS_CLEANED + 0 FAIL, and the enriched pages equal the V1 sense', () => {
    const parity = runParity();
    assert.equal(parity.records, 28);
    assert.equal(parity.pass, 19);
    assert.equal(parity.pass_cleaned, 9);
    assert.equal(parity.fail, 0);
});

scenario('every OEWN-derived sense has an exact OEWN definition, synset id, POS and provenance', () => {
    for (const slug of COHORT) {
        for (const sense of records.get(slug).senses) {
            assert.equal(sense.source.type, 'OEWN_2025');
            const locked = ctx.lockById.get(sense.source.synset_id);
            assert.ok(locked, sense.source.synset_id + ' is in the verified lock');
            assert.equal(sense.pos, locked.pos);
            assert.equal(sense.definition.oewn_definition, locked.definition);
            assert.equal(sense.definition.text, locked.definition, slug + ' ' + sense.sense_id + ': learner definition is exactly the OEWN definition');
            assert.equal(sense.definition.origin, 'OEWN_GLOSS');
            assert.ok(!('contamination' in sense.definition));
            assert.ok(!sense.definition.text.includes('"') && !/;\s+-\s/.test(sense.definition.text));
            assert.ok(locked.words.some((w) => w.toLowerCase() === slug));
        }
        assert.equal(records.get(slug).provenance.oewn.archive_sha256, ctx.provenance.source.archive_sha256.toLowerCase());
        assert.equal(records.get(slug).attribution.license, 'CC BY 4.0');
    }
});

scenario('Ovidhan-authored fields are explicitly labelled and complete on every selected sense', () => {
    for (const slug of COHORT) {
        const record = records.get(slug);
        const bengali = /[\u0980-\u09FF]/;
        const explanations = new Set();
        for (const sense of record.senses) {
            assert.equal(sense.bangla_meaning.origin, 'OVIDHAN_EDITORIAL');
            assert.equal(sense.bangla_explanation.origin, 'OVIDHAN_EDITORIAL');
            assert.ok(bengali.test(sense.bangla_meaning.display) && bengali.test(sense.bangla_explanation.text));
            assert.notEqual(sense.bangla_meaning.display, sense.bangla_explanation.text);
            assert.ok(!explanations.has(sense.bangla_explanation.text), slug + ': explanations differ across senses');
            explanations.add(sense.bangla_explanation.text);
            assert.equal(sense.examples.length >= 1, true);
            for (const ex of sense.examples) {
                assert.equal(ex.origin, 'OVIDHAN_EDITORIAL');
                assert.ok(ex.en.trim().length > 15 && bengali.test(ex.bn));
                assert.ok(new RegExp('\\b' + slug, 'i').test(ex.en), slug + ': example uses the headword');
            }
        }
        for (const note of record.usage_notes || []) assert.equal(note.origin, 'OVIDHAN_EDITORIAL');
    }
});

scenario('no OEWN example is reused, and no example is duplicated anywhere in the dictionary', () => {
    const seen = new Map();
    for (const [slug, record] of records) {
        for (const sense of record.senses) for (const ex of sense.examples) {
            const key = ex.en.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
            assert.ok(!seen.has(key), 'duplicate example: ' + ex.en);
            seen.set(key, slug);
        }
    }
    for (const entry of report.words) {
        const oewnExamples = entry.candidates.flatMap((c) => c.quoted_examples).map((x) => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim());
        for (const sense of records.get(entry.lemma).senses) for (const ex of sense.examples) {
            const key = ex.en.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
            assert.ok(oewnExamples.every((q) => !key.includes(q) && !q.includes(key)), entry.lemma + ': example is not an OEWN example');
        }
    }
});

scenario('report: every OEWN candidate is inspected and either selected or rejected with a reason', () => {
    for (const entry of report.words) {
        const ids = entry.candidates.map((c) => c.synset_id);
        assert.equal(new Set(ids).size, ids.length);
        assert.equal(entry.candidates_inspected, ids.length);
        assert.deepEqual([...entry.selected.map((s) => s.synset_id), ...entry.rejected.map((r) => r.synset_id)].sort(), [...ids].sort());
        for (const c of entry.candidates) {
            assert.ok(['noun', 'verb', 'adjective', 'adverb'].includes(c.pos));
            assert.ok(c.words.some((w) => w.toLowerCase() === entry.lemma));
            assert.ok(['SELECTED', 'REJECTED'].includes(c.decision));
        }
        for (const r of entry.rejected) assert.ok(r.reason.length >= 15, entry.lemma + ' ' + r.synset_id);
        for (const s of entry.selected) assert.ok(s.reason.length >= 15);
        assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(entry.editorial_risk));
        assert.equal(typeof entry.v1_learner_gap.meaningful, 'boolean');
        assert.ok(entry.v1_learner_gap.description.length > 20);
        assert.equal(entry.v1_source.synset_id, V1_SYNSET[entry.lemma]);
    }
    assert.ok(entryOf(report, 'good').more_than_three_justification.length > 40);
    assert.ok(entryOf(report, 'repeat').pos_notes.includes('adjective'), 'repeat: the adjective evaluation is recorded');
    assert.equal(lib.canonicalJson(report), lib.toLf(fs.readFileSync(path.join(root, r6c.REPORT_PATH), 'utf8')), 'report is in canonical form');
});

scenario('known V1 learner gaps are closed: swarm/guess/crush verbs, potential noun, repeat noun+recur', () => {
    const posOf = (slug) => records.get(slug).senses.map((s) => s.pos);
    assert.ok(posOf('swarm').includes('verb') && posOf('swarm').includes('noun'));
    assert.ok(posOf('guess').includes('verb') && posOf('guess').includes('noun'));
    assert.equal(records.get('guess').senses[0].pos, 'verb', 'guess: the verb is taught first');
    assert.ok(posOf('crush').includes('verb') && posOf('crush').includes('noun'));
    assert.equal(records.get('crush').senses[0].pos, 'verb', 'crush: the physical verb is taught first');
    assert.ok(posOf('potential').includes('noun') && posOf('potential').includes('adjective'));
    assert.deepEqual(posOf('repeat'), ['verb', 'verb', 'noun']);
    assert.ok(!posOf('repeat').includes('adjective'), 'no OEWN adjective synset exists for repeat');
    assert.deepEqual(candidatesForLock('repeat'), [], 'the lock/report has no repeat adjective candidate');
    function candidatesForLock(slug) { return entryOf(report, slug).candidates.filter((c) => c.pos === 'adjective'); }
});

scenario('sensitive OEWN senses are deliberately not taught (savage: uncivilized people)', () => {
    const rejected = entryOf(report, 'savage').rejected.map((r) => r.synset_id);
    assert.ok(rejected.includes('09052360-n') && rejected.includes('00416181-a'));
    assert.ok(!records.get('savage').senses.some((s) => ['09052360-n', '00416181-a'].includes(s.source.synset_id)));
});

// ---- fail-closed behaviour --------------------------------------------------------------------------------------------

scenario('cohort tampering fails closed (substitute, drop, add)', () => {
    const swapped = clone(source); swapped.words[0].slug = 'swarms';
    assert.ok(hasError(validateWith({ source: swapped }), 'differ from the R6C cohort'));
    const dropped = clone(source); dropped.words.pop();
    assert.ok(hasError(validateWith({ source: dropped }), 'differ from the R6C cohort'));
    const added = clone(source); added.words.push(clone(added.words[0]));
    assert.ok(hasError(validateWith({ source: added }), 'differ from the R6C cohort'));
    const reportDropped = withReport((r) => { r.words.pop(); });
    assert.ok(hasError(validateWith({ report: reportDropped }), 'report words differ from the R6C cohort'));
});

scenario('missing or empty learner fields are rejected (meaning, explanation, example, translation)', () => {
    for (const mutate of [
        (s) => { delete s.bangla_meaning; },
        (s) => { delete s.bangla_explanation; },
        (s) => { s.examples = []; },
        (s) => { delete s.examples[0].bn; },
        (s) => { delete s.examples[0].en; },
        (s) => { s.bangla_meaning.display = ''; },
        (s) => { s.bangla_explanation.text = 'TBD'; },
        (s) => { s.examples[0].bn = '   '; },
        (s) => { delete s.pos; }
    ]) {
        const tampered = withRecord('swarm', (r) => mutate(r.senses[1]));
        const errors = validateWith({ records: tampered });
        assert.ok(errors.length > 0, 'must fail: ' + mutate.toString());
    }
});

scenario('OEWN alignment is enforced: wrong synset, altered gloss, duplicate synset, wrong POS', () => {
    const unknown = withRecord('swarm', (r) => { r.senses[1].source.synset_id = '99999999-v'; });
    assert.ok(hasError(validateWith({ records: unknown }), 'not a valid OEWN 2025 reference'));
    const otherWord = withRecord('swarm', (r) => { r.senses[1].source.synset_id = '02453111-n'; });
    assert.ok(validateWith({ records: otherWord }).length > 0);
    const altered = withRecord('swarm', (r) => { r.senses[1].definition.text = 'move around in big crowds'; });
    assert.ok(hasError(validateWith({ records: altered }), 'exactly the OEWN definition') || hasError(validateWith({ records: altered }), 'must equal the OEWN definition'));
    const relabelled = withRecord('swarm', (r) => { r.senses[1].definition.oewn_definition = 'move around in big crowds'; });
    assert.ok(hasError(validateWith({ records: relabelled }), 'oewn_definition differs'));
    const duplicate = withRecord('swarm', (r) => { r.senses[2].source.synset_id = r.senses[1].source.synset_id; });
    assert.ok(hasError(validateWith({ records: duplicate }), 'duplicate'));
    const wrongPos = withRecord('swarm', (r) => { r.senses[1].pos = 'noun'; });
    assert.ok(hasError(validateWith({ records: wrongPos }), 'POS'));
});

scenario('OEWN example contamination, citation residue and copied examples are rejected', () => {
    const contaminated = withRecord('swarm', (r) => { r.senses[1].definition.text += '; "people were pouring out of the theater"'; });
    const e1 = validateWith({ records: contaminated });
    assert.ok(e1.length > 0 && (hasError(e1, 'quotation marks') || hasError(e1, 'exactly the OEWN')));
    const residue = withRecord('swarm', (r) => { r.senses[1].definition.text += '; - Somebody'; r.senses[1].definition.oewn_definition += '; - Somebody'; });
    assert.ok(validateWith({ records: residue }).length > 0);
    const copied = withRecord('swarm', (r) => { r.senses[2].examples[0].en = 'The garden was swarming with bees'; });
    assert.ok(hasError(validateWith({ records: copied }), 'copies an OEWN example'));
    const copiedLong = withRecord('swarm', (r) => { r.senses[1].examples[0].en = 'People were pouring out of the theater and swarmed everywhere.'; });
    assert.ok(hasError(validateWith({ records: copiedLong }), 'copies an OEWN example'), 'an OEWN example embedded in a longer sentence is still a copy');
    const duplicate = withRecord('swarm', (r) => { r.senses[2].examples[0].en = r.senses[1].examples[0].en; });
    assert.ok(validateWith({ records: duplicate }).length > 0);
});

scenario('editorial quality rules: explanation repeats meaning, duplicated explanation, headword missing, wrong script', () => {
    const repeats = withRecord('swarm', (r) => { r.senses[1].bangla_explanation.text = r.senses[1].bangla_meaning.display; });
    assert.ok(hasError(validateWith({ records: repeats }), 'merely repeats'));
    const duplicated = withRecord('swarm', (r) => { r.senses[2].bangla_explanation.text = r.senses[1].bangla_explanation.text; });
    assert.ok(hasError(validateWith({ records: duplicated }), 'duplicated across senses'));
    const sameMeaning = withRecord('swarm', (r) => { r.senses[2].bangla_meaning.display = r.senses[1].bangla_meaning.display; r.senses[2].pos = r.senses[1].pos; });
    assert.ok(validateWith({ records: sameMeaning }).length > 0);
    const noHeadword = withRecord('swarm', (r) => { r.senses[1].examples[0].en = 'Fans gathered around the cricketer as soon as he left the hotel.'; });
    assert.ok(hasError(validateWith({ records: noHeadword }), 'does not use the headword'));
    const englishBangla = withRecord('swarm', (r) => { r.senses[1].examples[0].bn = 'Fans swarmed around the cricketer.'; });
    assert.ok(hasError(validateWith({ records: englishBangla }), 'no Bangla text'));
    const banglaEnglish = withRecord('swarm', (r) => { r.senses[1].examples[0].en = 'দলবেঁধে swarm'; });
    assert.ok(validateWith({ records: banglaEnglish }).length > 0);
    const relabelled = withRecord('swarm', (r) => { r.senses[1].bangla_explanation.origin = 'OEWN_GLOSS'; });
    assert.ok(validateWith({ records: relabelled }).length > 0);
});

scenario('V1 traceability is mandatory: missing v1_primary, wrong synset, wrong rationale, order claim mismatch', () => {
    const noV1 = withRecord('crush', (r) => { delete r.senses[1].v1_primary; });
    assert.ok(hasError(validateWith({ records: noV1 }), 'exactly one sense must be the V1 primary sense'));
    const twoV1 = withRecord('crush', (r) => { r.senses[0].v1_primary = true; });
    assert.ok(hasError(validateWith({ records: twoV1 }), 'exactly one sense must be the V1 primary sense'));
    const wrongPointer = withRecord('crush', (r) => { r.editorial_enrichment.v1_sense_id = 's1'; });
    assert.ok(hasError(validateWith({ records: wrongPointer }), 'v1_sense_id'));
    const wrongSynset = withRecord('crush', (r) => { r.editorial_enrichment.v1_synset_id = '01646506-v'; });
    assert.ok(hasError(validateWith({ records: wrongSynset }), 'v1_synset_id'));
    const orderLie = withRecord('crush', (r) => { r.editorial_enrichment.order_changed = false; });
    assert.ok(hasError(validateWith({ records: orderLie }), 'order_changed'));
    const dropped = withRecord('guess', (r) => { r.senses = r.senses.filter((s) => !s.v1_primary); r.senses.forEach((s, i) => { s.sense_id = 's' + (i + 1); }); });
    assert.ok(validateWith({ records: dropped }).length > 0);
    const editedV1 = withRecord('tough', (r) => { r.senses[0].bangla_explanation.text += ' extra'; });
    assert.ok(hasError(validateWith({ records: editedV1 }), 'V1 parity failed'), 'a silently edited V1 sense breaks parity with the live page');
    const reportLie = withReport((r) => { entryOf(r, 'crush').v1_source.synset_id = '01646506-v'; });
    assert.ok(hasError(validateWith({ report: reportLie }), 'v1_source'));
    const enrichedNoBlock = withRecord('crush', (r) => { delete r.editorial_enrichment; });
    assert.ok(hasError(validateWith({ records: enrichedNoBlock }), 'editorial_enrichment is required'));
    const wrongSchema = withRecord('crush', (r) => { r.schema_version = '1.1.0'; });
    assert.ok(hasError(validateWith({ records: wrongSchema }), 'schema_version 1.2.0 is required'));
    const legacyWithBlock = withRecord('chaos', (r) => { r.editorial_enrichment = clone(records.get('crush').editorial_enrichment); });
    assert.ok(validateWith({ records: legacyWithBlock }).length > 0);
});

scenario('report integrity is enforced: candidates, partition, reasons, counts, risk, justification, totals', () => {
    const dropCandidate = withReport((r) => { const e = entryOf(r, 'good'); e.candidates = e.candidates.slice(1); });
    assert.ok(validateWith({ report: dropCandidate }).length > 0);
    const noReason = withReport((r) => { entryOf(r, 'good').rejected[0].reason = ''; });
    assert.ok(hasError(validateWith({ report: noReason }), 'rejection reason'));
    const unrejected = withReport((r) => { entryOf(r, 'good').rejected.pop(); });
    assert.ok(hasError(validateWith({ report: unrejected }), 'do not equal the inspected candidates'));
    const both = withReport((r) => { const e = entryOf(r, 'good'); e.rejected.push({ ...e.rejected[0], synset_id: e.selected[0].synset_id }); });
    assert.ok(hasError(validateWith({ report: both }), 'selected and rejected'));
    const count = withReport((r) => { entryOf(r, 'swarm').selected_count = 2; });
    assert.ok(hasError(validateWith({ report: count }), 'selected_count'));
    const badRisk = withReport((r) => { entryOf(r, 'swarm').editorial_risk = 'SEVERE'; });
    assert.ok(hasError(validateWith({ report: badRisk }), 'editorial_risk'));
    const noJustification = withReport((r) => { delete entryOf(r, 'good').more_than_three_justification; });
    assert.ok(hasError(validateWith({ report: noJustification }), 'more_than_three_justification'));
    const noGap = withReport((r) => { entryOf(r, 'swarm').v1_learner_gap = { meaningful: true, description: '' }; });
    assert.ok(hasError(validateWith({ report: noGap }), 'v1_learner_gap'));
    const wrongTotals = withReport((r) => { r.totals.selected_senses = 29; });
    assert.ok(hasError(validateWith({ report: wrongTotals }), 'totals'));
    const wrongDefinition = withReport((r) => { entryOf(r, 'swarm').candidates.find((c) => c.decision === 'SELECTED').definition = 'something else'; });
    assert.ok(hasError(validateWith({ report: wrongDefinition }), 'differs from the OEWN lock'));
    const order = withReport((r) => { const e = entryOf(r, 'crush'); e.selected.reverse(); });
    assert.ok(validateWith({ report: order }).length > 0);
    const wrongOutcome = withReport((r) => { entryOf(r, 'chaos').record_outcome = 'ENRICHED'; });
    assert.ok(hasError(validateWith({ report: wrongOutcome }), 'record_outcome'));
});

scenario('records outside the cohort stay V1 migrations; frozen and unapproved words are rejected', () => {
    const outside = withRecord('lunch', (r) => { r.record_status = 'EDITORIAL_ENRICHED'; });
    assert.ok(hasError(validateWith({ records: outside }), 'outside the R6C cohort'));
    const notApproved = clone(source); notApproved.words[0].slug = 'weird';
    assert.ok(validateWith({ source: notApproved }).length > 0);
    assert.ok(ctx.frozen.has('weird') && ctx.registry.has('weird'));
});

scenario('enrichRecord: deterministic, leaves single-sense words unchanged, refuses an inconsistent source', () => {
    const oewn = lib.oewnFromLock(ctx.lock);
    const sha = ctx.provenance.source.archive_sha256.toLowerCase();
    const cleanupEntries = new Map(ctx.cleanupManifest.entries.map((e) => [e.slug, e]));
    const base = (slug) => buildRecord({ slug, html: readPage(slug), oewn, archiveSha256: sha, cleanupEntry: cleanupEntries.get(slug) });
    for (const slug of COHORT) {
        const word = enrich.wordSource(source, slug);
        const a = enrich.enrichRecord({ base: base(slug), word, oewn });
        const b = enrich.enrichRecord({ base: base(slug), word, oewn });
        assert.equal(lib.canonicalJson(a), lib.canonicalJson(b));
        assert.equal(lib.canonicalJson(a), lib.toLf(fs.readFileSync(path.join(root, 'dictionary-v2', 'records', slug + '.json'), 'utf8')), slug + ' committed bytes');
        if (!enrich.isEnriched(word)) { const original = base(slug); assert.equal(enrich.enrichRecord({ base: original, word, oewn }), original); }
    }
    const crush = clone(enrich.wordSource(source, 'crush'));
    const wrongV1 = clone(crush); wrongV1.selected.find((s) => s.v1).synset_id = '01646506-v'; wrongV1.selected.find((s) => s.learner).synset_id = '06932945-n';
    assert.throws(() => enrich.enrichRecord({ base: base('crush'), word: wrongV1, oewn }), /V1/);
    const dup = clone(crush); dup.selected[2].synset_id = dup.selected[0].synset_id;
    assert.throws(() => enrich.enrichRecord({ base: base('crush'), word: dup, oewn }), /duplicate selected synset/);
    const noLearner = clone(crush); delete noLearner.selected[0].learner;
    assert.throws(() => enrich.enrichRecord({ base: base('crush'), word: noLearner, oewn }), /no learner layer/);
    const unknown = clone(crush); unknown.selected[2].synset_id = '99999999-v';
    assert.throws(() => enrich.enrichRecord({ base: base('crush'), word: unknown, oewn }), /not found in OEWN/);
    const notBase = base('crush'); notBase.senses.push(clone(notBase.senses[0]));
    assert.throws(() => enrich.enrichRecord({ base: notBase, word: crush, oewn }), /single-sense V1 migration/);
});

scenario('scope guard: only Dictionary V2 data, tools and tests may change; production files may not', () => {
    assert.deepEqual(r6c.guardCheck(['dictionary-v2/records/crush.json', 'dictionary-v2/r6c-editorial-report.json', 'scripts/dictionary-v2/r6c.js', 'tests/dictionary-v2-r6c.test.js']), []);
    for (const p of ['word/crush.html', 'word/weird.html', 'data/approved-static-word-slugs.json', 'sitemap.xml', 'sitemap-part-1.xml', 'sitemap-approved-words.xml', 'robots.txt', 'dictionary.html', 'dictionary-a.html', 'dictionary/a.html', 'deploy-production.ps1', 'learning-explorer.js', 'reports/dictionary-seo-treatment-manifest-2e.csv', 'data/seo-word-pilot-7a1.json']) {
        assert.ok(r6c.guardCheck([p]).length === 1, 'must be flagged: ' + p);
    }
    assert.ok(hasError(r6c.guardCheck(['index.html']), 'outside the R6C scope'));
    assert.ok(hasError(r6c.guardCheck(['research/x.json']), 'outside the R6C scope'));
    assert.ok(hasError(r6c.guardCheck(['dictionary-v2-evil/x.json']), 'outside the R6C scope'));
});

scenario('production safety: dictionary-v2 stays undeployed and no word page references R6C', () => {
    const deploy = fs.readFileSync(path.join(root, 'deploy-production.ps1'), 'utf8');
    assert.ok(!/dictionary-v2/.test(deploy));
    for (const slug of COHORT) assert.ok(!/r6c|editorial_enrichment/i.test(readPage(slug)), slug + '.html does not mention R6C');
});

scenario('archive-dependent: every OEWN candidate is inspected and the report derives from the verified archive', () => {
    const candidates = [process.env.OVIDHAN_OEWN_ARCHIVE, process.env.USERPROFILE && path.join(process.env.USERPROFILE, 'Downloads', 'english-wordnet-2025.zip')].filter(Boolean);
    const archive = candidates.find((c) => fs.existsSync(c));
    if (!archive) { console.log('  SKIP no OEWN archive available'); return; }
    const { provenance, oewn } = loadOewn(archive);
    assert.deepEqual(validateWith({ oewn }), []);
    assert.equal(lib.canonicalJson(r6c.buildReport({ source, oewn, provenance })), lib.canonicalJson(report), 'report is exactly derivable from the archive');
    for (const slug of COHORT) assert.equal(entryOf(report, slug).candidates_inspected, candidatesFor(oewn, slug).length, slug);
    const fewer = withReport((r) => { const e = entryOf(r, 'good'); e.candidates.pop(); e.candidates_inspected -= 1; });
    assert.ok(validateWith({ oewn, report: fewer }).length > 0, 'a report that skips an archive candidate is rejected');
    const wrongGloss = withReport((r) => { entryOf(r, 'good').candidates[0].definition = 'tampered'; });
    assert.ok(hasError(validateWith({ oewn, report: wrongGloss }), 'differs from the verified OEWN archive'));
});

console.log('All dictionary-v2 R6C tests passed.');
