'use strict';
// SEO-R6B / R6B.3: focused tests for the V1 definition-contamination cleanup proof.
// Run: node tests/dictionary-v2-definition-cleanup.test.js
// Offline by design (committed manifest, committed lock, live word/*.html read-only).
// The real repository is in the POST-APPLICATION state. Every test that needs PRE-APPLICATION input uses the isolated
// BEFORE fixture (tests/dictionary-v2-cleanup-fixture.js: live pages with the two replacements swapped back, accepted
// only when the hash equals the audited BEFORE hash), never the live contaminated text. Nothing is written to disk.
// The full independent re-audit runs only when the OEWN archive is present (see OVIDHAN_OEWN_ARCHIVE).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lib = require('../scripts/dictionary-v2/lib');
const cleanup = require('../scripts/dictionary-v2/definition-cleanup');
const { loadContext, validateRecord } = require('../scripts/dictionary-v2/validate');
const { buildRecord } = require('../scripts/dictionary-v2/migrate-v1');
const { checkParity } = require('../scripts/dictionary-v2/check-v1-parity');

const { TYPES } = cleanup;
const root = lib.ROOT;
const fixture = require('./dictionary-v2-cleanup-fixture');
const appliedManifest = fixture.appliedManifest;  // what is committed (status APPLIED)
const manifest = fixture.proposedManifest;        // the same evidence in its pre-application (PROPOSED_NOT_APPLIED) view
const cctx = fixture.beforeContext();             // pages in the BEFORE state
const vctx = loadContext();
const clone = (value) => JSON.parse(JSON.stringify(value));
const readPage = fixture.beforePage;
const entryOf = (slug) => manifest.entries.find((e) => e.slug === slug);
const hasError = (errors, fragment) => errors.some((e) => e.includes(fragment));
const sha = (html) => lib.sha256Lf(Buffer.from(html, 'utf8'));
const oewnOf = (...synsets) => ({ synsetsForLemma: (lemma) => synsets.filter((s) => s.words.some((w) => w.toLowerCase() === lemma)) });
const fakeSynset = (entry) => ({ ...cleanup.synsetFromEntry(entry), line_sha256: entry.oewn.line_sha256, offset: entry.source_synset_id.slice(0, 8) });

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

const NINE = ['creepy', 'cuddle', 'good', 'grateful', 'precious', 'repeat', 'swarm', 'tough', 'word'];
const RESIDUE_WORDS = ['disastrous', 'hasty', 'selfish', 'vengeance'];

scenario('committed manifest covers the approved corpus exactly and validates against the current pages', () => {
    assert.deepEqual(cleanup.validateManifest(manifest, cctx), []);
    const s = manifest.summary;
    assert.equal(s.approved_corpus, 2326);
    assert.equal(s.clean + s.safe_non_frozen_cleanup + s.frozen_excluded + s.manual_review, 2326);
    assert.equal(s.raw_oewn_example_contamination + s.citation_residue, s.safe_non_frozen_cleanup + s.frozen_excluded + s.manual_review);
    assert.equal(manifest.status, 'PROPOSED_NOT_APPLIED');
});

scenario('raw OEWN example removal: BEFORE -> OEWN definition -> AFTER is exact and touches only the definition', () => {
    for (const slug of NINE) {
        const entry = entryOf(slug);
        assert.equal(entry.contamination_type, TYPES.RAW, slug);
        assert.equal(entry.after_definition, entry.oewn.definition, slug);
        assert.equal(entry.before_definition, entry.after_definition + entry.removed_material, slug);
        assert.ok(entry.oewn.gloss.startsWith(entry.before_definition), slug + ': removed material is copied from the OEWN gloss');
        assert.ok(!entry.after_definition.includes('"'), slug);
    }
    const entry = entryOf('tough');
    const html = readPage('tough');
    const plan = cleanup.planPageCleanup(html, entry);
    assert.deepEqual(plan.errors, []);
    assert.deepEqual(cleanup.verifyCleanupDiff(html, plan.html, entry), []);
    assert.equal(sha(plan.html), entry.page.sha256_lf_after_expected);
    // exactly two locations differ
    const a = html.split('\n'), b = plan.html.split('\n');
    assert.equal(a.length, b.length);
    assert.equal(a.filter((line, i) => line !== b[i]).length, 2);
});

scenario('both escaping styles of the visible definition are handled and preserved', () => {
    const entities = manifest.entries.find((e) => readPage(e.slug).includes('<span>' + cleanup.escapeHtml(e.before_definition) + '</span>') && e.before_definition.includes('"'));
    const literal = manifest.entries.find((e) => readPage(e.slug).includes(e.before_definition + '</span>') && e.before_definition.includes('"'));
    assert.ok(entities && literal, 'both styles exist in the corpus');
    for (const e of [entities, literal]) assert.deepEqual(cleanup.verifyCleanupDiff(readPage(e.slug), cleanup.planPageCleanup(readPage(e.slug), e).html, e), [], e.slug);
});

scenario('citation residue: deterministic cleanup for vengeance, disastrous, selfish, hasty', () => {
    for (const slug of RESIDUE_WORDS) {
        const entry = entryOf(slug);
        assert.equal(entry.contamination_type, TYPES.RESIDUE, slug);
        assert.ok(entry.removed_material.startsWith('; - '), slug);
        assert.ok(!entry.before_definition.includes('"'), slug + ': residue pages carry no quoted example');
        assert.equal(entry.after_definition, lib.splitGloss(entry.oewn.gloss).definition, slug);
        const fragments = entry.removed_material.slice(4).split('; - ');
        for (const fragment of fragments) assert.ok(entry.oewn.gloss.includes('" - ' + fragment), slug + ': "' + fragment + '" is an attribution in the OEWN gloss');
    }
    assert.equal(entryOf('selfish').removed_material.split('; - ').length - 1, 2, 'selfish carries two attribution fragments');
    // a fragment that is not an attribution of that gloss is not provable
    const hasty = entryOf('hasty');
    assert.equal(cleanup.classifyAgainstSynset(hasty.after_definition + '; - Somebody Else', fakeSynset(hasty)), null);
    assert.equal(cleanup.classifyAgainstSynset(hasty.after_definition + '; - Shakespeare; - Somebody Else', fakeSynset(hasty)), null);
    assert.equal(cleanup.classifyAgainstSynset(hasty.after_definition + '; - "Shakespeare"', fakeSynset(hasty)), null);
    assert.equal(cleanup.classifyAgainstSynset(hasty.after_definition + '; - Shakespeare', fakeSynset(hasty)).type, TYPES.RESIDUE);
});

scenario('V2 cohort records for the 9 contaminated words match the manifest and validate', () => {
    for (const slug of NINE) {
        const committed = lib.readJson(path.join(root, 'dictionary-v2', 'records', slug + '.json'));
        const record = fixture.v1Record(slug);
        const sense = record.senses[0];
        const entry = entryOf(slug);
        assert.equal(record.schema_version, '1.1.0');
        assert.deepEqual(validateRecord(committed, vctx), [], slug + ' (committed, possibly R6C-enriched)');
        assert.deepEqual(committed.senses.find((s) => s.v1_primary).definition, sense.definition, slug + ': the V1 sense keeps its cleaned definition');
        assert.equal(sense.definition.text, entry.after_definition);
        assert.equal(sense.definition.v1_original.text, entry.before_definition);
        assert.equal(sense.definition.v1_original.removed_material, entry.removed_material);
        assert.equal(sense.source.synset_id, entry.source_synset_id);
        assert.deepEqual(validateRecord(record, vctx), [], slug);
    }
    // Words outside the V1 cohort contamination remain schema 1.0.0
    assert.equal(lib.readJson(path.join(root, 'dictionary-v2', 'records', 'chaos.json')).schema_version, '1.0.0');
});

scenario('cleaned record validation fails closed on tampering', () => {
    const base = fixture.v1Record('tough');
    const mutate = (fn) => { const r = clone(base); fn(r.senses[0].definition, r); return validateRecord(r, vctx); };
    assert.ok(hasError(mutate((d) => { d.text = d.text + ' extra'; }), 'exactly the OEWN definition'));
    assert.ok(hasError(mutate((d) => { d.v1_original.removed_material = '; "x"'; }), 'removed_material'));
    assert.ok(hasError(mutate((d) => { d.v1_original.text = d.text + '; "invented example"'; }), 'not provable'));
    assert.ok(hasError(mutate((d) => { d.v1_original.contamination = [{ kind: 'OEWN_ATTRIBUTION_IN_DEFINITION' }]; }), 'not declared exactly'));
    assert.ok(hasError(mutate((d, r) => { r.schema_version = '1.0.0'; }), 'requires schema_version 1.1.0'));
    assert.ok(hasError(mutate((d) => { d.contamination = d.v1_original.contamination; }), 'must not also declare contamination'));
    const stripped = clone(base); delete stripped.senses[0].definition.v1_original; stripped.senses[0].definition.text = 'a different definition';
    assert.ok(validateRecord(stripped, vctx).length > 0);
    const noManifest = { ...vctx, cleanupManifest: { entries: [] } };
    assert.ok(hasError(validateRecord(base, noManifest), 'no entry for this word in the cleanup manifest'));
    const disagree = { ...vctx, cleanupManifest: { entries: manifest.entries.map((e) => (e.slug === 'tough' ? { ...e, source_synset_id: '00000000-a' } : e)) } };
    assert.ok(hasError(validateRecord(base, disagree), 'disagrees with the cleanup manifest'));
});

scenario('frozen pages are rejected: documented only, never applicable', () => {
    assert.deepEqual(manifest.frozen_documented.map((e) => e.slug), ['exercise', 'rudimentary', 'sad', 'sufficient', 'weird']);
    for (const e of manifest.frozen_documented) {
        assert.equal(e.frozen, true);
        assert.ok(cctx.frozen.has(e.slug));
        assert.equal(e.page.sha256_lf_after_expected, undefined, 'no AFTER page is proposed for a frozen page');
        assert.ok(!manifest.entries.some((x) => x.slug === e.slug));
        // pretending a frozen word is applicable must fail
        const forged = clone(e); forged.frozen = false;
        assert.ok(hasError(cleanup.validateEntry(forged, cctx, { applicable: true }), 'frozen'), e.slug);
        assert.ok(hasError(cleanup.validateEntry(e, cctx, { applicable: true }), 'applicable entry must have frozen=false'), e.slug);
    }
    const nonFrozenAsFrozen = clone(entryOf('tough')); nonFrozenAsFrozen.frozen = true;
    assert.ok(cleanup.validateEntry(nonFrozenAsFrozen, cctx, { applicable: false }).length > 0);
    // a cleaned V2 record for a frozen word is refused by the record validator
    const record = clone(fixture.v1Record('tough'));
    record.slug = 'sad'; record.headword = 'sad'; record.provenance.v1_migration.source_page = 'word/sad.html';
    assert.ok(hasError(validateRecord(record, vctx), 'frozen experiment set'));
});

scenario('incorrect source synset is rejected', () => {
    const entry = clone(entryOf('tough'));
    // another real OEWN synset (from the lock) cannot explain the displayed definition
    const other = vctx.lock.synsets.find((s) => s.id !== entry.source_synset_id && s.pos === 'adjective');
    assert.equal(cleanup.classifyAgainstSynset(entry.before_definition, other), null);
    const wrongId = clone(entry); wrongId.source_synset_id = '00000000-n';
    assert.ok(cleanup.validateEntry(wrongId, cctx, { applicable: true }).length > 0);
    const wrongPos = clone(entry); wrongPos.source_synset_id = entry.source_synset_id.slice(0, 8) + '-v';
    assert.ok(hasError(cleanup.validateEntry(wrongPos, cctx, { applicable: true }), 'POS differs'));
    const wrongLemma = clone(entry); wrongLemma.oewn.words = ['unrelated'];
    assert.ok(hasError(cleanup.validateEntry(wrongLemma, cctx, { applicable: true }), 'not a lemma'));
    const wrongAfter = clone(entry); wrongAfter.after_definition = 'a rewritten definition';
    assert.ok(hasError(cleanup.validateEntry(wrongAfter, cctx, { applicable: true }), 'not exactly the OEWN definition'));
    const wrongGloss = clone(entry); wrongGloss.oewn.gloss = 'something else entirely; "x"';
    assert.ok(cleanup.validateEntry(wrongGloss, cctx, { applicable: true }).length > 0);
    // audit never guesses: a definition no synset of the lemma explains goes to manual review with no AFTER page
    const html = readPage('tough').split(cleanup.escapeHtml(entry.before_definition)).join('a model written replacement definition');
    const audit = cleanup.auditPage('tough', html, oewnOf(fakeSynset(entry)));
    assert.equal(audit.category, 'MANUAL_REVIEW');
    assert.equal(audit.after_html, undefined);
    assert.ok(hasError(audit.reasons, 'NO_SAFE_SOURCE_SYNSET'));
});

scenario('changed Bangla meaning, Bangla explanation or part of speech is rejected', () => {
    const entry = entryOf('tough');
    const before = readPage('tough');
    const after = cleanup.planPageCleanup(before, entry).html;
    const page = lib.extractV1Page(before);
    assert.deepEqual(cleanup.verifyCleanupDiff(before, after, entry), []);
    for (const [label, value] of [['bangla_meaning', page.bangla_meaning], ['bangla_explanation', page.bangla_explanation]]) {
        const drift = after.split(value).join(value + 'x');
        assert.notEqual(drift, after, label + ' must be present in the page');
        assert.ok(hasError(cleanup.verifyCleanupDiff(before, drift, entry), label + ' changed'), label);
    }
    const pos = after.replace('>' + page.part_of_speech + '<', '>noun<');
    assert.notEqual(pos, after);
    assert.ok(hasError(cleanup.verifyCleanupDiff(before, pos, entry), 'part_of_speech changed'));
    // a manifest whose audited learner fields differ from the live page is refused
    const forged = clone(entry); forged.learner_fields_sha256 = '0'.repeat(64);
    assert.ok(hasError(cleanup.validateEntry(forged, cctx, { applicable: true }), 'learner-facing fields'));
});

scenario('changed learner example (English or Bangla) is rejected', () => {
    const entry = entryOf('tough');
    const before = readPage('tough');
    const after = cleanup.planPageCleanup(before, entry).html;
    const page = lib.extractV1Page(before);
    for (const [label, value] of [['example_en', page.example_en], ['example_bn', page.example_bn]]) {
        const drift = after.split(value).join(value + ' extra');
        assert.notEqual(drift, after, label + ' must be present in the page');
        assert.ok(hasError(cleanup.verifyCleanupDiff(before, drift, entry), label + ' changed'), label);
    }
});

scenario('anything beyond the two definition locations is rejected (title, canonical, schema, structure)', () => {
    const entry = entryOf('tough');
    const before = readPage('tough');
    const after = cleanup.planPageCleanup(before, entry).html;
    const injected = after.replace('</body>', '<!-- x --></body>');
    assert.notEqual(injected, after);
    assert.ok(hasError(cleanup.verifyCleanupDiff(before, injected, entry), 'outside the two definition locations'));
    const canonical = after.replace(/(<link rel="canonical" href=")([^"]+)"/, '$1$2x"');
    assert.notEqual(canonical, after);
    assert.ok(cleanup.verifyCleanupDiff(before, canonical, entry).length > 0);
    const notCleaned = before;
    assert.ok(hasError(cleanup.verifyCleanupDiff(before, notCleaned, entry), 'not the clean OEWN definition'));
});

scenario('no-op on a clean definition', () => {
    const oewn = lib.oewnFromLock(vctx.lock);
    const audit = cleanup.auditPage('chaos', readPage('chaos'), oewn);
    assert.equal(audit.category, TYPES.CLEAN);
    assert.equal(audit.after_html, undefined);
    assert.equal(audit.removed, '');
    assert.ok(manifest.corpus_fingerprint.clean_slugs.includes('chaos'));
    assert.ok(!manifest.entries.some((e) => e.slug === 'chaos'));
    // a clean definition can never be turned into an entry
    const synset = oewn.synsetsForLemma('chaos')[0];
    assert.deepEqual(cleanup.classifyAgainstSynset(synset.definition, synset), { type: TYPES.CLEAN, removed: '' });
    const pseudo = { ...clone(entryOf('tough')), before_definition: entryOf('tough').after_definition, removed_material: '' };
    assert.ok(cleanup.validateEntry(pseudo, cctx, { applicable: true }).length > 0);
    // migrating a clean page without a cleanup entry leaves the record unchanged
    const record = buildRecord({ slug: 'chaos', html: readPage('chaos'), oewn, archiveSha256: vctx.provenance.source.archive_sha256.toLowerCase() });
    assert.equal(lib.canonicalJson(record), lib.toLf(fs.readFileSync(path.join(root, 'dictionary-v2', 'records', 'chaos.json'), 'utf8')));
});

scenario('fail closed: unprovable edit locations, changed pages and malformed manifests', () => {
    const entry = entryOf('tough');
    const html = readPage('tough');
    // JSON-LD literal missing, duplicated, or visible span altered => no plan
    const noLd = html.replace('"description": ' + JSON.stringify(entry.before_definition), '"description": "changed"');
    assert.ok(hasError(cleanup.planPageCleanup(noLd, entry).errors, 'JSON-LD description literal found 0 times'));
    const twice = html.replace('</body>', '"description": ' + JSON.stringify(entry.before_definition) + '</body>');
    assert.ok(hasError(cleanup.planPageCleanup(twice, entry).errors, 'found 2 times'));
    const spanChanged = html.split(cleanup.escapeHtml(entry.before_definition)).join('<em>x</em>');
    assert.ok(cleanup.planPageCleanup(spanChanged, entry).errors.length > 0);
    assert.equal(cleanup.planPageCleanup(spanChanged, entry).html, null);
    // page changed since the audit
    const staleEntry = clone(entry); staleEntry.page.sha256_lf_before = '0'.repeat(64);
    assert.ok(hasError(cleanup.validateEntry(staleEntry, cctx, { applicable: true }), 'page changed since the audit'));
    // manifest structure
    const dup = clone(manifest); dup.manual_review.push({ slug: 'chaos', frozen: false, contamination_type: 'UNRESOLVED', reasons: ['x'], page_definition: 'x' });
    assert.ok(hasError(cleanup.validateManifest(dup, cctx), 'more than one group'));
    const missing = clone(manifest); missing.entries.pop(); missing.summary.safe_non_frozen_cleanup -= 1;
    assert.ok(hasError(cleanup.validateManifest(missing, cctx), 'do not cover the approved registry'));
    const badSummary = clone(manifest); badSummary.summary.clean += 1;
    assert.ok(hasError(cleanup.validateManifest(badSummary, cctx), 'summary counts'));
    const unapproved = clone(manifest); unapproved.entries[0] = { ...unapproved.entries[0], slug: 'zzzz' };
    assert.ok(hasError(cleanup.validateManifest(unapproved, cctx), 'not in the approved registry'));
    const wrongArchive = clone(manifest); wrongArchive.oewn.archive_sha256 = '0'.repeat(64);
    assert.ok(hasError(cleanup.validateManifest(wrongArchive, cctx), 'archive_sha256'));
    const unsorted = clone(manifest); unsorted.entries.reverse();
    assert.ok(hasError(cleanup.validateManifest(unsorted, cctx), 'sorted'));
    // a corrupted corpus fingerprint is caught
    const tamperedClean = clone(manifest); tamperedClean.corpus_fingerprint.clean_definitions_sha256 = '0'.repeat(64);
    assert.ok(hasError(cleanup.validateManifest(tamperedClean, cctx), 'clean pages no longer match'));
});

scenario('manifest is deterministic and canonical', () => {
    const text = lib.toLf(fs.readFileSync(cleanup.MANIFEST_PATH, 'utf8'));
    assert.equal(text, lib.canonicalJson(appliedManifest));
    assert.equal(appliedManifest.status, 'APPLIED');
    // the pre-application view is an exact, lossless inverse of the applied transition
    assert.equal(lib.canonicalJson(cleanup.markApplied(manifest, appliedManifest.applied.before_state_commit)), lib.canonicalJson(appliedManifest));
    const oewn = lib.oewnFromLock(vctx.lock);
    const a = cleanup.auditPage('tough', readPage('tough'), oewn);
    const b = cleanup.auditPage('tough', readPage('tough'), oewn);
    assert.equal(lib.canonicalJson(cleanup.buildEntry(a, false)), lib.canonicalJson(cleanup.buildEntry(b, false)));
    assert.equal(lib.canonicalJson(cleanup.buildEntry(a, false)), lib.canonicalJson(entryOf('tough')));
    for (const key of ['entries', 'frozen_documented', 'manual_review']) {
        const slugs = manifest[key].map((e) => e.slug);
        assert.deepEqual(slugs, [...slugs].sort());
    }
});

scenario('dry run lists slug, old/new definition, synset, reason and frozen status without modifying anything', () => {
    const before = manifest.entries.map((e) => sha(readPage(e.slug)));
    const report = cleanup.dryRun(manifest, cctx);
    assert.deepEqual(manifest.entries.map((e) => sha(readPage(e.slug))), before);
    assert.equal(report.rows.length, manifest.entries.length + manifest.frozen_documented.length + manifest.manual_review.length);
    const tough = report.rows.find((r) => r.slug === 'tough');
    assert.deepEqual(Object.keys(tough).sort(), ['action', 'frozen', 'new_definition', 'old_definition', 'reason', 'removed_material', 'slug', 'source_synset'].sort());
    assert.equal(tough.action, 'WOULD_CHANGE');
    assert.equal(tough.frozen, false);
    assert.equal(report.rows.find((r) => r.slug === 'sad').action, 'EXCLUDED_FROZEN_UNTOUCHED');
    assert.equal(report.summary.approved_corpus, 2326);
});

scenario('parity: a record is flagged pending until the page is cleaned, then verified against the AFTER hash', () => {
    const entry = entryOf('tough');
    const record = fixture.v1Record('tough');
    const before = readPage('tough');
    assert.equal(checkParity(record, before, entry).status, 'PASS_PENDING_CLEANUP');
    const after = cleanup.planPageCleanup(before, entry).html;
    assert.equal(checkParity(record, after, entry).status, 'PASS_CLEANED');
    assert.equal(checkParity(record, after + '\n<!-- drift -->', entry).status, 'FAIL');
    const unrelated = before.split(cleanup.escapeHtml(entry.before_definition)).join('some other text');
    assert.notEqual(unrelated, before);
    assert.equal(checkParity(record, unrelated, entry).status, 'FAIL');
    // migration reproduces the same record from the already-cleaned page
    const oewn = lib.oewnFromLock(vctx.lock);
    const rebuilt = buildRecord({ slug: 'tough', html: after, oewn, archiveSha256: vctx.provenance.source.archive_sha256.toLowerCase(), cleanupEntry: entry });
    assert.equal(lib.canonicalJson(rebuilt), lib.canonicalJson(record));
});

scenario('applyEntryToRecord changes nothing except the definition, schema version and source hash', () => {
    const entry = entryOf('tough');
    const oewn = lib.oewnFromLock(vctx.lock);
    const base = buildRecord({ slug: 'tough', html: readPage('tough'), oewn, archiveSha256: vctx.provenance.source.archive_sha256.toLowerCase() });
    const applied = cleanup.applyEntryToRecord(base, entry);
    const strip = (r) => { const c = clone(r); delete c.schema_version; delete c.senses[0].definition; delete c.provenance.v1_migration.source_page_sha256_lf; return c; };
    assert.deepEqual(strip(applied), strip(base));
    assert.equal(applied.senses[0].bangla_explanation.text, base.senses[0].bangla_explanation.text);
    assert.deepEqual(applied.senses[0].examples, base.senses[0].examples);
    assert.throws(() => cleanup.applyEntryToRecord(Object.assign(clone(base), { senses: [{ ...clone(base.senses[0]), definition: { text: 'unrelated', origin: 'OEWN_GLOSS' } }] }), entry), /matches neither BEFORE nor AFTER/);
});

scenario('production safety: no production file references the cleanup and dictionary-v2 stays undeployed', () => {
    const deploy = fs.readFileSync(path.join(root, 'deploy-production.ps1'), 'utf8');
    assert.ok(!/dictionary-v2/.test(deploy));
    const hits = fs.readdirSync(path.join(root, 'word')).filter((f) => f.endsWith('.html')).filter((f) => fs.readFileSync(path.join(root, 'word', f), 'utf8').includes('definition-cleanup'));
    assert.deepEqual(hits, []);
});

// ---- POST-APPLICATION state of the real repository (SEO-R6B.3) ------------------------------------------------------
const realCtx = cleanup.makeContext(); // live pages of the closed cleanup corpus
realCtx.registry = cleanup.corpusRegistry(appliedManifest);
const withPages = (overrides) => ({ ...realCtx, readPage: (slug) => (slug in overrides ? overrides[slug] : realCtx.readPage(slug)) });
const FROZEN = ['exercise', 'rudimentary', 'sad', 'sufficient', 'weird'];

scenario('BEFORE fixture: all 275 pages reconstruct to the audited BEFORE hash (both escaping styles)', () => {
    let literal = 0, entity = 0;
    for (const e of appliedManifest.entries) {
        const before = fixture.beforePage(e.slug);
        assert.equal(sha(before), e.page.sha256_lf_before, e.slug);
        assert.equal(lib.extractV1Page(before).definition, e.before_definition, e.slug);
        assert.notEqual(before, fixture.livePage(e.slug), e.slug + ': live page is the cleaned one');
        if (before.includes('<span>' + cleanup.escapeHtml(e.before_definition) + '</span>')) entity++; else literal++;
    }
    assert.equal(entity + literal, 275);
    assert.ok(entity > 0 && literal > 0, 'both quote-escaping styles are exercised');
});

scenario('post-application: real repository verifies as APPLIED (275 cleaned, 5 frozen untouched)', () => {
    assert.equal(appliedManifest.status, 'APPLIED');
    assert.deepEqual(cleanup.validateManifest(appliedManifest, realCtx), []);
    const result = cleanup.verifyApplied(appliedManifest, realCtx);
    assert.deepEqual(result.errors, []);
    assert.equal(result.counts.approved_corpus, 2326);
    assert.equal(result.counts.applied_non_frozen_cleanup, 275);
    assert.equal(result.counts.frozen_excluded, 5);
    assert.equal(result.counts.frozen_unchanged, 5);
    assert.equal(result.counts.manual_review, 0);
    assert.equal(result.counts.after_hash_matches, 275);
    assert.equal(result.counts.visible_definition_changes, 275);
    assert.equal(result.counts.json_ld_changes, 275);
    assert.equal(result.counts.reverse_proofs, 275);
    for (const e of appliedManifest.entries) {
        assert.equal(sha(fixture.livePage(e.slug)), e.page.sha256_lf_after_expected, e.slug);
        assert.equal(lib.extractV1Page(fixture.livePage(e.slug)).definition, e.oewn.definition, e.slug);
        assert.equal(e.application_state, 'APPLIED');
    }
    // frozen pages: documented as NOT applied, still contaminated, still at their audited BEFORE hash
    assert.deepEqual(appliedManifest.frozen_documented.map((e) => e.slug), FROZEN);
    for (const e of appliedManifest.frozen_documented) {
        assert.equal(e.application_state, 'NOT_APPLIED_FROZEN');
        assert.equal(sha(fixture.livePage(e.slug)), e.page.sha256_lf_before, e.slug);
        assert.equal(lib.extractV1Page(fixture.livePage(e.slug)).definition, e.before_definition, e.slug);
        assert.equal(e.page.sha256_lf_after_expected, undefined);
    }
    assert.deepEqual(appliedManifest.applied.frozen_not_applied, FROZEN);
    assert.equal(appliedManifest.applied.pages_applied, 275);
});

scenario('post-application: all BEFORE evidence is preserved in the APPLIED manifest', () => {
    for (const e of appliedManifest.entries) {
        const p = manifest.entries.find((x) => x.slug === e.slug);
        for (const key of ['before_definition', 'after_definition', 'removed_material', 'source_synset_id', 'contamination_type', 'oewn', 'learner_fields_sha256', 'pos']) assert.deepEqual(e[key], p[key], e.slug + '.' + key);
        assert.equal(e.page.sha256_lf_before, p.page.sha256_lf_before);
        assert.equal(e.page.sha256_lf_after_expected, p.page.sha256_lf_after_expected);
        assert.match(e.page.sha256_lf_before, /^[0-9a-f]{64}$/);
        assert.notEqual(e.before_definition, e.after_definition);
    }
    assert.deepEqual(appliedManifest.summary.frozen_excluded_slugs, FROZEN);
    assert.equal(appliedManifest.summary.raw_oewn_example_contamination + appliedManifest.summary.citation_residue, 280);
});

scenario('post-application: any drift from the applied state fails closed', () => {
    const slug = appliedManifest.entries[3].slug;
    const live = fixture.livePage(slug);
    // one-byte drift of an applied page
    let errors = cleanup.validateManifest(appliedManifest, withPages({ [slug]: live.replace('</body>', ' </body>') }));
    assert.ok(hasError(errors, slug + ': AFTER_HASH_MISMATCH'));
    // re-contaminated (reverted to BEFORE) page
    errors = cleanup.validateManifest(appliedManifest, withPages({ [slug]: fixture.beforePage(slug) }));
    assert.ok(hasError(errors, slug + ': AFTER_HASH_MISMATCH'));
    // frozen page changed in any way
    const frozenLive = fixture.livePage('sad');
    errors = cleanup.validateManifest(appliedManifest, withPages({ sad: frozenLive + '\n<!-- drift -->' }));
    assert.ok(hasError(errors, 'sad: FROZEN_CHANGED'));
    // frozen page "cleaned" by mistake
    const sadEntry = appliedManifest.frozen_documented.find((e) => e.slug === 'sad');
    const wrongClean = frozenLive.split(cleanup.escapeHtml(sadEntry.before_definition)).join(cleanup.escapeHtml(sadEntry.after_definition));
    errors = cleanup.validateManifest(appliedManifest, withPages({ sad: wrongClean }));
    assert.ok(hasError(errors, 'sad: FROZEN_CHANGED'));
    // verifyApplied reports the same
    const result = cleanup.verifyApplied(appliedManifest, withPages({ [slug]: live + ' ' }));
    assert.equal(result.ok, false);
    // the clean-page fingerprint still guards the 2046 untouched pages
    const clean = appliedManifest.corpus_fingerprint.clean_slugs[0];
    errors = cleanup.validateManifest(appliedManifest, withPages({ [clean]: fixture.livePage(clean).replace(/(<p class="definition"[^>]*>[\s\S]*?<span[^>]*>)/, '$1X') }));
    assert.ok(hasError(errors, 'clean pages no longer match'));
});

scenario('post-application: manifest state is internally consistent and fail-closed', () => {
    const mutate = (fn) => { const m = clone(appliedManifest); fn(m); return cleanup.validateManifest(m, realCtx); };
    assert.ok(hasError(mutate((m) => { m.entries[0].application_state = 'NOT_APPLIED_FROZEN'; }), 'application_state APPLIED'));
    assert.ok(hasError(mutate((m) => { m.frozen_documented[0].application_state = 'APPLIED'; }), 'NOT_APPLIED_FROZEN'));
    assert.ok(hasError(mutate((m) => { delete m.applied; }), 'before_state_commit'));
    assert.ok(hasError(mutate((m) => { m.applied.before_state_commit = 'abc'; }), 'before_state_commit'));
    assert.ok(hasError(mutate((m) => { m.applied.pages_applied = 274; }), 'pages_applied'));
    assert.ok(hasError(mutate((m) => { m.summary.applied_non_frozen_cleanup = 274; }), 'applied summary counts'));
    assert.ok(hasError(mutate((m) => { m.description = DESC(); }), 'description'));
    // the PROPOSED view may not carry applied state, and cannot pass while the pages are already cleaned
    const proposedWithState = clone(manifest); proposedWithState.entries[0].application_state = 'APPLIED';
    assert.ok(hasError(cleanup.validateManifest(proposedWithState, cctx), 'must not carry application state'));
    const inconsistent = cleanup.validateManifest(manifest, realCtx);
    assert.ok(hasError(inconsistent, 'already at the AFTER state but the manifest status is PROPOSED_NOT_APPLIED'));
    // transitions
    assert.throws(() => cleanup.markApplied(appliedManifest, appliedManifest.applied.before_state_commit), /only a PROPOSED_NOT_APPLIED manifest/);
    assert.equal(lib.canonicalJson(cleanup.asProposed(appliedManifest)), lib.canonicalJson(manifest));
    function DESC() { return cleanup.DESCRIPTION_PROPOSED; }
});

scenario('post-application: a second application is prohibited and writes nothing', () => {
    const io = cleanup.makeFsIo(path.join(root, 'word'), { v1View: true });
    const before = new Map(appliedManifest.entries.map((e) => [e.slug, sha(io.read(e.slug))]));
    const again = cleanup.preflightAll(appliedManifest, realCtx, io, { expectedApplicable: 275 });
    assert.equal(again.ok, false);
    assert.ok(hasError(again.errors, 'ALREADY_APPLIED'));
    assert.deepEqual(again.plan, []);
    const refused = cleanup.applyPreflighted(again, io);
    assert.equal(refused.ok, false);
    assert.deepEqual(refused.written, []);
    // the proposed (pre-application) manifest cannot be replayed on the cleaned pages either: BEFORE hash protection stays
    const replay = cleanup.preflightAll(manifest, realCtx, io, { expectedApplicable: 275 });
    assert.equal(replay.ok, false);
    assert.equal(replay.errors.filter((e) => e.includes('BEFORE_HASH_MISMATCH')).length, 275);
    assert.equal(cleanup.applyPreflighted(replay, io).ok, false);
    assert.deepEqual(io.listStale(), []);
    for (const [slug, hash] of before) assert.equal(sha(io.read(slug)), hash, slug + ' untouched by the refused runs');
});

scenario('post-application: independent git proof against the pre-application commit (skipped when unavailable)', () => {
    let gitRead;
    try { gitRead = cleanup.gitReader(root); gitRead(appliedManifest.applied.before_state_commit, 'word/tough.html'); } catch (error) { console.log('  SKIP pre-application commit not available in this clone'); return; }
    const result = cleanup.verifyApplied(appliedManifest, realCtx, { gitRead });
    assert.deepEqual(result.errors, []);
    assert.equal(result.counts.git_pages_proven, 275);
    assert.equal(result.counts.git_unrelated_changed_lines, 0);
});

scenario('archive-dependent: independent re-audit from the verified OEWN archive reproduces the manifest byte-for-byte (skipped when archive absent)', () => {
    const candidates = [process.env.OVIDHAN_OEWN_ARCHIVE, process.env.USERPROFILE && path.join(process.env.USERPROFILE, 'Downloads', 'english-wordnet-2025.zip')].filter(Boolean);
    const archive = candidates.find((c) => fs.existsSync(c));
    if (!archive) { console.log('  SKIP no OEWN archive available'); return; }
    const source = lib.openOewnSource({ archive });
    assert.deepEqual(lib.verifyOewnSource(source, cctx.provenance), []);
    const oewn = lib.oewnFromSynsets(lib.parseOewnData(source.getFile));
    const fresh = cleanup.buildManifest({ registry: cctx.registry, readPage: cctx.readPage, oewn, frozen: cctx.frozen, provenance: cctx.provenance });
    assert.equal(lib.canonicalJson(fresh), lib.canonicalJson(manifest));
    assert.equal(fresh.summary.clean, 2046);
    assert.equal(fresh.summary.raw_oewn_example_contamination, 276);
    assert.equal(fresh.summary.citation_residue, 4);
});

console.log('All dictionary-v2 definition-cleanup tests passed.');
