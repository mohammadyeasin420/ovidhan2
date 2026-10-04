'use strict';
// SEO-R6A: focused tests for the Dictionary V2 data foundation.
// Run: node tests/dictionary-v2-foundation.test.js
// Offline by design: everything uses the committed records and the committed OEWN synset lock.
// Archive-dependent checks run only when the OEWN archive is present (see OVIDHAN_OEWN_ARCHIVE).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const lib = require('../scripts/dictionary-v2/lib');
const { loadContext, validateRecord, validateAll, validateLock } = require('../scripts/dictionary-v2/validate');
const { buildRecord } = require('../scripts/dictionary-v2/migrate-v1');
const r6cEnrich = require('../scripts/dictionary-v2/r6c-enrich');
const { checkParity, runParity } = require('../scripts/dictionary-v2/check-v1-parity');

const root = lib.ROOT;
const ctx = loadContext();
const clone = (value) => JSON.parse(JSON.stringify(value));
const readRecord = (slug) => lib.readJson(path.join(root, 'dictionary-v2', 'records', slug + '.json'));
const readPage = (slug) => lib.readV1Page(slug); // the V1 page (live, or its baseline once SEO-R6E replaced it)
const cohortWords = ctx.cohort.words;

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}
const hasError = (errors, fragment) => errors.some((e) => e.includes(fragment));

// SEO-R6C enriched 8 of the cohort records (extra senses, V1 sense possibly not first). The R6A/R6B logic below is about
// the lossless V1 form, so v1Form() reduces a record to exactly the single-sense V1_MIGRATION record it was migrated as.
function v1Form(record) {
    if (record.record_status !== 'EDITORIAL_ENRICHED') return clone(record);
    const out = clone(record);
    const v1 = out.senses.find((s) => s.v1_primary === true);
    out.senses = [{ ...r6cEnrich.restoreV1Learner(v1), sense_id: 's1' }];
    out.record_status = 'V1_MIGRATION';
    out.schema_version = v1.definition.v1_original ? '1.1.0' : '1.0.0';
    delete out.editorial_enrichment;
    delete out.usage_notes;
    return out;
}
const readV1 = (slug) => v1Form(readRecord(slug));
// A valid EDITORIAL_ENRICHED variant of a single-sense record (schema 1.2.0 + editorial_enrichment), for optional-field tests.
function asEnriched(record) {
    const out = clone(record);
    out.record_status = 'EDITORIAL_ENRICHED';
    out.schema_version = '1.2.0';
    out.editorial_enrichment = {
        phase: 'SEO-R6C', report: 'dictionary-v2/r6c-editorial-report.json', v1_sense_id: 's1', v1_synset_id: out.senses[0].source.synset_id,
        order_changed: false, order_rationale: 'Test fixture: the V1 sense stays first.', origin: 'OVIDHAN_EDITORIAL'
    };
    return out;
}
// An enriched variant built from real data, so optional-field tests use genuine OEWN content.
function enrichedTough() { return asEnriched(readV1('tough')); }

scenario('cohort is exactly the 28 R5C words, approved and not frozen', () => {
    assert.equal(cohortWords.length, 28);
    assert.deepEqual(cohortWords, [...cohortWords].sort());
    for (const word of cohortWords) {
        assert.ok(ctx.registry.has(word), word + ' must be approved');
        assert.ok(!ctx.frozen.has(word), word + ' must not be frozen');
    }
    assert.deepEqual(fs.readdirSync(path.join(root, 'dictionary-v2', 'records')).sort(), cohortWords.map((w) => w + '.json'));
});

scenario('frozen set is derived from tracked manifests (186 words)', () => {
    assert.equal(ctx.frozen.size, 186);
});

scenario('schema accepts every committed record and the whole set validates', () => {
    for (const word of cohortWords) assert.deepEqual(lib.validateSchema(readRecord(word), ctx.schema), [], word);
    assert.deepEqual(validateAll(ctx), []);
});

scenario('schema rejects missing, unexpected, malformed and placeholder values', () => {
    const base = readRecord('chaos');
    const missing = clone(base); delete missing.senses[0].bangla_explanation;
    assert.ok(hasError(validateRecord(missing, ctx), 'bangla_explanation'));
    const extra = clone(base); extra.pronunciation = { ipa: 'x' };
    assert.ok(hasError(validateRecord(extra, ctx), 'unexpected property'));
    const badHash = clone(base); badHash.provenance.oewn.archive_sha256 = 'ABC';
    assert.ok(validateRecord(badHash, ctx).length > 0);
    const padded = clone(base); padded.senses[0].bangla_explanation.text = ' leading space';
    assert.ok(validateRecord(padded, ctx).length > 0);
    const noExamples = clone(base); noExamples.senses[0].examples = [];
    assert.ok(validateRecord(noExamples, ctx).length > 0);
});

scenario('placeholders, nulls and empty optional blocks are rejected', () => {
    const tbd = clone(readRecord('chaos')); tbd.senses[0].bangla_explanation.text = 'TBD';
    assert.ok(hasError(validateRecord(tbd, ctx), 'placeholder'));
    const todo = clone(readRecord('chaos')); todo.senses[0].examples[0].en = 'This is a TODO sentence';
    assert.ok(hasError(validateRecord(todo, ctx), 'placeholder'));
    const emptyArray = enrichedTough(); emptyArray.senses[0].synonyms = [];
    assert.ok(validateRecord(emptyArray, ctx).length > 0);
    const nulled = enrichedTough(); nulled.usage_notes = null;
    assert.ok(validateRecord(nulled, ctx).length > 0);
});

scenario('pronunciation/IPA is not required anywhere in the schema', () => {
    assert.ok(!JSON.stringify(ctx.schema.required).includes('pronunciation'));
    assert.ok(!JSON.stringify(ctx.schema).includes('ipa'));
});

scenario('OEWN reference validation: every record points to a valid, aligned synset', () => {
    for (const word of cohortWords) {
        const sense = readRecord(word).senses[0];
        const synset = ctx.lockById.get(sense.source.synset_id);
        assert.ok(synset, word + ' synset in lock');
        assert.ok(synset.words.some((w) => w.toLowerCase() === word));
        assert.equal(synset.pos, sense.pos);
        assert.equal(sense.definition.oewn_definition, synset.definition);
    }
    assert.deepEqual(validateLock(ctx.lock, ctx), []);
});

scenario('invalid source synset is rejected (unknown id, wrong lemma, wrong POS)', () => {
    const unknown = clone(readRecord('chaos')); unknown.senses[0].source.synset_id = '99999999-n';
    assert.ok(hasError(validateRecord(unknown, ctx), 'not a valid OEWN 2025 reference'));
    const malformed = clone(readRecord('chaos')); malformed.senses[0].source.synset_id = '1234';
    assert.ok(validateRecord(malformed, ctx).length > 0);
    const wrongLemma = clone(readRecord('chaos')); wrongLemma.senses[0].source.synset_id = readRecord('waist').senses[0].source.synset_id;
    assert.ok(hasError(validateRecord(wrongLemma, ctx), 'is not a lemma of synset'));
    const wrongPos = clone(readRecord('chaos')); wrongPos.senses[0].pos = 'verb';
    assert.ok(hasError(validateRecord(wrongPos, ctx), 'differs from OEWN synset POS'));
});

scenario('definition/source alignment and contamination are enforced, never repaired', () => {
    // SEO-R6B: the 9 contaminated prototype records now carry the clean OEWN definition plus an auditable v1_original.
    const tough = readRecord('tough').senses[0].definition;
    assert.equal(tough.v1_original.contamination[0].kind, 'OEWN_QUOTED_EXAMPLES_IN_DEFINITION');
    assert.ok(tough.v1_original.text.includes('"a rugged competitive examination"'), 'V1 contamination preserved verbatim in the audit trail');
    assert.equal(tough.text, tough.oewn_definition);
    assert.ok(!tough.text.includes('"'));
    // The legacy (schema 1.0.0) contamination rules still apply to any record that keeps contamination in definition.text.
    const legacy = readV1('tough');
    const legacyDefinition = legacy.senses[0].definition;
    legacy.schema_version = '1.0.0';
    legacyDefinition.text = legacyDefinition.v1_original.text;
    legacyDefinition.contamination = legacyDefinition.v1_original.contamination;
    delete legacyDefinition.v1_original;
    assert.deepEqual(validateRecord(legacy, ctx), []);
    const hidden = clone(legacy); delete hidden.senses[0].definition.contamination;
    assert.ok(hasError(validateRecord(hidden, ctx), 'contamination is not declared exactly'));
    const falseFlag = clone(readRecord('chaos'));
    falseFlag.senses[0].definition.contamination = [{ kind: 'OEWN_QUOTED_EXAMPLES_IN_DEFINITION', quoted_examples: ['x'] }];
    assert.ok(hasError(validateRecord(falseFlag, ctx), 'contamination is not declared exactly'));
    const rewritten = clone(readRecord('chaos')); rewritten.senses[0].definition.text = 'a state of confusion';
    assert.ok(hasError(validateRecord(rewritten, ctx), 'matches neither'));
    const wrongSource = clone(readRecord('chaos')); wrongSource.senses[0].definition.oewn_definition = 'something else';
    assert.ok(hasError(validateRecord(wrongSource, ctx), 'oewn_definition differs'));
    const contaminated = cohortWords.filter((w) => readRecord(w).senses[0].definition.v1_original);
    assert.ok(cohortWords.every((w) => !readRecord(w).senses[0].definition.contamination), 'no record keeps contamination in definition.text');
    assert.deepEqual(contaminated, ['creepy', 'cuddle', 'good', 'grateful', 'precious', 'repeat', 'swarm', 'tough', 'word']);
});

scenario('V1 provenance and OEWN attribution are mandatory and exact', () => {
    const wrongSha = clone(readRecord('chaos')); wrongSha.provenance.oewn.archive_sha256 = '0'.repeat(64);
    assert.ok(hasError(validateRecord(wrongSha, ctx), 'archive_sha256'));
    const wrongLicense = clone(readRecord('chaos')); wrongLicense.attribution.license = 'MIT';
    assert.ok(hasError(validateRecord(wrongLicense, ctx), 'attribution.license'));
    const noProv = clone(readRecord('chaos')); delete noProv.provenance;
    assert.ok(validateRecord(noProv, ctx).length > 0);
    assert.equal(ctx.provenance.source.archive_sha256.toLowerCase(), '38b16326159f51853626b7d24a44c453fa88ab33f06fce5ec8fc5996d1c2be93');
    assert.equal(ctx.provenance.source.license, 'CC BY 4.0');
    assert.equal(ctx.provenance.files.length, 13);
});

scenario('registry membership and frozen-word protection', () => {
    const notApproved = clone(readRecord('chaos')); notApproved.slug = 'zzzz'; notApproved.headword = 'zzzz'; notApproved.provenance.v1_migration.source_page = 'word/zzzz.html';
    assert.ok(hasError(validateRecord(notApproved, ctx), 'not in the approved registry'));
    const frozen = clone(readRecord('chaos')); frozen.slug = 'weird'; frozen.headword = 'weird'; frozen.provenance.v1_migration.source_page = 'word/weird.html';
    assert.ok(ctx.registry.has('weird') && ctx.frozen.has('weird'));
    assert.ok(hasError(validateRecord(frozen, ctx), 'frozen experiment set'));
});

scenario('V1_MIGRATION stays lossless: no enrichment, one primary sense', () => {
    const enriched = readV1('tough');
    enriched.forms = [{ form: 'tougher', kind: 'comparative', pos: 'adjective', origin: 'OVIDHAN_EDITORIAL' }];
    assert.ok(hasError(validateRecord(enriched, ctx), 'must not contain "forms"'));
    const syn = readV1('tough'); syn.senses[0].synonyms = [{ word: 'rugged', origin: 'OEWN_SYNSET' }];
    assert.ok(hasError(validateRecord(syn, ctx), 'must not contain "synonyms"'));
});

scenario('optional fields are genuinely optional and validate when properly sourced', () => {
    const plain = readV1('tough');
    for (const key of ['forms', 'phrases', 'collocations', 'usage_notes', 'related_words']) assert.ok(!(key in plain));
    assert.deepEqual(validateRecord(plain, ctx), []);

    const record = enrichedTough();
    record.senses[0].synonyms = [{ word: 'rugged', origin: 'OEWN_SYNSET' }];
    record.usage_notes = [{ text: 'Informal when used for people: a tough guy.', origin: 'OVIDHAN_EDITORIAL', sense_id: 's1' }];
    record.related_words = [{ slug: 'difficult', relation: 'EDITORIAL', origin: 'OVIDHAN_EDITORIAL' }];
    const errors = validateRecord(record, ctx);
    assert.equal(ctx.registry.has('difficult'), true);
    assert.deepEqual(errors, []);

    const notInSynset = enrichedTough(); notInSynset.senses[0].synonyms = [{ word: 'sturdy', origin: 'OEWN_SYNSET' }];
    assert.ok(hasError(validateRecord(notInSynset, ctx), 'not in the OEWN synset'));
    const unsorted = enrichedTough(); unsorted.senses[0].synonyms = [{ word: 'rugged', origin: 'OEWN_SYNSET' }, { word: 'rugged', origin: 'OEWN_SYNSET' }];
    assert.ok(hasError(validateRecord(unsorted, ctx), 'sorted'));
    const badSenseRef = enrichedTough(); badSenseRef.usage_notes = [{ text: 'note', origin: 'OVIDHAN_EDITORIAL', sense_id: 's9' }];
    assert.ok(hasError(validateRecord(badSenseRef, ctx), 'does not exist'));
    const unverifiableForm = enrichedTough(); unverifiableForm.forms = [{ form: 'tougher', kind: 'comparative', pos: 'adjective', origin: 'OEWN_EXCEPTION_LIST' }];
    assert.ok(hasError(validateRecord(unverifiableForm, ctx), 'cannot be verified offline'));
});

scenario('antonyms must be real OEWN lexical antonyms or editorial', () => {
    const lockNephew = ctx.lockById.get(readRecord('nephew').senses[0].source.synset_id);
    assert.ok((lockNephew.lexical_antonyms || []).some((a) => a.to_word === 'niece'));
    const ok = asEnriched(readRecord('nephew'));
    ok.senses[0].antonyms = [{ word: 'niece', approved_slug: 'niece', origin: 'OEWN_LEXICAL_POINTER' }];
    ok.related_words = [{ slug: 'niece', relation: 'LEXICAL_ANTONYM', origin: 'OEWN_POINTER' }];
    assert.deepEqual(validateRecord(ok, ctx), []);
    const bad = clone(ok); bad.senses[0].antonyms = [{ word: 'uncle', origin: 'OEWN_LEXICAL_POINTER' }];
    assert.ok(hasError(validateRecord(bad, ctx), 'not an OEWN lexical antonym'));
});

scenario('related words must be approved words; self, same-synset and pointer claims are checked', () => {
    const base = enrichedTough();
    base.related_words = [{ slug: 'school', relation: 'EDITORIAL', origin: 'OVIDHAN_EDITORIAL' }];
    assert.equal(ctx.registry.has('school'), false);
    assert.ok(hasError(validateRecord(base, ctx), 'is not an approved word'));
    const self = enrichedTough(); self.related_words = [{ slug: 'tough', relation: 'EDITORIAL', origin: 'OVIDHAN_EDITORIAL' }];
    assert.ok(hasError(validateRecord(self, ctx), 'relate to itself'));
    const fakeSynset = enrichedTough(); fakeSynset.related_words = [{ slug: 'difficult', relation: 'SAME_SYNSET', origin: 'OEWN_POINTER' }];
    assert.ok(hasError(validateRecord(fakeSynset, ctx), 'not in the same OEWN synset'));
    const wrongOrigin = enrichedTough(); wrongOrigin.related_words = [{ slug: 'difficult', relation: 'EDITORIAL', origin: 'OEWN_POINTER' }];
    assert.ok(hasError(validateRecord(wrongOrigin, ctx), 'must have origin OVIDHAN_EDITORIAL'));
});

scenario('duplicate senses and duplicate examples are rejected', () => {
    const dupExample = clone(readRecord('chaos'));
    dupExample.senses[0].examples.push({ ...dupExample.senses[0].examples[0] });
    assert.ok(hasError(validateRecord(dupExample, ctx), 'duplicate example'));
    const dupSense = enrichedTough();
    const second = clone(dupSense.senses[0]); second.sense_id = 's2'; delete second.v1_primary;
    dupSense.senses.push(second);
    const errors = validateRecord(dupSense, ctx);
    assert.ok(hasError(errors, 'duplicate sense'));
    const badOrder = enrichedTough();
    const other = clone(badOrder.senses[0]); other.sense_id = 's1'; delete other.v1_primary;
    badOrder.senses.push(other);
    assert.ok(hasError(validateRecord(badOrder, ctx), 'strictly increase'));
});

scenario('records are deterministic: rebuilding from live V1 HTML + the lock reproduces committed bytes', () => {
    const oewn = lib.oewnFromLock(ctx.lock);
    const sha = ctx.provenance.source.archive_sha256.toLowerCase();
    const cleanupEntries = new Map(ctx.cleanupManifest.entries.map((e) => [e.slug, e]));
    const editorial = r6cEnrich.loadSource();
    for (const word of cohortWords) {
        const migrated = buildRecord({ slug: word, html: readPage(word), oewn, archiveSha256: sha, cleanupEntry: cleanupEntries.get(word) });
        // SEO-R6C: the 12-word editorial cohort is migration + authored enrichment; every other word is the plain migration.
        const wordSource = r6cEnrich.wordSource(editorial, word);
        const rebuilt = lib.canonicalJson(wordSource ? r6cEnrich.enrichRecord({ base: migrated, word: wordSource, oewn }) : migrated);
        const committed = lib.toLf(fs.readFileSync(path.join(root, 'dictionary-v2', 'records', word + '.json'), 'utf8'));
        assert.equal(rebuilt, committed, word);
    }
    const shuffled = { z: 1, a: { y: [3, { b: 1, a: 2 }], x: 'é' } };
    assert.equal(lib.canonicalJson(shuffled), lib.canonicalJson(JSON.parse('{"a":{"x":"é","y":[3,{"a":2,"b":1}]},"z":1}')));
    assert.ok(lib.canonicalJson(shuffled).endsWith('\n') && !lib.canonicalJson(shuffled).includes('\r'));
});

scenario('migration refuses to guess an ambiguous or unmatched sense', () => {
    const oewn = lib.oewnFromLock(ctx.lock);
    const html = readPage('chaos').split('a state of extreme confusion and disorder').join('a state of confusion');
    assert.throws(() => buildRecord({ slug: 'chaos', html, oewn, archiveSha256: '0'.repeat(64) }), /matches 0 OEWN synsets/);
});

scenario('V1 parity: 28/28 records match the live pages (19 PASS + 9 PASS_CLEANED after the SEO-R6B.2 cleanup)', () => {
    const report = runParity();
    assert.equal(report.records, 28);
    assert.equal(report.fail, 0);
    assert.equal(report.pass, 19);
    assert.equal(report.pass_cleaned, 9);
    assert.equal(report.pass_known_contamination, 0);
    assert.equal(report.pass_pending_cleanup, 0);
    // PASS_PENDING_CLEANUP stays a supported pre-application state: checked on the isolated BEFORE fixture, not on production
    const fixture = require('./dictionary-v2-cleanup-fixture');
    for (const word of ['creepy', 'cuddle', 'good', 'grateful', 'precious', 'repeat', 'swarm', 'tough', 'word']) {
        const entry = fixture.appliedEntries.get(word);
        assert.equal(checkParity(readRecord(word), fixture.beforePage(word), entry).status, 'PASS_PENDING_CLEANUP', word);
        assert.equal(checkParity(readRecord(word), readPage(word), entry).status, 'PASS_CLEANED', word);
    }
});

scenario('V1 parity detects any learner-facing drift', () => {
    const record = readRecord('waist');
    const html = readPage('waist');
    assert.equal(checkParity(record, html).status, 'PASS');
    const drift = html.split(record.senses[0].bangla_explanation.text).join(record.senses[0].bangla_explanation.text + ' extra');
    const result = checkParity(record, drift);
    assert.equal(result.status, 'FAIL');
    assert.ok(result.differences.some((d) => d.field === 'bangla_explanation'));
    assert.ok(result.differences.some((d) => d.field === 'page_sha256_lf'));
    const noSource = html.replace(/<p class="lexical-source"[\s\S]*?<\/p>/, '');
    assert.equal(checkParity(record, noSource).status, 'FAIL');
});

scenario('fail closed on cohort/records mismatch and stale or tampered lock', () => {
    const extraWord = { ...ctx, cohort: { ...ctx.cohort, words: [...ctx.cohort.words, 'zebra'].sort() } };
    assert.ok(hasError(validateAll(extraWord), 'does not match prototype-cohort.json'));
    const tamperedLock = clone(ctx.lock); tamperedLock.synsets[0].definition = 'changed';
    assert.ok(validateLock(tamperedLock, ctx).length > 0);
    const staleLock = clone(ctx.lock); staleLock.synsets.push({ ...staleLock.synsets[staleLock.synsets.length - 1], id: '99999999-v', offset: '99999999', pos: 'verb' });
    assert.ok(hasError(validateAll({ ...ctx, lock: staleLock, lockById: new Map(staleLock.synsets.map((s) => [s.id, s])) }), 'stale lock'));
});

scenario('OEWN source verification fails closed on any hash or size mismatch', () => {
    const good = Buffer.from('x');
    const prov = { source: { archive_sha256: 'a'.repeat(64), archive_bytes: 1 }, files: [{ name: 'f', bytes: 1, sha256: lib.sha256(good) }] };
    const ok = { kind: 'EXTRACTED_DIR', getFile: () => good };
    assert.deepEqual(lib.verifyOewnSource(ok, prov), []);
    assert.ok(lib.verifyOewnSource({ kind: 'EXTRACTED_DIR', getFile: () => Buffer.from('y') }, prov).length > 0);
    assert.ok(lib.verifyOewnSource({ kind: 'EXTRACTED_DIR', getFile: () => { throw new Error('missing'); } }, prov).length > 0);
    assert.ok(lib.verifyOewnSource({ kind: 'ARCHIVE', archiveSha256: 'b'.repeat(64), archiveBytes: 1, getFile: () => good }, prov).length > 0);
});

scenario('zip reader extracts deflated entries', () => {
    const payload = Buffer.from('hello oewn\n'.repeat(20));
    const deflated = zlib.deflateRawSync(payload);
    const name = Buffer.from('oewn2025/data.test');
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(deflated.length, 18); local.writeUInt32LE(payload.length, 22); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(deflated.length, 20); central.writeUInt32LE(payload.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(0, 42);
    const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
    const localBlock = Buffer.concat([local, name, deflated]);
    eocd.writeUInt32LE(46 + name.length, 12); eocd.writeUInt32LE(localBlock.length, 16);
    const zip = Buffer.concat([localBlock, central, name, eocd]);
    const entries = lib.readZipEntries(zip);
    assert.deepEqual(entries.get('oewn2025/data.test'), payload);
});

scenario('archive-dependent: lock re-derives from the verified OEWN archive (skipped when archive absent)', () => {
    const candidates = [process.env.OVIDHAN_OEWN_ARCHIVE, process.env.USERPROFILE && path.join(process.env.USERPROFILE, 'Downloads', 'english-wordnet-2025.zip')].filter(Boolean);
    const archive = candidates.find((c) => fs.existsSync(c));
    if (!archive) { console.log('  SKIP no OEWN archive available'); return; }
    const source = lib.openOewnSource({ archive });
    assert.deepEqual(lib.verifyOewnSource(source, ctx.provenance), []);
    assert.deepEqual(validateAll(loadContext({ source }), { source }), []);
});

scenario('production safety: dictionary-v2 is not part of the deploy whitelist', () => {
    const deploy = fs.readFileSync(path.join(root, 'deploy-production.ps1'), 'utf8');
    const block = /\$requiredDirectories\s*=\s*@\(([\s\S]*?)\)/.exec(deploy)[1];
    assert.ok(!/dictionary-v2/.test(block));
    assert.ok(!/dictionary-v2/.test(deploy));
});

console.log('All dictionary-v2 foundation tests passed.');
