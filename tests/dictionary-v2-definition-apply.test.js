'use strict';
// SEO-R6B.1 / R6B.3: tests for the guarded definition-cleanup apply engine.
// Run: node tests/dictionary-v2-definition-apply.test.js
//
// SAFETY: these tests NEVER write to the real word/*.html. The real repository is now in the POST-APPLICATION state, so
// every application test runs on an isolated PRE-APPLICATION corpus: an in-memory copy (with fault injection) or a
// throw-away copy in the OS temp directory, built from the BEFORE fixture (tests/dictionary-v2-cleanup-fixture.js).
// The real pages are only read, and the real post-application state is verified separately at the end.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const lib = require('../scripts/dictionary-v2/lib');
const cleanup = require('../scripts/dictionary-v2/definition-cleanup');
const { checkParity } = require('../scripts/dictionary-v2/check-v1-parity');

const root = lib.ROOT;
const fixture = require('./dictionary-v2-cleanup-fixture');
const appliedManifest = fixture.appliedManifest; // committed, status APPLIED
const manifest = fixture.proposedManifest;       // pre-application view of the same evidence (status PROPOSED_NOT_APPLIED)
const cctx = fixture.beforeContext();
const clone = (value) => JSON.parse(JSON.stringify(value));
const hasError = (errors, fragment) => errors.some((e) => e.includes(fragment));
const entryOf = (slug, mf = manifest) => mf.entries.find((e) => e.slug === slug);
const NINE = ['creepy', 'cuddle', 'good', 'grateful', 'precious', 'repeat', 'swarm', 'tough', 'word'];
const FROZEN = ['exercise', 'rudimentary', 'sad', 'sufficient', 'weird'];

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

// ---- pre-application corpus (raw text, CRLF preserved), reconstructed from the live pages ----------------------------
const realIo = cleanup.makeFsIo(path.join(root, 'word'), { v1View: true });
const registrySlugs = [...cctx.registry].sort();
const liveHashes = new Map(registrySlugs.map((slug) => [slug, cleanup.pageHash(realIo.read(slug))]));
const basePages = new Map(registrySlugs.map((slug) => [slug, fixture.beforePage(slug)]));
const baseHashes = new Map([...basePages].map(([slug, text]) => [slug, cleanup.pageHash(text)]));

// In-memory IO with fault injection. Never touches the disk.
function memoryIo(options = {}) {
    const files = new Map(basePages);
    const staged = new Map();
    const log = { commits: [], restores: [], stages: [] };
    return {
        files, staged, log,
        read(slug) { if (!files.has(slug)) throw new Error('no such page ' + slug); return files.get(slug); },
        stage(slug, text) {
            log.stages.push(slug);
            staged.set(slug, options.corruptStaged === slug ? text + ' ' : text);
        },
        readStaged(slug) { return staged.get(slug); },
        commit(slug) {
            if (options.failCommitAt === slug) throw new Error('simulated disk failure');
            files.set(slug, options.corruptAfterCommit === slug ? staged.get(slug) + '!' : staged.get(slug));
            staged.delete(slug);
            log.commits.push(slug);
        },
        discard(slug) { staged.delete(slug); },
        restore(slug, text) {
            if (options.failRestore && options.failRestore.has(slug)) throw new Error('simulated restore failure');
            log.restores.push(slug);
            files.set(slug, text);
        },
        listStale() { return [...staged.keys()]; }
    };
}
const unchanged = (io, slugs = [...basePages.keys()]) => slugs.every((slug) => io.files.get(slug) === basePages.get(slug));
// Stands in for the verified OEWN archive: built from the UNTAMPERED committed manifest (itself proven equal to the
// archive by `dry-run --archive`). Tests that tamper with a manifest copy are checked against this trust root.
const trustedOewn = (() => {
    const synsets = new Map();
    for (const e of [...manifest.entries, ...manifest.frozen_documented]) {
        synsets.set(e.source_synset_id, { id: e.source_synset_id, pos: e.pos, words: e.oewn.words, gloss: e.oewn.gloss, definition: e.oewn.definition, line_sha256: e.oewn.line_sha256 });
    }
    return { get: (id) => synsets.get(id) };
})();
const run = (io, mf = manifest, options = {}) => cleanup.preflightAll(mf, cctx, io, { oewn: trustedOewn, ...options });

// ---- scenarios ----------------------------------------------------------------------------------------------------
let goodPreflight;

scenario('successful 275-page preflight: every page locked BEFORE and AFTER, two mutations each, zero unrelated bytes', () => {
    const io = memoryIo();
    goodPreflight = run(io, manifest, { expectedApplicable: 275 });
    assert.deepEqual(goodPreflight.errors, []);
    assert.equal(goodPreflight.ok, true);
    assert.deepEqual(goodPreflight.counts, {
        applicable: 275, would_change: 275, visible_definition_mutations: 275, json_ld_mutations: 275,
        unrelated_byte_changes: 0, before_hash_locked: 275, after_hash_locked: 275
    });
    assert.equal(goodPreflight.plan.length, 275);
    assert.equal(goodPreflight.locks.length, 275);
    for (const lock of goodPreflight.locks) {
        const entry = entryOf(lock.slug);
        assert.equal(lock.page_path, 'word/' + lock.slug + '.html');
        assert.equal(lock.expected_before_sha256_lf, entry.page.sha256_lf_before);
        assert.equal(lock.expected_before_sha256_lf, baseHashes.get(lock.slug), 'locked BEFORE hash equals the real page');
        assert.equal(lock.expected_after_sha256_lf, entry.page.sha256_lf_after_expected);
        assert.equal(lock.source_synset_id, entry.source_synset_id);
        assert.equal(lock.contamination_type, entry.contamination_type);
        assert.equal(lock.clean_oewn_definition, entry.oewn.definition, 'replacement is exactly the OEWN definition');
        assert.equal(lock.old_json_ld_description, JSON.stringify(entry.before_definition));
        assert.equal(lock.new_json_ld_description, JSON.stringify(entry.oewn.definition));
        assert.ok(['ENTITY_QUOTES', 'LITERAL_QUOTES'].includes(lock.visible_escaping));
    }
    assert.equal(io.log.commits.length + io.log.stages.length, 0, 'preflight writes and stages nothing');
    assert.ok(unchanged(io));
});

scenario('dry-run writes nothing: memory and real-disk page hashes are identical afterwards', () => {
    const io = memoryIo();
    const report = cleanup.guardedDryRun(manifest, cctx, io);
    assert.equal(report.ok, true);
    assert.equal(io.log.commits.length + io.log.stages.length + io.log.restores.length, 0);
    assert.ok(unchanged(io));
    assert.deepEqual(report.summary, {
        approved_corpus: 2326, total_contamination: 280, applicable_cleanup: 275, frozen_excluded: 5, manual_review: 0,
        files_that_would_change: 275, actual_word_html_changed: 0, visible_definition_mutations: 275, json_ld_mutations: 275,
        unrelated_byte_changes: 0, before_hash_locked: 275, after_hash_locked: 275
    });
    // real disk (post-application state): the dry-run refuses an APPLIED manifest, writes nothing and leaves no staging files
    const real = cleanup.guardedDryRun(appliedManifest, fixture.beforeContext(), realIo);
    assert.equal(real.ok, false);
    assert.ok(hasError(real.errors, 'ALREADY_APPLIED'));
    assert.equal(real.summary.actual_word_html_changed, 0);
    assert.deepEqual(realIo.listStale(), []);
    for (const [slug, hash] of liveHashes) assert.equal(cleanup.pageHash(realIo.read(slug)), hash, slug);
});

scenario('every non-applicable page is untouched by the plan (frozen and clean pages never appear)', () => {
    const planned = new Set(goodPreflight.plan.map((p) => p.slug));
    assert.equal(planned.size, 275);
    for (const slug of FROZEN) assert.ok(!planned.has(slug), slug);
    for (const slug of manifest.corpus_fingerprint.clean_slugs) assert.ok(!planned.has(slug), slug);
});

scenario('before-hash mismatch refuses the whole batch', () => {
    const io = memoryIo();
    io.files.set('tough', io.files.get('tough').replace('</body>', ' </body>'));
    const result = run(io);
    assert.equal(result.ok, false);
    assert.ok(hasError(result.errors, 'tough: BEFORE_HASH_MISMATCH'));
    assert.deepEqual(result.plan, [], 'no executable plan is produced when any page fails');
    // an already-cleaned page is also refused (no double apply)
    const cleaned = memoryIo();
    cleaned.files.set('tough', goodPreflight.plan.find((p) => p.slug === 'tough').afterRaw);
    assert.ok(hasError(run(cleaned).errors, 'tough: BEFORE_HASH_MISMATCH'));
});

scenario('one-byte unrelated page drift is rejected (before-state and after-state)', () => {
    const io = memoryIo();
    const original = io.files.get('word');
    const idx = original.indexOf('© 2026');
    assert.ok(idx > 0);
    io.files.set('word', original.slice(0, idx + 5) + '7' + original.slice(idx + 6)); // 2026 -> 2027-style single byte change
    assert.notEqual(io.files.get('word'), original);
    assert.ok(hasError(run(io).errors, 'word: BEFORE_HASH_MISMATCH'));
    // the after-state proof catches the same drift even when the before hash were bypassed
    const entry = entryOf('word');
    const good = goodPreflight.plan.find((p) => p.slug === 'word');
    const drifted = good.afterRaw.slice(0, good.afterRaw.indexOf('© 2026') + 5) + '7' + good.afterRaw.slice(good.afterRaw.indexOf('© 2026') + 6);
    const proof = cleanup.verifyAfterState(good.beforeRaw, drifted, entry);
    assert.equal(proof.unrelated_byte_changes, 1);
    assert.ok(hasError(proof.errors, 'UNRELATED_BYTE_CHANGES: 1'));
    assert.ok(hasError(proof.errors, 'STRUCTURE_CHANGED: surrounding_html'));
});

scenario('wrong old definition in the lock is rejected', () => {
    const mf = clone(manifest);
    const e = entryOf('tough', mf);
    e.before_definition = e.before_definition.replace('rugged', 'robust');
    const result = run(memoryIo(), mf);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((m) => m.startsWith('tough: ')));
    const located = cleanup.locateEdit(basePages.get('tough'), e);
    assert.ok(hasError(located.errors, 'not exactly the BEFORE definition'));
    assert.ok(hasError(located.errors, 'JSON-LD description literal found 0 times'));
});

scenario('wrong JSON-LD description is rejected', () => {
    const html = basePages.get('tough');
    const entry = entryOf('tough');
    const altered = html.replace('"description": "very difficult', '"description": "very hard');
    assert.notEqual(altered, html);
    assert.ok(hasError(cleanup.locateEdit(altered, entry).errors, 'JSON-LD description literal found 0 times'));
    const io = memoryIo();
    io.files.set('tough', altered);
    const result = run(io);
    assert.equal(result.ok, false);
    assert.ok(hasError(result.errors, 'tough:'));
    // a description literal that sits outside the DefinedTerm script is not accepted
    const moved = html.replace('"@type": "DefinedTerm"', '"@type": "Thing"');
    assert.ok(hasError(cleanup.locateEdit(moved, entry).errors, 'not inside the DefinedTerm script'));
});

scenario('wrong synset is rejected (id, POS, lemma, gloss)', () => {
    const base = entryOf('tough');
    const other = entryOf('creepy');
    const cases = {
        'wrong id': (e) => { e.source_synset_id = other.source_synset_id; },
        'wrong pos': (e) => { e.source_synset_id = e.source_synset_id.slice(0, 8) + '-n'; },
        'wrong lemma': (e) => { e.oewn.words = ['unrelated']; },
        'wrong gloss': (e) => { e.oewn.gloss = other.oewn.gloss; e.oewn.definition = other.oewn.definition; e.after_definition = other.oewn.definition; }
    };
    for (const [label, mutate] of Object.entries(cases)) {
        const mf = clone(manifest);
        mutate(entryOf('tough', mf));
        const result = run(memoryIo(), mf);
        assert.equal(result.ok, false, label);
        assert.ok(result.errors.some((m) => m.startsWith('tough: ')), label);
    }
    assert.equal(base.source_synset_id, '00755165-a');
    // an id swapped for another real synset of the same POS is self-consistent offline: only the verified source catches it
    const swapped = clone(manifest);
    entryOf('tough', swapped).source_synset_id = other.source_synset_id;
    const verified = run(memoryIo(), swapped);
    assert.ok(hasError(verified.errors, 'tough: SYNSET_UNVERIFIED'));
    // unknown id is not in the verified source either
    const unknown = clone(manifest);
    entryOf('tough', unknown).source_synset_id = '99999999-a';
    assert.ok(hasError(run(memoryIo(), unknown).errors, 'SYNSET_UNVERIFIED: 99999999-a does not exist'));
    // without a verified source the engine may preflight but must never write
    const io = memoryIo();
    const offline = cleanup.preflightAll(manifest, cctx, io);
    assert.equal(offline.ok, true);
    assert.equal(offline.synsets_verified, false);
    const refused = cleanup.applyPreflighted(offline, io);
    assert.equal(refused.ok, false);
    assert.ok(hasError(refused.errors, 'not verified against the OEWN source'));
    assert.equal(io.log.stages.length + io.log.commits.length, 0);
});

scenario('frozen page attempts are rejected (requested batch, forged entry, forged flag)', () => {
    const io = memoryIo();
    const requested = [...manifest.entries.map((e) => e.slug), ...FROZEN];
    const batch = run(io, manifest, { requestedSlugs: requested });
    assert.equal(batch.ok, false);
    for (const slug of FROZEN) assert.ok(hasError(batch.errors, slug + ': FROZEN_REJECTED'), slug);
    // forged: a frozen entry promoted into the applicable list
    const mf = clone(manifest);
    const forged = clone(mf.frozen_documented.find((e) => e.slug === 'sad'));
    forged.page.sha256_lf_after_expected = '0'.repeat(64);
    mf.entries.push(forged); mf.entries.sort((a, b) => (a.slug < b.slug ? -1 : 1));
    const promoted = run(memoryIo(), mf);
    assert.equal(promoted.ok, false);
    assert.ok(hasError(promoted.errors, 'sad: FROZEN_REJECTED'));
    // forged: frozen=false on a frozen word
    const mf2 = clone(manifest);
    const e2 = clone(mf2.frozen_documented.find((e) => e.slug === 'weird')); e2.frozen = false; e2.page.sha256_lf_after_expected = '0'.repeat(64);
    mf2.entries.push(e2); mf2.entries.sort((a, b) => (a.slug < b.slug ? -1 : 1));
    assert.ok(hasError(run(memoryIo(), mf2).errors, 'weird: FROZEN_REJECTED'));
    // direct entry preflight
    const direct = cleanup.preflightEntry(Object.assign(clone(mf.frozen_documented.find((e) => e.slug === 'exercise')), { frozen: false }), cctx, memoryIo());
    assert.ok(hasError(direct.errors, 'FROZEN_REJECTED'));
    // the plan never contains a frozen page and the frozen pages in memory are untouched
    assert.ok(unchanged(io, FROZEN));
    assert.ok(goodPreflight.plan.every((p) => !FROZEN.includes(p.slug)));
});

scenario('non-approved page attempts are rejected', () => {
    const batch = run(memoryIo(), manifest, { requestedSlugs: [...manifest.entries.map((e) => e.slug), 'zzzz-not-approved'] });
    assert.ok(hasError(batch.errors, 'zzzz-not-approved: NOT_APPROVED'));
    const clean = run(memoryIo(), manifest, { requestedSlugs: [...manifest.entries.map((e) => e.slug), 'chaos'] });
    assert.ok(hasError(clean.errors, 'chaos: NOT_IN_MANIFEST'), 'an approved but clean page is not an applicable entry');
    const partial = run(memoryIo(), manifest, { requestedSlugs: manifest.entries.slice(1).map((e) => e.slug) });
    assert.ok(hasError(partial.errors, 'PARTIAL_BATCH_REFUSED'));
    const mf = clone(manifest);
    mf.entries[0] = { ...mf.entries[0], slug: 'zzzz' };
    const forged = cleanup.preflightEntry(mf.entries[0], cctx, memoryIo());
    assert.ok(hasError(forged.errors, 'zzzz: NOT_APPROVED'));
    const wrongCount = run(memoryIo(), manifest, { expectedApplicable: 274 });
    assert.ok(hasError(wrongCount.errors, 'applicable entries = 275'));
});

scenario('additional unintended HTML mutation is rejected by the byte-range and structure proofs', () => {
    const p = goodPreflight.plan.find((x) => x.slug === 'tough');
    const entry = entryOf('tough');
    assert.deepEqual(cleanup.verifyAfterState(p.beforeRaw, p.afterRaw, entry).errors, []);
    const mutations = {
        title: [(h) => h.replace('<title>Tough', '<title>Tougher'), 'STRUCTURE_CHANGED: title'],
        meta_description: [(h) => h.replace('Learn the adjective', 'Study the adjective'), 'STRUCTURE_CHANGED: meta_description'],
        canonical: [(h) => h.replace('/word/tough.html">', '/word/tough2.html">'), 'STRUCTURE_CHANGED: canonical'],
        breadcrumbs: [(h) => h.replace('"name": "Dictionary"', '"name": "Dictionaries"'), 'STRUCTURE_CHANGED: breadcrumbs'],
        h1: [(h) => h.replace('<h1>tough', '<h1>Tough'), 'STRUCTURE_CHANGED: h1'],
        bangla_meaning: [(h) => h.replace('<span lang="bn">কঠিন</span>', '<span lang="bn">শক্ত</span>'), 'STRUCTURE_CHANGED: bangla_meaning'],
        part_of_speech: [(h) => h.replace('<span>adjective</span>', '<span>noun</span>'), 'STRUCTURE_CHANGED: part_of_speech'],
        bangla_explanation: [(h) => h.replace('tough বলে', 'tough বলা হয়'), 'STRUCTURE_CHANGED: bangla_explanation'],
        english_example: [(h) => h.replace('The maths paper was tough', 'The paper was tough'), 'STRUCTURE_CHANGED: english_example'],
        bangla_example: [(h) => h.replace('গণিতের প্রশ্নপত্র', 'প্রশ্নপত্র'), 'STRUCTURE_CHANGED: bangla_example'],
        attribution: [(h) => h.replace('Open English WordNet 2025', 'Some Dictionary'), 'STRUCTURE_CHANGED: attribution'],
        learning_explorer: [(h) => h.replace('placeholder="Type a word..."', 'placeholder="Type..."'), 'STRUCTURE_CHANGED: learning_explorer'],
        links: [(h) => h.replace('href="/blog.html">Blog', 'href="/blogs.html">Blog'), 'STRUCTURE_CHANGED: links'],
        scripts: [(h) => h.replace('function toggleMenu()', 'function toggleMenu2()'), 'STRUCTURE_CHANGED: scripts'],
        styles: [(h) => h.replace('.menu-toggle span {', '.menu-toggle span { color: red;'), 'STRUCTURE_CHANGED: styles'],
        classes: [(h) => h.replace('class="site-footer"', 'class="site-footer2"'), 'STRUCTURE_CHANGED: classes_and_styles'],
        surrounding: [(h) => h.replace('</main>', '</main><!-- x -->'), 'STRUCTURE_CHANGED: surrounding_html'],
        defined_term: [(h) => h.replace('"alternateName": "কঠিন"', '"alternateName": "শক্ত"'), 'STRUCTURE_CHANGED: defined_term_other_fields']
    };
    for (const [label, [mutate, expected]] of Object.entries(mutations)) {
        const bad = mutate(p.afterRaw);
        assert.notEqual(bad, p.afterRaw, label + ' mutation must apply');
        const proof = cleanup.verifyAfterState(p.beforeRaw, bad, entry);
        assert.ok(proof.errors.length > 0, label);
        assert.ok(hasError(proof.errors, expected), label + ' -> ' + JSON.stringify(proof.errors.slice(0, 3)));
        assert.ok(proof.unrelated_byte_changes > 0, label);
    }
    // all named invariants are reported unchanged for the legitimate result
    const names = cleanup.compareStructure(p.beforeRaw, p.afterRaw);
    assert.ok(names.length >= 16 && names.every((n) => n.unchanged));
    // a staged output that differs from the expected AFTER page aborts before any page is written
    const io = memoryIo({ corruptStaged: 'cuddle' });
    const outcome = cleanup.applyPreflighted(run(io), io);
    assert.equal(outcome.ok, false);
    assert.ok(hasError(outcome.errors, 'cuddle: staged output does not equal the expected AFTER page'));
    assert.equal(io.log.commits.length, 0);
    assert.ok(unchanged(io));
    assert.equal(io.staged.size, 0, 'staging is cleaned up');
});

scenario('missing expected mutation location is rejected', () => {
    const entry = entryOf('tough');
    const html = basePages.get('tough');
    const noVisible = html.replace(/<p class="definition"[\s\S]*?<\/p>/, '');
    assert.ok(hasError(cleanup.locateEdit(noVisible, entry).errors, 'expected exactly one .definition block, found 0'));
    const noLd = html.replace(/"description": "(?:[^"\\]|\\.)*",/, '"x": 1,');
    assert.ok(hasError(cleanup.locateEdit(noLd, entry).errors, 'JSON-LD description literal found 0 times'));
    const io = memoryIo();
    io.files.set('tough', noLd);
    assert.equal(run(io).ok, false);
    // a page whose AFTER lacks one of the two mutations fails the after-state proof
    const p = goodPreflight.plan.find((x) => x.slug === 'tough');
    const onlyVisible = p.afterRaw.replace(JSON.stringify(entry.after_definition), JSON.stringify(entry.before_definition));
    const proof = cleanup.verifyAfterState(p.beforeRaw, onlyVisible, entry);
    assert.ok(hasError(proof.errors, 'JSON-LD description carries the clean OEWN definition 0 times'));
    assert.equal(proof.json_ld_mutations, 0);
    assert.equal(proof.visible_mutations, 1);
    const onlyLd = p.afterRaw.replace('<span>' + cleanup.escapeHtml(entry.after_definition) + '</span>', '<span>' + cleanup.escapeHtml(entry.before_definition) + '</span>');
    assert.notEqual(onlyLd, p.afterRaw);
    const proof2 = cleanup.verifyAfterState(p.beforeRaw, onlyLd, entry);
    assert.equal(proof2.visible_mutations, 0);
    assert.ok(proof2.errors.length > 0);
});

scenario('duplicate mutation location is rejected', () => {
    const entry = entryOf('tough');
    const html = basePages.get('tough');
    const dupBlock = html.replace('</main>', '<p class="definition"><strong>Definition:</strong> <span>x</span></p></main>');
    assert.ok(hasError(cleanup.locateEdit(dupBlock, entry).errors, 'expected exactly one .definition block, found 2'));
    const dupLd = html.replace('</body>', '"description": ' + JSON.stringify(entry.before_definition) + '</body>');
    assert.ok(hasError(cleanup.locateEdit(dupLd, entry).errors, 'found 2 times'));
    const io = memoryIo();
    io.files.set('tough', dupLd);
    assert.equal(run(io).ok, false);
    // an AFTER page that carries the clean definition twice fails the after-state proof
    const p = goodPreflight.plan.find((x) => x.slug === 'tough');
    const dupAfter = p.afterRaw.replace('</body>', '"description": ' + JSON.stringify(entry.after_definition) + '</body>');
    const proof = cleanup.verifyAfterState(p.beforeRaw, dupAfter, entry);
    assert.ok(hasError(proof.errors, 'carries the clean OEWN definition 2 times'));
    assert.equal(proof.json_ld_mutations, 0);
});

scenario('expected-after hash mismatch is rejected', () => {
    const mf = clone(manifest);
    entryOf('creepy', mf).page.sha256_lf_after_expected = '0'.repeat(64);
    const result = run(memoryIo(), mf);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.startsWith('creepy: ') && /AFTER/.test(e)));
    const missing = clone(manifest);
    delete entryOf('creepy', missing).page.sha256_lf_after_expected;
    assert.ok(hasError(run(memoryIo(), missing).errors, 'creepy: BEFORE/AFTER hash lock is missing or malformed'));
});

scenario('all-or-nothing preflight: one bad page among 275 means no executable plan and nothing written', () => {
    const last = manifest.entries[manifest.entries.length - 1].slug;
    const io = memoryIo();
    io.files.set(last, io.files.get(last) + '\n<!-- drift -->');
    const result = run(io);
    assert.equal(result.ok, false);
    assert.equal(result.plan.length, 0);
    assert.ok(hasError(result.errors, last + ': BEFORE_HASH_MISMATCH'));
    const outcome = cleanup.applyPreflighted(result, io);
    assert.equal(outcome.ok, false);
    assert.deepEqual(outcome.written, []);
    assert.equal(io.log.stages.length + io.log.commits.length, 0, 'not one page was staged or written');
    assert.ok(unchanged(io, [...basePages.keys()].filter((s) => s !== last)));
    // a stale staging file also blocks the batch
    const stale = memoryIo();
    stale.staged.set('tough', 'leftover');
    assert.ok(hasError(run(stale).errors, 'stale staging files present'));
    // a manifest that is not PROPOSED_NOT_APPLIED is refused
    const applied = clone(manifest); applied.status = 'APPLIED';
    assert.ok(hasError(run(memoryIo(), applied).errors, 'expected PROPOSED_NOT_APPLIED'));
});

scenario('simulated apply (in memory): 275 pages become exactly the expected AFTER pages, everything else is untouched', () => {
    const io = memoryIo();
    const outcome = cleanup.applyPreflighted(run(io), io);
    assert.equal(outcome.ok, true);
    assert.equal(outcome.written.length, 275);
    assert.deepEqual(outcome.failed.concat(outcome.rolled_back, outcome.unrestored), []);
    const applicable = new Set(manifest.entries.map((e) => e.slug));
    for (const [slug, original] of basePages) {
        if (applicable.has(slug)) {
            const entry = entryOf(slug);
            assert.equal(cleanup.pageHash(io.files.get(slug)), entry.page.sha256_lf_after_expected, slug);
            assert.deepEqual(cleanup.verifyCleanupDiff(original, io.files.get(slug), entry), [], slug);
            assert.equal(cleanup.verifyAfterState(original, io.files.get(slug), entry).unrelated_byte_changes, 0, slug);
            assert.equal(lib.extractV1Page(io.files.get(slug)).definition, entry.oewn.definition, slug);
            assert.equal((original.match(/\r/g) || []).length, (io.files.get(slug).match(/\r/g) || []).length, slug + ': line endings preserved');
        } else assert.equal(io.files.get(slug), original, slug + ' must be untouched');
    }
    assert.ok(unchanged(io, FROZEN));
    assert.equal(io.staged.size, 0);
    // idempotence guard: a second run refuses (pages no longer at the BEFORE hash)
    const second = run(io);
    assert.equal(second.ok, false);
    assert.ok(hasError(second.errors, 'BEFORE_HASH_MISMATCH'));
    // with the APPLIED manifest the second application is refused outright, and the applied state itself verifies
    const third = run(io, appliedManifest);
    assert.equal(third.ok, false);
    assert.ok(hasError(third.errors, 'ALREADY_APPLIED'));
    assert.equal(third.errors.filter((e) => !e.includes('ALREADY_APPLIED') && !e.includes('BEFORE_HASH_MISMATCH')).length, 0, JSON.stringify(third.errors.slice(0, 3)));
    assert.equal(cleanup.applyPreflighted(third, io).ok, false);
    const memCtx = { ...cctx, readPage: (slug) => io.files.get(slug) };
    assert.equal(cleanup.verifyApplied(appliedManifest, memCtx).ok, true, 'the simulated applied corpus verifies as APPLIED');
    // the 9 prototype records now report PASS_CLEANED against the applied pages
    for (const slug of NINE) {
        const record = lib.readJson(path.join(root, 'dictionary-v2', 'records', slug + '.json'));
        const result = checkParity(record, io.files.get(slug), entryOf(slug));
        assert.equal(result.status, 'PASS_CLEANED', slug + ' ' + JSON.stringify(result.differences));
    }
});

scenario('simulated PASS_CLEANED for the 9 prototype records, straight from the dry-run', () => {
    const report = cleanup.guardedDryRun(manifest, cctx, memoryIo());
    assert.deepEqual(report.simulated_parity.map((p) => p.slug), NINE);
    for (const p of report.simulated_parity) {
        assert.equal(p.status_now, 'PASS_PENDING_CLEANUP', p.slug);
        assert.equal(p.status_after_apply, 'PASS_CLEANED', p.slug);
        assert.deepEqual(p.differences, [], p.slug);
    }
});

scenario('rollback: a write failure midway restores every page and reports the failure', () => {
    const mid = manifest.entries[137].slug;
    const io = memoryIo({ failCommitAt: mid });
    const outcome = cleanup.applyPreflighted(run(io), io);
    assert.equal(outcome.ok, false);
    assert.ok(hasError(outcome.errors, mid + ': commit failed'));
    assert.deepEqual(outcome.failed, [mid]);
    assert.equal(outcome.rolled_back.length, 137);
    assert.deepEqual(outcome.unrestored, []);
    assert.ok(unchanged(io), 'all pages are back to their original bytes');
    assert.equal(io.staged.size, 0);
});

scenario('post-write verification failure is detected, reported and rolled back', () => {
    const victim = manifest.entries[10].slug;
    const io = memoryIo({ corruptAfterCommit: victim });
    const outcome = cleanup.applyPreflighted(run(io), io);
    assert.equal(outcome.ok, false);
    assert.ok(hasError(outcome.errors, 'post-write verification failed for: ' + victim));
    assert.deepEqual(outcome.failed, [victim]);
    assert.ok(unchanged(io));
    assert.equal(outcome.rolled_back.length, 275);
});

scenario('incomplete rollback is reported loudly, never silent', () => {
    const victim = manifest.entries[5].slug;
    const io = memoryIo({ corruptAfterCommit: victim, failRestore: new Set([victim]) });
    const outcome = cleanup.applyPreflighted(run(io), io);
    assert.equal(outcome.ok, false);
    assert.deepEqual(outcome.unrestored, [victim]);
    assert.ok(hasError(outcome.errors, 'ROLLBACK INCOMPLETE'));
});

scenario('refuses to write when given a failed or empty preflight', () => {
    const io = memoryIo();
    assert.equal(cleanup.applyPreflighted({ ok: false, plan: [], errors: ['x'] }, io).ok, false);
    assert.equal(cleanup.applyPreflighted({ ok: true, plan: [] }, io).ok, false);
    assert.equal(io.log.stages.length, 0);
});

scenario('filesystem IO on a throw-away copy: staged, verified writes preserve bytes and line endings', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ovidhan-r6b1-'));
    try {
        const wordDir = path.join(dir, 'word');
        fs.mkdirSync(wordDir);
        // the throw-away corpus is in the PRE-application state (live pages with the two replacements swapped back)
        for (const [slug, text] of basePages) fs.writeFileSync(path.join(wordDir, slug + '.html'), text, 'utf8');
        const io = cleanup.makeFsIo(wordDir);
        // a stale staging file blocks the batch, then is removed
        fs.writeFileSync(path.join(wordDir, 'tough.html' + cleanup.STAGING_SUFFIX), 'x');
        assert.ok(hasError(cleanup.preflightAll(manifest, cctx, io).errors, 'stale staging files present'));
        fs.rmSync(path.join(wordDir, 'tough.html' + cleanup.STAGING_SUFFIX));
        const preflight = cleanup.preflightAll(manifest, cctx, io, { expectedApplicable: 275, oewn: trustedOewn });
        assert.equal(preflight.ok, true);
        const outcome = cleanup.applyPreflighted(preflight, io);
        assert.equal(outcome.ok, true, JSON.stringify(outcome.errors));
        assert.deepEqual(io.listStale(), []);
        for (const [slug, original] of basePages) {
            const bytes = fs.readFileSync(path.join(wordDir, slug + '.html'));
            const entry = entryOf(slug);
            if (entry) {
                assert.equal(cleanup.pageHash(bytes.toString('utf8')), entry.page.sha256_lf_after_expected, slug);
                assert.equal(bytes.filter((b) => b === 13).length, Buffer.from(original, 'utf8').filter((b) => b === 13).length, slug);
            } else assert.ok(bytes.equals(Buffer.from(original, 'utf8')), slug + ' untouched');
        }
        for (const slug of FROZEN) assert.ok(fs.readFileSync(path.join(wordDir, slug + '.html')).equals(Buffer.from(basePages.get(slug), 'utf8')));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    // the real pages were not touched by this test
    for (const [slug, hash] of liveHashes) assert.equal(cleanup.pageHash(realIo.read(slug)), hash, slug);
});

scenario('non-round-trippable page bytes are refused', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ovidhan-r6b1-rt-'));
    try {
        fs.writeFileSync(path.join(dir, 'bad.html'), Buffer.from([0x3c, 0xff, 0xfe, 0x3e]));
        assert.throws(() => cleanup.makeFsIo(dir).read('bad'), /round-trippable/);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

scenario('production safety: real pages, deploy script and engine wiring', () => {
    const deploy = fs.readFileSync(path.join(root, 'deploy-production.ps1'), 'utf8');
    assert.ok(!/dictionary-v2/.test(deploy));
    assert.equal(cleanup.APPLY_CONFIRMATION, 'APPLY_275_DEFINITION_CLEANUPS');
    assert.deepEqual(manifest.frozen_documented.map((e) => e.slug), FROZEN);
    for (const slug of FROZEN) assert.equal(cleanup.pageHash(realIo.read(slug)), entryOf(slug, { entries: manifest.frozen_documented }).page.sha256_lf_before, slug + ' real page still at its audited BEFORE hash');
});

scenario('REAL repository is in the post-application state: 275 cleaned, 5 frozen untouched, 9 prototypes PASS_CLEANED', () => {
    assert.equal(appliedManifest.status, 'APPLIED');
    const real = cleanup.makeContext();
    const result = cleanup.verifyApplied(appliedManifest, real);
    assert.deepEqual(result.errors, []);
    assert.equal(result.counts.after_hash_matches, 275);
    assert.equal(result.counts.frozen_unchanged, 5);
    for (const e of appliedManifest.entries) assert.equal(liveHashes.get(e.slug), e.page.sha256_lf_after_expected, e.slug);
    for (const e of appliedManifest.frozen_documented) assert.equal(liveHashes.get(e.slug), e.page.sha256_lf_before, e.slug);
    const { runParity } = require('../scripts/dictionary-v2/check-v1-parity');
    const parity = runParity();
    assert.equal(parity.records, 28);
    assert.equal(parity.fail, 0);
    assert.equal(parity.pass, 19);
    assert.equal(parity.pass_cleaned, 9);
    assert.equal(parity.pass_pending_cleanup, 0);
    assert.deepEqual(parity.results.filter((r) => r.status === 'PASS_CLEANED').map((r) => r.slug), NINE);
    // PASS_PENDING_CLEANUP remains a supported pre-application state
    for (const slug of NINE) {
      const record = lib.readJson(path.join(root, 'dictionary-v2', 'records', slug + '.json'));
      assert.equal(checkParity(record, basePages.get(slug), entryOf(slug)).status, 'PASS_PENDING_CLEANUP', slug);
    }
});

console.log('All dictionary-v2 guarded apply tests passed.');
