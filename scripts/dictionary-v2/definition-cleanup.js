'use strict';
// SEO-R6B: deterministic V1 definition-contamination audit, cleanup manifest, validator and dry-run.
//
// This tool NEVER writes to word/*.html. It proves what a later, separately approved application
// step would change: BEFORE definition -> OEWN source definition -> AFTER definition (exact OEWN text).
//
// Subcommands:
//   audit    --archive <zip> [--write]   full independent re-audit of all approved pages from the verified OEWN archive
//   validate                             fail-closed validation of the committed manifest against current pages (offline)
//   dry-run  [--archive <zip>] [--list] [--json <path>]   show exactly what WOULD change; no writes to pages
//   apply    --archive <zip> --confirm APPLY_275_DEFINITION_CLEANUPS   (SEO-R6B.1 engine; NOT authorised yet)
//            all-or-nothing preflight of every page, staged writes, hash verification, rollback on failure
//   verify   [--archive <zip>] [--no-git]   post-application verification (manifest APPLIED): AFTER hashes, frozen untouched,
//            reverse proof of BEFORE, optional git proof against applied.before_state_commit (SEO-R6B.3)
//   mark-applied --before-commit <sha> --archive <zip>   one-time PROPOSED -> APPLIED transition, only after verification
// The --validate / --dry-run / --apply / --verify spellings are accepted as aliases of the subcommands.
// A manifest with status APPLIED can never be applied again; audit --write refuses to overwrite it.
//
// Contamination types (a page definition is compared with the OEWN synset it was taken from):
//   CLEAN                              text equals the OEWN definition
//   RAW_OEWN_EXAMPLE_CONTAMINATION     text = OEWN definition + '; "quoted example..."' material copied from the gloss
//   CITATION_RESIDUE                   text = OEWN definition + '; - <attribution>' fragments left from stripped quotations
// Anything else (no unique synset, edit locations not provable) is MANUAL_REVIEW. Nothing is ever guessed.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');

const MANIFEST_SCHEMA = 'ovidhan.dictionary-v2.definition-cleanup-manifest/1';
const MANIFEST_PATH = path.join(lib.V2_DIR, 'definition-cleanup-manifest.json');
const MANIFEST_REF = 'dictionary-v2/definition-cleanup-manifest.json';
const TYPES = Object.freeze({
    CLEAN: 'CLEAN',
    RAW: 'RAW_OEWN_EXAMPLE_CONTAMINATION',
    RESIDUE: 'CITATION_RESIDUE'
});

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const countOccurrences = (haystack, needle) => (needle ? haystack.split(needle).length - 1 : 0);

// ---------------------------------------------------------------- classification
// Returns null if text cannot be explained by this synset.
function classifyAgainstSynset(text, synset) {
    const def = synset.definition;
    const gloss = synset.gloss;
    if (text === def) return { type: TYPES.CLEAN, removed: '' };
    if (text.startsWith(def + '; "') && gloss.startsWith(text)) {
        return { type: TYPES.RAW, removed: text.slice(def.length), coverage: text === gloss ? 'FULL' : 'PARTIAL' };
    }
    if (text.startsWith(def + '; - ')) {
        const removed = text.slice(def.length);
        if (removed.includes('"')) return null;
        const fragments = removed.slice(4).split('; - ');
        // every fragment must be an attribution that really follows a quoted example in the gloss
        if (fragments.length && fragments.every((f) => f.length > 0 && gloss.includes('" - ' + f))) {
            return { type: TYPES.RESIDUE, removed };
        }
    }
    return null;
}

function contaminationFor(type, removed) {
    if (type === TYPES.RAW) return [{ kind: 'OEWN_QUOTED_EXAMPLES_IN_DEFINITION', quoted_examples: [...removed.matchAll(/"([^"]+)"/g)].map((m) => m[1]) }];
    if (type === TYPES.RESIDUE) return [{ kind: 'OEWN_ATTRIBUTION_IN_DEFINITION' }];
    return [];
}

const synsetFromEntry = (entry) => ({
    id: entry.source_synset_id,
    pos: entry.pos,
    words: entry.oewn.words,
    gloss: entry.oewn.gloss,
    definition: entry.oewn.definition,
    quoted_examples: lib.splitGloss(entry.oewn.gloss).quoted_examples
});

const learnerFields = (page) => ({
    part_of_speech: page.part_of_speech,
    bangla_meaning: page.bangla_meaning,
    bangla_explanation: page.bangla_explanation,
    example_en: page.example_en,
    example_bn: page.example_bn
});
const learnerFieldsHash = (page) => lib.sha256(Buffer.from(lib.canonicalJson(learnerFields(page)), 'utf8'));

// ---------------------------------------------------------------- page edit plan (in memory only)
// The definition appears in exactly two places: the visible .definition span and the JSON-LD DefinedTerm description.
// locateEdit finds the two byte ranges that a cleanup may touch. No fuzzy matching: exact text, exactly once.
function locateEdit(html, entry) {
    const errors = [];
    const before = entry.before_definition;
    const after = entry.after_definition;
    const blocks = [...html.matchAll(/(<p class="definition"[^>]*>[\s\S]*?<span[^>]*>)([\s\S]*?)(<\/span>)/g)];
    if (blocks.length !== 1) { errors.push('expected exactly one .definition block, found ' + blocks.length); return { ranges: null, errors }; }
    // Two escaping styles exist in the corpus: quotes as &quot; (entity) or literal quotes. Both are valid HTML;
    // the page's own style is preserved so the edit stays minimal.
    const styles = [escapeHtml, escapeText];
    const escape = styles.find((fn) => blocks[0][2] === fn(before));
    if (!escape) errors.push('.definition span is not exactly the BEFORE definition in a known escaping style');
    const ldBefore = '"description": ' + JSON.stringify(before);
    const ldAfter = '"description": ' + JSON.stringify(after);
    if (countOccurrences(html, ldBefore) !== 1) errors.push('JSON-LD description literal found ' + countOccurrences(html, ldBefore) + ' times (expected exactly 1)');
    if (errors.length) return { ranges: null, errors };
    const visibleStart = blocks[0].index + blocks[0][1].length;
    const ldStart = html.indexOf(ldBefore);
    // the JSON-LD literal must live inside the DefinedTerm script, nowhere else
    const scriptStart = html.lastIndexOf('<script type="application/ld+json">', ldStart);
    const scriptEnd = html.indexOf('</script>', ldStart);
    if (scriptStart < 0 || scriptEnd < 0 || !html.slice(scriptStart, scriptEnd).includes('"@type": "DefinedTerm"')) errors.push('JSON-LD description literal is not inside the DefinedTerm script');
    const ranges = [
        { kind: 'VISIBLE_DEFINITION', start: visibleStart, end: visibleStart + blocks[0][2].length, old: blocks[0][2], neu: escape(after), style: escape === escapeHtml ? 'ENTITY_QUOTES' : 'LITERAL_QUOTES' },
        { kind: 'JSON_LD_DESCRIPTION', start: ldStart, end: ldStart + ldBefore.length, old: ldBefore, neu: ldAfter }
    ].sort((x, y) => x.start - y.start);
    if (ranges[0].end > ranges[1].start) errors.push('the two mutation locations overlap');
    return { ranges, errors };
}

// Applies the two replacements in memory: the only code path that produces an AFTER page.
function planPageCleanup(html, entry) {
    const { ranges, errors } = locateEdit(html, entry);
    if (errors.length) return { html: null, errors };
    const [first, second] = ranges;
    const next = html.slice(0, first.start) + first.neu + html.slice(first.end, second.start) + second.neu + html.slice(second.end);
    return { html: next, errors };
}

// Proves a (proposed or real) AFTER page differs from BEFORE only by the cleaned definition.
function verifyCleanupDiff(beforeHtml, afterHtml, entry) {
    const errors = [];
    const b = lib.extractV1Page(beforeHtml);
    const a = lib.extractV1Page(afterHtml);
    for (const problem of [...b.problems, ...a.problems]) errors.push('page structure: ' + problem);
    for (const field of ['part_of_speech', 'bangla_meaning', 'bangla_explanation', 'example_en', 'example_bn', 'h1', 'title', 'canonical', 'source_line_text']) {
        if (a[field] !== b[field]) errors.push(field + ' changed');
    }
    if (JSON.stringify(a.source_line_hrefs) !== JSON.stringify(b.source_line_hrefs)) errors.push('source_line_hrefs changed');
    if (a.definition !== entry.after_definition) errors.push('definition after cleanup is not the clean OEWN definition');
    const plan = planPageCleanup(beforeHtml, entry);
    if (plan.errors.length) errors.push(...plan.errors.map((e) => 'plan: ' + e));
    else if (plan.html !== afterHtml) errors.push('page differs from the expected cleanup outside the two definition locations');
    return errors;
}

// ---------------------------------------------------------------- audit
function auditPage(slug, html, oewn) {
    const page = lib.extractV1Page(html);
    const result = { slug, category: 'MANUAL_REVIEW', reasons: [], page, html };
    if (page.problems.length) { result.reasons.push('page not parseable: ' + page.problems.join('; ')); return result; }
    const candidates = oewn.synsetsForLemma(slug).filter((s) => s.pos === page.part_of_speech);
    const matches = [];
    for (const synset of candidates) {
        const c = classifyAgainstSynset(page.definition, synset);
        if (c) matches.push({ synset, ...c });
    }
    const distinct = [...new Map(matches.map((m) => [m.synset.id, m])).values()];
    if (distinct.length === 0) { result.reasons.push('NO_SAFE_SOURCE_SYNSET: displayed definition is not derived from any OEWN ' + page.part_of_speech + ' synset of "' + slug + '"'); return result; }
    if (distinct.length > 1) { result.reasons.push('AMBIGUOUS_SOURCE_SYNSET: ' + distinct.map((m) => m.synset.id).join(', ')); return result; }
    const match = distinct[0];
    result.category = match.type;
    result.synset = match.synset;
    result.removed = match.removed;
    result.coverage = match.coverage;
    if (match.type !== TYPES.CLEAN) {
        const plan = planPageCleanup(html, { before_definition: page.definition, after_definition: match.synset.definition });
        if (plan.errors.length) { result.plan_errors = plan.errors; result.reasons.push(...plan.errors.map((e) => 'EDIT_NOT_PROVABLE: ' + e)); }
        else result.after_html = plan.html;
    }
    return result;
}

function buildEntry(a, isFrozen) {
    const entry = {
        slug: a.slug,
        pos: a.page.part_of_speech,
        contamination_type: a.category,
        frozen: isFrozen,
        source_synset_id: a.synset.id,
        before_definition: a.page.definition,
        after_definition: a.synset.definition,
        removed_material: a.removed,
        oewn: { gloss: a.synset.gloss, definition: a.synset.definition, words: a.synset.words, line_sha256: a.synset.line_sha256 },
        page: { path: 'word/' + a.slug + '.html', sha256_lf_before: lib.sha256Lf(Buffer.from(a.html, 'utf8')) },
        learner_fields_sha256: learnerFieldsHash(a.page),
        edit_locations: ['visible_definition_span', 'json_ld_defined_term_description']
    };
    if (a.coverage) entry.raw_gloss_coverage = a.coverage;
    if (!isFrozen) entry.page.sha256_lf_after_expected = lib.sha256Lf(Buffer.from(a.after_html, 'utf8'));
    return entry;
}

function fingerprint(cleanRows) {
    const rows = [...cleanRows].sort((x, y) => (x.slug < y.slug ? -1 : 1));
    return {
        clean_slugs: rows.map((r) => r.slug),
        clean_definitions_sha256: lib.sha256(Buffer.from(rows.map((r) => r.slug + '\t' + r.definition + '\n').join(''), 'utf8'))
    };
}

function buildManifest({ registry, readPage, oewn, frozen, provenance }) {
    const slugs = [...registry].sort();
    const audits = slugs.map((slug) => auditPage(slug, readPage(slug), oewn));
    const entries = [], frozenDocumented = [], manual = [], cleanRows = [];
    for (const a of audits) {
        const isFrozen = frozen.has(a.slug);
        if (a.category === TYPES.CLEAN) { cleanRows.push({ slug: a.slug, definition: a.page.definition }); continue; }
        if (a.category === 'MANUAL_REVIEW' || a.plan_errors) {
            manual.push({
                slug: a.slug, frozen: isFrozen,
                contamination_type: a.category === 'MANUAL_REVIEW' ? 'UNRESOLVED' : a.category,
                reasons: a.reasons, page_definition: a.page.definition
            });
            continue;
        }
        if (isFrozen) frozenDocumented.push(buildEntry(a, true));
        else entries.push(buildEntry(a, false));
    }
    const count = (list, type) => list.filter((e) => e.contamination_type === type).length;
    const rawTotal = count(entries, TYPES.RAW) + count(frozenDocumented, TYPES.RAW) + count(manual, TYPES.RAW);
    const residueTotal = count(entries, TYPES.RESIDUE) + count(frozenDocumented, TYPES.RESIDUE) + count(manual, TYPES.RESIDUE);
    return {
        schema: MANIFEST_SCHEMA,
        phase: 'SEO-R6B',
        status: 'PROPOSED_NOT_APPLIED',
        description: DESCRIPTION_PROPOSED,
        oewn: { release: provenance.source.release, archive_sha256: provenance.source.archive_sha256.toLowerCase() },
        rules: [
            'AFTER definition is exactly the OEWN definition of the verified source synset (text before the first \'; "\' of the gloss). No paraphrase, no enrichment.',
            'RAW_OEWN_EXAMPLE_CONTAMINATION: BEFORE = AFTER + \'; "..."\' material that is a prefix of the OEWN gloss.',
            'CITATION_RESIDUE: BEFORE = AFTER + \'; - <attribution>\' fragments, each of which follows a quoted example in the OEWN gloss.',
            'Only two page locations change: the visible .definition span and the JSON-LD DefinedTerm description. Everything else (POS, Bangla meaning, Bangla explanation, examples, canonical, title, structure) must be byte-identical.',
            'Frozen experiment pages are documented in frozen_documented and must never be applied.',
            'A page whose source synset or edit locations cannot be proved is listed in manual_review and is never edited automatically.'
        ],
        summary: {
            approved_corpus: slugs.length,
            clean: cleanRows.length,
            raw_oewn_example_contamination: rawTotal,
            citation_residue: residueTotal,
            unresolved_no_safe_source: manual.filter((m) => m.contamination_type === 'UNRESOLVED').length,
            safe_non_frozen_cleanup: entries.length,
            safe_non_frozen_by_type: { raw_oewn_example_contamination: count(entries, TYPES.RAW), citation_residue: count(entries, TYPES.RESIDUE) },
            frozen_excluded: frozenDocumented.length,
            frozen_excluded_slugs: frozenDocumented.map((e) => e.slug),
            manual_review: manual.length
        },
        corpus_fingerprint: fingerprint(cleanRows),
        entries,
        frozen_documented: frozenDocumented,
        manual_review: manual
    };
}

// ---------------------------------------------------------------- manifest validation (fail closed)
function validateEntry(entry, ctx, { applicable, mode = 'PROPOSED' }) {
    const errors = [];
    const where = (entry.slug || '?') + ': ';
    const fail = (m) => errors.push(where + m);
    if (!/^[a-z]+(-[a-z]+)*$/.test(entry.slug || '')) { fail('bad slug'); return errors; }
    if (!ctx.registry.has(entry.slug)) fail('slug is not in the approved registry');
    if (applicable) {
        if (entry.frozen !== false) fail('applicable entry must have frozen=false');
        if (ctx.frozen.has(entry.slug)) fail('slug is frozen and must not be cleaned');
    } else {
        if (entry.frozen !== true || !ctx.frozen.has(entry.slug)) fail('documented-only entry must be a frozen word');
        if (entry.page && entry.page.sha256_lf_after_expected) fail('frozen entry must not carry an expected AFTER page');
    }
    if (!/^[0-9]{8}-[nvar]$/.test(entry.source_synset_id || '')) { fail('bad source_synset_id'); return errors; }
    if (lib.POS_BY_SUFFIX[entry.source_synset_id.slice(-1)] !== entry.pos) fail('POS differs from the source synset POS');
    if (!(entry.oewn.words || []).some((w) => w.toLowerCase() === entry.slug)) fail('headword is not a lemma of the source synset');
    if (lib.splitGloss(entry.oewn.gloss).definition !== entry.oewn.definition) fail('OEWN definition does not derive from the OEWN gloss');
    if (entry.after_definition !== entry.oewn.definition) fail('AFTER definition is not exactly the OEWN definition');
    if (!entry.before_definition.startsWith(entry.after_definition)) fail('BEFORE does not start with AFTER');
    if (entry.removed_material !== entry.before_definition.slice(entry.after_definition.length) || !entry.removed_material) fail('removed_material is not exactly BEFORE minus AFTER');
    const classified = classifyAgainstSynset(entry.before_definition, synsetFromEntry(entry));
    if (!classified || classified.type !== entry.contamination_type || classified.type === TYPES.CLEAN) fail('removal is not provably OEWN contamination of type ' + entry.contamination_type);
    if (entry.raw_gloss_coverage && classified && classified.coverage !== entry.raw_gloss_coverage) fail('raw_gloss_coverage mismatch');
    if (ctx.readPage) {
        let html;
        try { html = ctx.readPage(entry.slug); } catch (error) { fail('page cannot be read: ' + error.message); return errors; }
        const hash = lib.sha256Lf(Buffer.from(html, 'utf8'));
        const page = lib.extractV1Page(html);
        if (learnerFieldsHash(page) !== entry.learner_fields_sha256) fail('learner-facing fields (POS, Bangla meaning, Bangla explanation, examples) differ from the audited page');
        if (mode === 'APPLIED') {
            // Post-application verification: applicable pages must be exactly at the AFTER hash, frozen pages exactly at BEFORE.
            if (applicable) {
                if (hash !== entry.page.sha256_lf_after_expected) fail('AFTER_HASH_MISMATCH: page drifted from the applied state (fail closed)');
                else {
                    if (page.definition !== entry.after_definition) fail('applied page definition is not the clean OEWN definition');
                    const reversed = reverseCleanup(html, entry);
                    if (reversed.errors.length) fail('applied page is not provably BEFORE plus the two replacements: ' + reversed.errors.join('; '));
                }
            } else if (hash !== entry.page.sha256_lf_before) fail('FROZEN_CHANGED: frozen page differs from its audited BEFORE state');
            else if (page.definition !== entry.before_definition) fail('frozen page definition differs from the documented contaminated definition');
        } else if (hash === entry.page.sha256_lf_before) {
            if (applicable) {
                const plan = planPageCleanup(html, entry);
                if (plan.errors.length) fail('edit not provable: ' + plan.errors.join('; '));
                else {
                    if (lib.sha256Lf(Buffer.from(plan.html, 'utf8')) !== entry.page.sha256_lf_after_expected) fail('expected AFTER page hash mismatch');
                    for (const e of verifyCleanupDiff(html, plan.html, entry)) fail('diff: ' + e);
                }
            }
        } else if (applicable && hash === entry.page.sha256_lf_after_expected) {
            fail('page is already at the AFTER state but the manifest status is PROPOSED_NOT_APPLIED (inconsistent)');
        } else fail('page changed since the audit (hash mismatch)');
    }
    return errors;
}

function validateManifest(manifest, ctx) {
    const errors = [];
    if (manifest.schema !== MANIFEST_SCHEMA) errors.push('manifest: unknown schema');
    if (manifest.status !== 'PROPOSED_NOT_APPLIED' && manifest.status !== 'APPLIED') errors.push('manifest: bad status');
    if (manifest.oewn.archive_sha256 !== ctx.provenance.source.archive_sha256.toLowerCase()) errors.push('manifest: archive_sha256 differs from provenance');
    const sorted = (list) => list.every((e, i) => i === 0 || list[i - 1].slug < e.slug);
    for (const key of ['entries', 'frozen_documented', 'manual_review']) if (!sorted(manifest[key])) errors.push(key + ': must be sorted by slug without duplicates');
    const mode = manifest.status === 'APPLIED' ? 'APPLIED' : 'PROPOSED';
    errors.push(...validateApplicationState(manifest));
    for (const e of manifest.entries) errors.push(...validateEntry(e, ctx, { applicable: true, mode }));
    for (const e of manifest.frozen_documented) errors.push(...validateEntry(e, ctx, { applicable: false, mode }));
    for (const m of manifest.manual_review) {
        if (!ctx.registry.has(m.slug)) errors.push(m.slug + ': manual-review slug is not approved');
        if (!m.reasons || !m.reasons.length) errors.push(m.slug + ': manual-review entry needs a reason');
    }
    const clean = manifest.corpus_fingerprint.clean_slugs;
    const groups = [clean, manifest.entries.map((e) => e.slug), manifest.frozen_documented.map((e) => e.slug), manifest.manual_review.map((e) => e.slug)];
    const all = groups.flat();
    if (new Set(all).size !== all.length) errors.push('manifest: a slug appears in more than one group');
    if (all.length !== ctx.registry.size || !all.every((s) => ctx.registry.has(s))) errors.push('manifest: groups do not cover the approved registry exactly (' + all.length + ' vs ' + ctx.registry.size + ')');
    const s = manifest.summary;
    if (s.approved_corpus !== ctx.registry.size || s.clean !== clean.length || s.safe_non_frozen_cleanup !== manifest.entries.length || s.frozen_excluded !== manifest.frozen_documented.length || s.manual_review !== manifest.manual_review.length) errors.push('manifest: summary counts disagree with the lists');
    if (ctx.readPage && ctx.checkClean) {
        const rows = clean.map((slug) => ({ slug, definition: lib.extractV1Page(ctx.readPage(slug)).definition }));
        if (fingerprint(rows).clean_definitions_sha256 !== manifest.corpus_fingerprint.clean_definitions_sha256) errors.push('manifest: clean pages no longer match the audited definitions');
    }
    return errors;
}

// ---------------------------------------------------------------- applied state (SEO-R6B.3)
// A manifest is either PROPOSED_NOT_APPLIED (pages must be at BEFORE) or APPLIED (pages must be at AFTER; frozen pages
// still at BEFORE). All BEFORE evidence is preserved in both states. APPLIED manifests can never be applied again.
const DESCRIPTION_PROPOSED = 'Proof of the V1 definition cleanup: BEFORE (live page) -> OEWN source definition -> AFTER (exactly the OEWN definition). Nothing in this file has been applied to word/*.html.';
const DESCRIPTION_APPLIED = 'Record of the applied V1 definition cleanup: BEFORE (page at applied.before_state_commit) -> OEWN source definition -> AFTER (exactly the OEWN definition, now live in word/*.html). The five frozen experiment pages were deliberately NOT applied.';
const APPLICATION_STATE = Object.freeze({ APPLIED: 'APPLIED', FROZEN: 'NOT_APPLIED_FROZEN' });

function validateApplicationState(manifest) {
    const errors = [];
    const applied = manifest.status === 'APPLIED';
    const states = [...manifest.entries, ...manifest.frozen_documented].map((e) => e.application_state);
    if (applied) {
        const a = manifest.applied;
        if (!a || !/^[0-9a-f]{40}$/.test(a.before_state_commit || '')) errors.push('manifest: applied.before_state_commit is missing or not a full commit SHA');
        else {
            if (a.phase !== 'SEO-R6B.3') errors.push('manifest: applied.phase is wrong');
            if (a.pages_applied !== manifest.entries.length) errors.push('manifest: applied.pages_applied disagrees with entries');
            if (JSON.stringify(a.frozen_not_applied) !== JSON.stringify(manifest.frozen_documented.map((e) => e.slug))) errors.push('manifest: applied.frozen_not_applied disagrees with the frozen entries');
        }
        if (manifest.entries.some((e) => e.application_state !== APPLICATION_STATE.APPLIED)) errors.push('manifest: every applicable entry must be application_state APPLIED');
        if (manifest.frozen_documented.some((e) => e.application_state !== APPLICATION_STATE.FROZEN)) errors.push('manifest: every frozen entry must be application_state NOT_APPLIED_FROZEN');
        if (manifest.manual_review.length) errors.push('manifest: an APPLIED manifest cannot carry manual-review pages');
        if (manifest.summary.applied_non_frozen_cleanup !== manifest.entries.length || manifest.summary.frozen_not_applied !== manifest.frozen_documented.length) errors.push('manifest: applied summary counts disagree with the lists');
        if (manifest.description !== DESCRIPTION_APPLIED) errors.push('manifest: description does not describe the APPLIED state');
    } else {
        if (manifest.applied !== undefined || states.some((s) => s !== undefined) || manifest.summary.applied_non_frozen_cleanup !== undefined || manifest.summary.frozen_not_applied !== undefined) errors.push('manifest: a PROPOSED_NOT_APPLIED manifest must not carry application state');
    }
    return errors;
}

// PROPOSED -> APPLIED. Pure transformation; preserves every BEFORE/AFTER/synset/classification field.
function markApplied(manifest, beforeStateCommit) {
    if (manifest.status !== 'PROPOSED_NOT_APPLIED') throw new Error('only a PROPOSED_NOT_APPLIED manifest can be marked APPLIED (status is "' + manifest.status + '")');
    const next = JSON.parse(JSON.stringify(manifest));
    next.status = 'APPLIED';
    next.description = DESCRIPTION_APPLIED;
    next.applied = {
        phase: 'SEO-R6B.3',
        before_state_commit: beforeStateCommit,
        applied_with: 'scripts/dictionary-v2/definition-cleanup.js apply (SEO-R6B.2)',
        pages_applied: next.entries.length,
        frozen_not_applied: next.frozen_documented.map((e) => e.slug)
    };
    next.entries.forEach((e) => { e.application_state = APPLICATION_STATE.APPLIED; });
    next.frozen_documented.forEach((e) => { e.application_state = APPLICATION_STATE.FROZEN; });
    next.summary.applied_non_frozen_cleanup = next.entries.length;
    next.summary.frozen_not_applied = next.frozen_documented.length;
    return next;
}

// APPLIED -> PROPOSED (exact inverse of markApplied). Used to rebuild the pre-application view for fixtures and tests.
function asProposed(manifest) {
    const next = JSON.parse(JSON.stringify(manifest));
    next.status = 'PROPOSED_NOT_APPLIED';
    next.description = DESCRIPTION_PROPOSED;
    delete next.applied;
    for (const e of [...next.entries, ...next.frozen_documented]) delete e.application_state;
    delete next.summary.applied_non_frozen_cleanup;
    delete next.summary.frozen_not_applied;
    return next;
}

// Reconstructs the BEFORE page from an applied page by swapping the two replacements back, and proves it by hash.
// The visible span's escaping style cannot be inferred from the clean text, so both known styles are tried;
// only the one that reproduces the audited BEFORE hash is accepted.
function reverseCleanup(html, entry) {
    const located = locateEdit(html, { before_definition: entry.after_definition, after_definition: entry.before_definition });
    if (located.errors.length) return { html: null, errors: located.errors.map((e) => 'reverse: ' + e) };
    const [first, second] = located.ranges;
    for (const style of [escapeHtml, escapeText]) {
        const text = (range) => (range.kind === 'VISIBLE_DEFINITION' ? style(entry.before_definition) : range.neu);
        const candidate = html.slice(0, first.start) + text(first) + html.slice(first.end, second.start) + text(second) + html.slice(second.end);
        if (lib.sha256Lf(Buffer.from(candidate, 'utf8')) === entry.page.sha256_lf_before) return { html: candidate, errors: [] };
    }
    return { html: null, errors: ['reverse: the reconstructed page does not equal the audited BEFORE hash'] };
}

function gitReader(root = lib.ROOT) {
    const { execFileSync } = require('node:child_process');
    return (ref, relPath) => execFileSync('git', ['show', ref + ':' + relPath], { cwd: root, maxBuffer: 1 << 26 }).toString('utf8');
}

// Fail-closed verification of the applied state. options.oewn: verified OEWN lookup. options.gitRead(ref, path): optional
// independent proof against the pre-application commit (full byte-range and structure comparison).
function verifyApplied(manifest, ctx, options = {}) {
    const errors = [];
    if (manifest.status !== 'APPLIED') errors.push('manifest status is "' + manifest.status + '" (expected APPLIED)');
    errors.push(...validateManifest(manifest, ctx));
    const counts = {
        approved_corpus: ctx.registry.size,
        applied_non_frozen_cleanup: manifest.entries.length,
        frozen_excluded: manifest.frozen_documented.length,
        frozen_unchanged: 0,
        manual_review: manifest.manual_review.length,
        clean_unchanged: manifest.corpus_fingerprint.clean_slugs.length,
        after_hash_matches: 0,
        visible_definition_changes: 0,
        json_ld_changes: 0,
        reverse_proofs: 0,
        git_proof: Boolean(options.gitRead),
        git_unrelated_changed_lines: options.gitRead ? 0 : null,
        git_pages_proven: 0
    };
    for (const entry of manifest.entries) {
        let html;
        try { html = ctx.readPage(entry.slug); } catch (error) { errors.push(entry.slug + ': page cannot be read'); continue; }
        if (lib.sha256Lf(Buffer.from(html, 'utf8')) === entry.page.sha256_lf_after_expected) counts.after_hash_matches++;
        if (lib.extractV1Page(html).definition === entry.after_definition) counts.visible_definition_changes++;
        if (countOccurrences(html, '"description": ' + JSON.stringify(entry.after_definition)) === 1 && countOccurrences(html, '"description": ' + JSON.stringify(entry.before_definition)) === 0) counts.json_ld_changes++;
        if (!reverseCleanup(html, entry).errors.length) counts.reverse_proofs++;
        if (options.oewn) for (const e of verifySynsetAgainstSource(entry, options.oewn)) errors.push(entry.slug + ': ' + e);
        if (options.gitRead) {
            const ref = manifest.applied && manifest.applied.before_state_commit;
            try {
                const before = lib.toLf(options.gitRead(ref, entry.page.path));
                const after = lib.toLf(html);
                if (lib.sha256Lf(Buffer.from(before, 'utf8')) !== entry.page.sha256_lf_before) errors.push(entry.slug + ': page at ' + ref.slice(0, 10) + ' does not have the audited BEFORE hash');
                else {
                    const proof = verifyAfterState(before, after, entry);
                    proof.errors.forEach((e) => errors.push(entry.slug + ': ' + e));
                    counts.git_unrelated_changed_lines += proof.unrelated_byte_changes || 0;
                    counts.git_pages_proven++;
                }
            } catch (error) { errors.push(entry.slug + ': git proof failed: ' + error.message.split('\n')[0]); }
        }
    }
    for (const entry of manifest.frozen_documented) {
        let html;
        try { html = ctx.readPage(entry.slug); } catch (error) { errors.push(entry.slug + ': frozen page cannot be read'); continue; }
        if (lib.sha256Lf(Buffer.from(html, 'utf8')) === entry.page.sha256_lf_before) counts.frozen_unchanged++;
        if (options.oewn) for (const e of verifySynsetAgainstSource(entry, options.oewn)) errors.push(entry.slug + ': ' + e);
    }
    const n = manifest.entries.length;
    for (const key of ['after_hash_matches', 'visible_definition_changes', 'json_ld_changes', 'reverse_proofs']) if (counts[key] !== n) errors.push('applied verification: ' + key + ' = ' + counts[key] + ' (expected ' + n + ')');
    if (counts.frozen_unchanged !== manifest.frozen_documented.length) errors.push('applied verification: frozen_unchanged = ' + counts.frozen_unchanged + ' (expected ' + manifest.frozen_documented.length + ')');
    if (options.gitRead && counts.git_pages_proven !== n) errors.push('applied verification: git proof covered ' + counts.git_pages_proven + ' of ' + n + ' pages');
    return { ok: errors.length === 0, errors: [...new Set(errors)], counts };
}

// ---------------------------------------------------------------- structured-record support
// Converts a V1_MIGRATION record (built from the page in either its contaminated or its already cleaned state)
// into a 1.1.0 record whose definition.text is the clean OEWN definition and whose v1_original keeps the audit trail.
function applyEntryToRecord(record, entry) {
    const next = JSON.parse(JSON.stringify(record));
    const sense = next.senses[0];
    if (sense.definition.text !== entry.before_definition && sense.definition.text !== entry.after_definition) {
        throw new Error(record.slug + ': record definition matches neither BEFORE nor AFTER of the cleanup entry');
    }
    next.schema_version = '1.1.0';
    next.provenance.v1_migration.source_page_sha256_lf = entry.page.sha256_lf_before;
    sense.definition = {
        text: entry.after_definition,
        origin: 'OEWN_GLOSS',
        oewn_definition: entry.after_definition,
        v1_original: {
            text: entry.before_definition,
            contamination: contaminationFor(entry.contamination_type, entry.removed_material),
            removed_material: entry.removed_material,
            cleanup_manifest: MANIFEST_REF
        }
    };
    return next;
}

function loadManifest() { return lib.readJson(MANIFEST_PATH); }

function makeContext(root = lib.ROOT) {
    return {
        root,
        registry: lib.loadRegistry(root),
        frozen: lib.loadFrozenWords(root),
        provenance: lib.readJson(path.join(root, 'dictionary-v2', 'oewn-2025-provenance.json')),
        readPage: (slug) => lib.readV1Page(slug, root), // the V1 page: live, or its baseline once SEO-R6E replaced it with a V2 page
        checkClean: true
    };
}

// ---------------------------------------------------------------- dry run
function dryRun(manifest, ctx) {
    const rows = [];
    for (const e of manifest.entries) {
        const html = ctx.readPage(e.slug);
        const state = lib.sha256Lf(Buffer.from(html, 'utf8')) === e.page.sha256_lf_after_expected ? 'ALREADY_CLEANED' : 'WOULD_CHANGE';
        rows.push({ slug: e.slug, action: state, frozen: false, reason: e.contamination_type, source_synset: e.source_synset_id, old_definition: e.before_definition, new_definition: e.after_definition, removed_material: e.removed_material });
    }
    for (const e of manifest.frozen_documented) {
        rows.push({ slug: e.slug, action: 'EXCLUDED_FROZEN_UNTOUCHED', frozen: true, reason: e.contamination_type, source_synset: e.source_synset_id, old_definition: e.before_definition, new_definition: e.after_definition, removed_material: e.removed_material });
    }
    for (const m of manifest.manual_review) {
        rows.push({ slug: m.slug, action: 'MANUAL_REVIEW', frozen: m.frozen, reason: m.contamination_type + ': ' + m.reasons.join(' | '), source_synset: null, old_definition: m.page_definition, new_definition: null, removed_material: null });
    }
    rows.sort((a, b) => (a.slug < b.slug ? -1 : 1));
    return { summary: manifest.summary, rows };
}

// ================================================================ guarded apply engine (SEO-R6B.1)
// CURRENT PAGE -> verify exact expected state -> replace exactly two locations -> verify result -> nothing else changes.
// Preflight is all-or-nothing and side-effect free. Writing is staged, verified and rolled back on any failure.
// The replacement text is always entry.after_definition, i.e. the verified OEWN definition from the R6B manifest.
// Hashes are LF-normalised full-page SHA-256 (checkout independent); byte proofs run on the raw text, so CRLF
// working trees are preserved exactly.

const APPLY_CONFIRMATION = 'APPLY_275_DEFINITION_CLEANUPS';
const STAGING_SUFFIX = '.r6b1-staging';
const pageHash = (text) => lib.sha256Lf(Buffer.from(text, 'utf8'));

// Number of bytes in which two texts differ (0 when identical): length of the window between common prefix and suffix.
function differingBytes(a, b) {
    const x = Buffer.from(a, 'utf8'), y = Buffer.from(b, 'utf8');
    if (x.equals(y)) return 0;
    let p = 0;
    while (p < x.length && p < y.length && x[p] === y[p]) p++;
    let s = 0;
    while (s < x.length - p && s < y.length - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
    return Math.max(x.length, y.length) - p - s;
}

// Everything structural and learner-facing, extracted independently of the two mutation ranges.
function structureOf(html) {
    const grab = (re) => { const m = re.exec(html); return m ? m[0] : null; };
    const all = (re, pick = (m) => m[0]) => [...html.matchAll(re)].map(pick).join('\n\u0000\n');
    const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    let definedTerm = null;
    const otherLd = [];
    for (const block of ldBlocks) {
        let parsed = null;
        try { parsed = JSON.parse(block); } catch { parsed = null; }
        if (parsed && parsed['@type'] === 'DefinedTerm') { definedTerm = parsed; } else otherLd.push(block);
    }
    const definedTermRest = definedTerm ? JSON.stringify(Object.fromEntries(Object.entries(definedTerm).filter(([k]) => k !== 'description'))) : null;
    const surrounding = html
        .replace(/(<p class="definition"[^>]*>[\s\S]*?<span[^>]*>)[\s\S]*?(<\/span>)/, '$1\u00a7$2')
        .replace(/("description": )"(?:[^"\\]|\\.)*"/, '$1\u00a7');
    return {
        title: grab(/<title>[\s\S]*?<\/title>/),
        meta_description: grab(/<meta name="description"[^>]*>/),
        canonical: grab(/<link rel="canonical"[^>]*>/),
        breadcrumbs: otherLd.join('\n'),
        defined_term_other_fields: definedTermRest,
        h1: grab(/<h1>[\s\S]*?<\/h1>/),
        bangla_meaning: grab(/<p class="bangla-meaning"[\s\S]*?<\/p>/),
        part_of_speech: grab(/<p class="part-of-speech"[\s\S]*?<\/p>/),
        bangla_explanation: grab(/<p class="bangla-explanation"[\s\S]*?<\/p>/),
        english_example: grab(/<p class="example"[\s\S]*?<\/p>/),
        bangla_example: grab(/<p class="bangla-example"[\s\S]*?<\/p>/),
        attribution: grab(/<p class="lexical-source"[\s\S]*?<\/p>/),
        learning_explorer: grab(/<div class="explorer-container"[\s\S]*?<\/main>/),
        links: all(/\b(?:href|src)="([^"]*)"/g, (m) => m[1]),
        scripts: all(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/g),
        styles: all(/<style[\s\S]*?<\/style>/g),
        classes_and_styles: all(/\b(?:class|style)="([^"]*)"/g, (m) => m[0]),
        surrounding_html: surrounding
    };
}

function compareStructure(beforeHtml, afterHtml) {
    const b = structureOf(beforeHtml), a = structureOf(afterHtml);
    return Object.keys(b).map((name) => ({ name, unchanged: b[name] === a[name] && b[name] !== undefined }));
}

// Exhaustive proof that afterHtml is beforeHtml with exactly the two expected locations replaced.
function verifyAfterState(beforeHtml, afterHtml, entry) {
    const errors = [];
    const located = locateEdit(beforeHtml, entry);
    if (located.errors.length) return { errors: located.errors.map((e) => 'before-state: ' + e), visible_mutations: 0, json_ld_mutations: 0, unrelated_byte_changes: null, structure: [] };
    const [first, second] = located.ranges;
    const expected = beforeHtml.slice(0, first.start) + first.neu + beforeHtml.slice(first.end, second.start) + second.neu + beforeHtml.slice(second.end);
    // byte-range proof: every byte outside the two ranges is identical, and the ranges hold exactly the clean definition
    const unrelated = differingBytes(afterHtml, expected);
    if (unrelated) errors.push('UNRELATED_BYTE_CHANGES: ' + unrelated + ' byte(s) differ from the only permitted mutation');
    // semantic location counts measured on the AFTER page itself
    const visibleBlocks = [...afterHtml.matchAll(/<p class="definition"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/g)];
    const visibleNew = visibleBlocks.filter((m) => m[1] === located.ranges.find((r) => r.kind === 'VISIBLE_DEFINITION').neu).length;
    const visibleOld = visibleBlocks.length - visibleNew;
    const ldNewLiteral = located.ranges.find((r) => r.kind === 'JSON_LD_DESCRIPTION').neu;
    const ldOldLiteral = located.ranges.find((r) => r.kind === 'JSON_LD_DESCRIPTION').old;
    const ldNew = countOccurrences(afterHtml, ldNewLiteral);
    const ldOld = countOccurrences(afterHtml, ldOldLiteral);
    if (visibleBlocks.length !== 1) errors.push('visible definition block count after cleanup is ' + visibleBlocks.length + ' (expected 1)');
    if (visibleNew !== 1 || visibleOld !== 0) errors.push('visible definition is not exactly the clean OEWN definition');
    if (ldNew !== 1) errors.push('JSON-LD description carries the clean OEWN definition ' + ldNew + ' times (expected 1)');
    if (ldOld !== 0) errors.push('old JSON-LD description still present ' + ldOld + ' times');
    // the same locations in the BEFORE page must have held the old text exactly once
    if (countOccurrences(beforeHtml, ldOldLiteral) !== 1) errors.push('old JSON-LD description not found exactly once in the BEFORE page');
    const structure = compareStructure(beforeHtml, afterHtml);
    for (const s of structure) if (!s.unchanged) errors.push('STRUCTURE_CHANGED: ' + s.name);
    errors.push(...verifyCleanupDiff(beforeHtml, afterHtml, entry).map((e) => 'diff: ' + e));
    const changedLines = [];
    const bl = beforeHtml.split('\n'), al = afterHtml.split('\n');
    if (bl.length !== al.length) errors.push('line count changed (' + bl.length + ' -> ' + al.length + ')');
    else bl.forEach((line, i) => { if (line !== al[i]) changedLines.push(i + 1); });
    if (!errors.length && changedLines.length !== 2) errors.push('expected exactly 2 changed lines, found ' + changedLines.length);
    return {
        errors,
        visible_mutations: visibleNew === 1 && visibleOld === 0 ? 1 : 0,
        json_ld_mutations: ldNew === 1 && ldOld === 0 ? 1 : 0,
        unrelated_byte_changes: unrelated,
        changed_lines: changedLines,
        structure
    };
}

// BEFORE-state lock plus derived AFTER state for one applicable entry; no writing.
function deriveLock(entry, html) {
    const located = locateEdit(html, entry);
    if (located.errors.length) return { lock: null, errors: located.errors };
    const visible = located.ranges.find((r) => r.kind === 'VISIBLE_DEFINITION');
    const json = located.ranges.find((r) => r.kind === 'JSON_LD_DESCRIPTION');
    return {
        errors: [],
        lock: {
            slug: entry.slug,
            page_path: entry.page.path,
            contamination_type: entry.contamination_type,
            source_synset_id: entry.source_synset_id,
            expected_before_sha256_lf: entry.page.sha256_lf_before,
            expected_after_sha256_lf: entry.page.sha256_lf_after_expected,
            old_visible_definition: visible.old,
            new_visible_definition: visible.neu,
            visible_escaping: visible.style,
            old_json_ld_description: json.old.slice('"description": '.length),
            new_json_ld_description: json.neu.slice('"description": '.length),
            clean_oewn_definition: entry.after_definition
        }
    };
}

// The synset id must resolve, in the VERIFIED OEWN source, to exactly the words, gloss and definition the entry carries.
// (Offline the entry is only self-consistent; this binds the id to the verified source.)
function verifySynsetAgainstSource(entry, oewn) {
    const s = oewn.get(entry.source_synset_id);
    if (!s) return ['SYNSET_UNVERIFIED: ' + entry.source_synset_id + ' does not exist in the verified OEWN source'];
    const errors = [];
    if (s.pos !== entry.pos) errors.push('SYNSET_UNVERIFIED: POS differs from the verified source synset');
    if (s.gloss !== entry.oewn.gloss) errors.push('SYNSET_UNVERIFIED: gloss differs from the verified source synset ' + entry.source_synset_id);
    if (s.definition !== entry.oewn.definition || s.definition !== entry.after_definition) errors.push('SYNSET_UNVERIFIED: clean definition is not the verified source definition');
    if (JSON.stringify(s.words) !== JSON.stringify(entry.oewn.words)) errors.push('SYNSET_UNVERIFIED: words differ from the verified source synset');
    if (s.line_sha256 !== entry.oewn.line_sha256) errors.push('SYNSET_UNVERIFIED: source line hash differs from the verified source synset');
    if (!s.words.some((w) => w.toLowerCase() === entry.slug)) errors.push('SYNSET_UNVERIFIED: headword is not a lemma of the verified source synset');
    return errors;
}

// Full preflight of ONE entry against the CURRENT page. Never writes.
// options.oewn: verified OEWN lookup ({ get(id) }). Required before anything may be written.
function preflightEntry(entry, ctx, io, options = {}) {
    const errors = [];
    const fail = (m) => errors.push(entry.slug + ': ' + m);
    const result = { slug: entry.slug, errors, lock: null, beforeRaw: null, afterRaw: null, visible_mutations: 0, json_ld_mutations: 0, unrelated_byte_changes: 0 };
    if (!ctx.registry.has(entry.slug)) fail('NOT_APPROVED: slug is not in the approved registry');
    if (ctx.frozen.has(entry.slug) || entry.frozen !== false) fail('FROZEN_REJECTED: frozen experiment pages can never be applied');
    if (!entry.page || entry.page.path !== 'word/' + entry.slug + '.html') fail('page path does not match slug');
    if (!entry.page || !/^[0-9a-f]{64}$/.test(entry.page.sha256_lf_before || '') || !/^[0-9a-f]{64}$/.test(entry.page.sha256_lf_after_expected || '')) { fail('BEFORE/AFTER hash lock is missing or malformed'); return result; }
    let html;
    try { html = io.read(entry.slug); } catch (error) { fail('page cannot be read: ' + error.message); return result; }
    result.beforeRaw = html;
    if (pageHash(html) !== entry.page.sha256_lf_before) { fail('BEFORE_HASH_MISMATCH: current page hash is not the audited BEFORE hash (changed, or already cleaned)'); return result; }
    for (const e of validateEntry(entry, { ...ctx, readPage: io.read }, { applicable: true })) errors.push(e);
    if (options.oewn) for (const e of verifySynsetAgainstSource(entry, options.oewn)) fail(e);
    if (errors.length) return result;
    const derived = deriveLock(entry, html);
    if (derived.errors.length) { derived.errors.forEach((e) => fail('MUTATION_LOCATION: ' + e)); return result; }
    result.lock = derived.lock;
    const plan = planPageCleanup(html, entry);
    if (plan.errors.length) { plan.errors.forEach((e) => fail('MUTATION_LOCATION: ' + e)); return result; }
    result.afterRaw = plan.html;
    if (pageHash(plan.html) !== entry.page.sha256_lf_after_expected) fail('AFTER_HASH_MISMATCH: the mechanical result does not equal the expected AFTER hash');
    const proof = verifyAfterState(html, plan.html, entry);
    proof.errors.forEach((e) => fail(e));
    result.visible_mutations = proof.visible_mutations;
    result.json_ld_mutations = proof.json_ld_mutations;
    result.unrelated_byte_changes = proof.unrelated_byte_changes;
    result.changed_lines = proof.changed_lines;
    if (proof.visible_mutations !== 1 || proof.json_ld_mutations !== 1) fail('MUTATION_COUNT: expected exactly one visible and one JSON-LD mutation');
    return result;
}

// All-or-nothing preflight of the whole manifest. Returns ok=false (with every error) if ANY page fails.
// options.requestedSlugs: when given, must be exactly the set of applicable entries (no partial batches, no extras).
function preflightAll(manifest, ctx, io, options = {}) {
    const errors = [];
    if (manifest.status === 'APPLIED') errors.push('ALREADY_APPLIED: manifest status is APPLIED (expected PROPOSED_NOT_APPLIED); a second application is prohibited');
    else if (manifest.status !== 'PROPOSED_NOT_APPLIED') errors.push('manifest status is "' + manifest.status + '" (expected PROPOSED_NOT_APPLIED)');
    errors.push(...validateManifest(manifest, { ...ctx, readPage: io.read }));
    if (io.listStale && io.listStale().length) errors.push('stale staging files present: ' + io.listStale().join(', '));
    const applicable = new Set(manifest.entries.map((e) => e.slug));
    if (options.requestedSlugs) {
        for (const slug of options.requestedSlugs) {
            if (ctx.frozen.has(slug)) errors.push(slug + ': FROZEN_REJECTED: frozen pages cannot be included in an apply batch');
            else if (!ctx.registry.has(slug)) errors.push(slug + ': NOT_APPROVED: not in the approved registry');
            else if (!applicable.has(slug)) errors.push(slug + ': NOT_IN_MANIFEST: not an applicable cleanup entry');
        }
        const requested = new Set(options.requestedSlugs);
        for (const slug of applicable) if (!requested.has(slug)) errors.push(slug + ': PARTIAL_BATCH_REFUSED: applicable entry missing from the requested batch');
    }
    if (options.expectedApplicable !== undefined && manifest.entries.length !== options.expectedApplicable) errors.push('applicable entries = ' + manifest.entries.length + ' (expected ' + options.expectedApplicable + ')');
    const plan = [];
    for (const entry of manifest.entries) {
        const r = preflightEntry(entry, ctx, io, options);
        errors.push(...r.errors);
        plan.push(r);
    }
    const sum = (key) => plan.reduce((total, p) => total + (p[key] || 0), 0);
    const clean = errors.length === 0;
    return {
        ok: clean,
        synsets_verified: Boolean(options.oewn),
        errors: [...new Set(errors)],
        plan: clean ? plan : [],
        locks: plan.map((p) => p.lock).filter(Boolean),
        counts: {
            applicable: manifest.entries.length,
            would_change: plan.filter((p) => p.afterRaw && p.afterRaw !== p.beforeRaw).length,
            visible_definition_mutations: sum('visible_mutations'),
            json_ld_mutations: sum('json_ld_mutations'),
            unrelated_byte_changes: sum('unrelated_byte_changes'),
            before_hash_locked: manifest.entries.filter((e) => /^[0-9a-f]{64}$/.test(e.page.sha256_lf_before)).length,
            after_hash_locked: manifest.entries.filter((e) => /^[0-9a-f]{64}$/.test(e.page.sha256_lf_after_expected || '')).length
        }
    };
}

// Staged, verified, rollback-capable write of a successful preflight result.
// io: { read, stage, readStaged, commit, discard, restore }. Returns { ok, written, failed, rolled_back, unrestored, errors }.
function applyPreflighted(preflight, io) {
    const outcome = { ok: false, written: [], failed: [], rolled_back: [], unrestored: [], errors: [] };
    if (!preflight.ok || !preflight.plan.length) { outcome.errors.push('refusing to write: preflight did not pass'); return outcome; }
    if (!preflight.synsets_verified) { outcome.errors.push('refusing to write: source synsets were not verified against the OEWN source'); return outcome; }
    const plan = preflight.plan;
    const staged = [];
    const cleanupStaging = () => { for (const p of plan) { try { io.discard(p.slug); } catch { /* best effort; reported by the stale-file check */ } } };
    try {
        // B + C: construct and validate every staged output before touching any real page
        for (const p of plan) { io.stage(p.slug, p.afterRaw); staged.push(p.slug); }
        for (const p of plan) {
            const text = io.readStaged(p.slug);
            if (text !== p.afterRaw || pageHash(text) !== p.lock.expected_after_sha256_lf) outcome.errors.push(p.slug + ': staged output does not equal the expected AFTER page');
        }
        if (outcome.errors.length) { cleanupStaging(); outcome.failed = plan.map((p) => p.slug); return outcome; }
    } catch (error) {
        outcome.errors.push('staging failed before any page was written: ' + error.message);
        cleanupStaging();
        return outcome;
    }
    // D: commit (atomic rename per file)
    const committed = [];
    let writeError = null;
    for (const p of plan) {
        try { io.commit(p.slug); committed.push(p.slug); } catch (error) { writeError = p.slug + ': commit failed: ' + error.message; break; }
    }
    // E: immediate verification of every written page
    const mismatched = [];
    if (!writeError) {
        for (const p of plan) {
            let now = null;
            try { now = io.read(p.slug); } catch (error) { now = null; }
            if (now !== p.afterRaw || pageHash(now || '') !== p.lock.expected_after_sha256_lf) mismatched.push(p.slug);
        }
    }
    if (!writeError && !mismatched.length) {
        cleanupStaging();
        outcome.ok = true;
        outcome.written = plan.map((p) => p.slug);
        return outcome;
    }
    // failure: restore every page that may have been touched, then verify the restore
    if (writeError) outcome.errors.push(writeError);
    if (mismatched.length) outcome.errors.push('post-write verification failed for: ' + mismatched.join(', '));
    outcome.failed = writeError ? [writeError.split(':')[0]] : mismatched;
    const touched = new Set([...committed, ...mismatched]);
    for (const p of plan) {
        if (!touched.has(p.slug)) continue;
        try {
            io.restore(p.slug, p.beforeRaw);
            if (io.read(p.slug) === p.beforeRaw) outcome.rolled_back.push(p.slug); else outcome.unrestored.push(p.slug);
        } catch (error) { outcome.unrestored.push(p.slug); }
    }
    cleanupStaging();
    if (outcome.unrestored.length) outcome.errors.push('ROLLBACK INCOMPLETE; restore from git: ' + outcome.unrestored.join(', '));
    return outcome;
}

// Filesystem-backed IO for the word directory. Pages are read/written as UTF-8 text with line endings untouched.
// options.v1View: true makes read() return the V1 page of a word whose live page has been replaced by a V2 production
// page (SEO-R6E); the guarded apply engine itself never sets it.
function makeFsIo(wordDir, options = {}) {
    const target = (slug) => path.join(wordDir, slug + '.html');
    const staging = (slug) => target(slug) + STAGING_SUFFIX;
    return {
        read(slug) {
            if (options.v1View) {
                const live = fs.readFileSync(target(slug), 'utf8');
                if (lib.isV2ProductionPage(live)) return lib.readV1Page(slug, path.dirname(wordDir));
            }
            const buffer = fs.readFileSync(target(slug));
            const text = buffer.toString('utf8');
            if (!Buffer.from(text, 'utf8').equals(buffer)) throw new Error('page is not round-trippable UTF-8');
            return text;
        },
        stage(slug, text) { fs.writeFileSync(staging(slug), text, { encoding: 'utf8', flag: 'wx' }); },
        readStaged(slug) { return fs.readFileSync(staging(slug), 'utf8'); },
        commit(slug) { fs.renameSync(staging(slug), target(slug)); },
        discard(slug) { fs.rmSync(staging(slug), { force: true }); },
        restore(slug, text) { fs.writeFileSync(target(slug), text, 'utf8'); },
        listStale() { return fs.readdirSync(wordDir).filter((f) => f.endsWith(STAGING_SUFFIX)); }
    };
}

// Read-only snapshot used to prove a command did not change any page.
function snapshotPages(io, slugs) {
    const out = new Map();
    for (const slug of slugs) out.set(slug, pageHash(io.read(slug)));
    return out;
}

// Dry-run: preflight everything, simulate the result, report. Writes nothing.
function guardedDryRun(manifest, ctx, io, options = {}) {
    const root = ctx.root || lib.ROOT;
    const before = snapshotPages(io, [...ctx.registry]);
    const preflight = preflightAll(manifest, ctx, io, options);
    const simulatedParity = [];
    if (preflight.ok) {
        const cohortFile = path.join(root, 'dictionary-v2', 'prototype-cohort.json');
        const cohort = fs.existsSync(cohortFile) ? lib.readJson(cohortFile).words : [];
        const { checkParity } = require('./check-v1-parity');
        const byslug = new Map(preflight.plan.map((p) => [p.slug, p]));
        for (const slug of cohort) {
            const p = byslug.get(slug);
            if (!p) continue;
            const entry = manifest.entries.find((e) => e.slug === slug);
            const record = lib.readJson(path.join(root, 'dictionary-v2', 'records', slug + '.json'));
            const result = checkParity(record, p.afterRaw, entry);
            simulatedParity.push({ slug, status_now: checkParity(record, p.beforeRaw, entry).status, status_after_apply: result.status, differences: result.differences });
        }
    }
    const afterSnapshot = snapshotPages(io, [...ctx.registry]);
    const changedByRun = [...before].filter(([slug, hash]) => afterSnapshot.get(slug) !== hash).map(([slug]) => slug);
    const s = manifest.summary;
    return {
        ok: preflight.ok,
        synsets_verified: preflight.synsets_verified,
        errors: preflight.errors,
        summary: {
            approved_corpus: s.approved_corpus,
            total_contamination: s.raw_oewn_example_contamination + s.citation_residue,
            applicable_cleanup: manifest.entries.length,
            frozen_excluded: s.frozen_excluded,
            manual_review: s.manual_review,
            files_that_would_change: preflight.counts.would_change,
            actual_word_html_changed: changedByRun.length,
            visible_definition_mutations: preflight.counts.visible_definition_mutations,
            json_ld_mutations: preflight.counts.json_ld_mutations,
            unrelated_byte_changes: preflight.counts.unrelated_byte_changes,
            before_hash_locked: preflight.counts.before_hash_locked,
            after_hash_locked: preflight.counts.after_hash_locked
        },
        locks: preflight.locks,
        simulated_parity: simulatedParity
    };
}

// ---------------------------------------------------------------- CLI
function parseArgs(argv) {
    const args = { cmd: (argv[0] || '').replace(/^--/, ''), list: false, write: false };
    for (let i = 1; i < argv.length; i++) {
        if (argv[i] === '--confirm') args.confirm = argv[++i];
        else if (argv[i] === '--archive') args.archive = argv[++i];
        else if (argv[i] === '--oewn-dir') args.dir = argv[++i];
        else if (argv[i] === '--before-commit') args.beforeCommit = argv[++i];
        else if (argv[i] === '--no-git') args.noGit = true;
        else if (argv[i] === '--write') args.write = true;
        else if (argv[i] === '--list') args.list = true;
        else if (argv[i] === '--json') args.json = argv[++i];
        else throw new Error('Unknown argument: ' + argv[i]);
    }
    return args;
}

function printSummary(s) {
    console.log('approved corpus              = ' + s.approved_corpus);
    console.log('clean                        = ' + s.clean);
    console.log('raw-example contamination    = ' + s.raw_oewn_example_contamination);
    console.log('citation residue             = ' + s.citation_residue);
    console.log('unresolved (no safe source)  = ' + s.unresolved_no_safe_source);
    console.log('safe non-frozen cleanup      = ' + s.safe_non_frozen_cleanup + ' (raw ' + s.safe_non_frozen_by_type.raw_oewn_example_contamination + ', residue ' + s.safe_non_frozen_by_type.citation_residue + ')');
    console.log('frozen excluded              = ' + s.frozen_excluded + (s.frozen_excluded_slugs.length ? ' [' + s.frozen_excluded_slugs.join(', ') + ']' : ''));
    console.log('manual review                = ' + s.manual_review);
}

function loadVerifiedOewn(args, ctx) {
    const source = lib.openOewnSource({ archive: args.archive, dir: args.dir });
    const sourceErrors = lib.verifyOewnSource(source, ctx.provenance);
    if (sourceErrors.length) throw new Error('OEWN source verification FAILED:\n' + sourceErrors.join('\n'));
    return lib.oewnFromSynsets(lib.parseOewnData(source.getFile));
}

function freshManifest(args, ctx, oewn = loadVerifiedOewn(args, ctx)) {
    return buildManifest({ registry: ctx.registry, readPage: ctx.readPage, oewn, frozen: ctx.frozen, provenance: ctx.provenance });
}

function runVerify(manifest, ctx, args) {
    const oewn = args.archive || args.dir ? loadVerifiedOewn(args, ctx) : null;
    const result = verifyApplied(manifest, ctx, { oewn: oewn || undefined, gitRead: args.noGit ? undefined : gitReader(ctx.root) });
    if (!result.ok) { console.error('APPLIED-STATE VERIFICATION FAILED (' + result.errors.length + ')'); result.errors.slice(0, 50).forEach((e) => console.error('  - ' + e)); process.exit(1); }
    const c = result.counts;
    console.log('--- applied-state verification');
    console.log('approved corpus: ' + c.approved_corpus);
    console.log('applied non-frozen cleanup: ' + c.applied_non_frozen_cleanup);
    console.log('frozen excluded (not applied): ' + c.frozen_excluded + ' | frozen pages unchanged: ' + c.frozen_unchanged);
    console.log('manual review: ' + c.manual_review);
    console.log('clean pages unchanged (fingerprint): ' + c.clean_unchanged);
    console.log('AFTER hash matches: ' + c.after_hash_matches + '/' + c.applied_non_frozen_cleanup);
    console.log('visible-definition changes: ' + c.visible_definition_changes + ' | JSON-LD changes: ' + c.json_ld_changes + ' | BEFORE reconstructed by reverse proof: ' + c.reverse_proofs);
    console.log(c.git_proof ? 'git proof vs ' + manifest.applied.before_state_commit.slice(0, 10) + ': ' + c.git_pages_proven + ' pages byte-range/structure proven, unrelated bytes = ' + c.git_unrelated_changed_lines : 'git proof: skipped (--no-git)');
    console.log('source synsets verified against the OEWN archive: ' + (oewn ? 'yes' : 'no (add --archive)'));
    console.log('second application: PROHIBITED (manifest status APPLIED)');
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const ctx = makeContext();
    if (args.cmd === 'mark-applied') {
        // One-time PROPOSED -> APPLIED transition, only after the pages are verified at their AFTER state.
        if (!/^[0-9a-f]{40}$/.test(args.beforeCommit || '')) throw new Error('mark-applied requires --before-commit <full 40-hex SHA of the pre-application commit>');
        if (!args.archive && !args.dir) throw new Error('mark-applied requires --archive <zip>');
        const candidate = markApplied(loadManifest(), args.beforeCommit);
        const result = verifyApplied(candidate, ctx, { oewn: loadVerifiedOewn(args, ctx), gitRead: gitReader(ctx.root) });
        if (!result.ok) { console.error('Refusing to mark APPLIED (' + result.errors.length + ')'); result.errors.slice(0, 50).forEach((e) => console.error('  - ' + e)); process.exit(1); }
        fs.writeFileSync(MANIFEST_PATH, lib.canonicalJson(candidate), 'utf8');
        console.log('Manifest marked APPLIED (' + candidate.entries.length + ' pages applied, ' + candidate.frozen_documented.length + ' frozen NOT applied).');
        return;
    }
    if (args.cmd === 'audit' && fs.existsSync(MANIFEST_PATH) && loadManifest().status === 'APPLIED') {
        // Pages are no longer in the BEFORE state, so the audit cannot be regenerated from them; verify the applied state instead.
        if (args.write) throw new Error('refusing to regenerate an APPLIED manifest (the BEFORE evidence must be preserved)');
        if (!args.archive && !args.dir) throw new Error('audit requires --archive <zip> or --oewn-dir <dir>');
        runVerify(loadManifest(), ctx, args);
        return;
    }
    if (args.cmd === 'audit') {
        if (!args.archive && !args.dir) throw new Error('audit requires --archive <zip> or --oewn-dir <dir>');
        const manifest = freshManifest(args, ctx);
        const text = lib.canonicalJson(manifest);
        printSummary(manifest.summary);
        if (args.write) { fs.writeFileSync(MANIFEST_PATH, text, 'utf8'); console.log('Wrote ' + MANIFEST_REF); }
        else {
            const existing = fs.existsSync(MANIFEST_PATH) ? lib.toLf(fs.readFileSync(MANIFEST_PATH, 'utf8')) : null;
            if (existing !== text) { console.error('Committed manifest differs from the independent re-audit.'); process.exit(1); }
            console.log('Committed manifest equals the independent re-audit (byte-for-byte).');
        }
        return;
    }
    const manifest = loadManifest();
    const errors = validateManifest(manifest, ctx);
    if (args.cmd === 'validate') {
        if (errors.length) { console.error('CLEANUP MANIFEST INVALID (' + errors.length + ')'); errors.slice(0, 50).forEach((e) => console.error('  - ' + e)); process.exit(1); }
        console.log('CLEANUP MANIFEST VALID: ' + manifest.entries.length + ' safe entries, ' + manifest.frozen_documented.length + ' frozen documented, ' + manifest.manual_review.length + ' manual review.');
        return;
    }
    if (args.cmd === 'verify') {
        if (errors.length) { console.error('APPLIED-STATE VERIFICATION FAILED (' + errors.length + ')'); errors.slice(0, 50).forEach((e) => console.error('  - ' + e)); process.exit(1); }
        runVerify(manifest, ctx, args);
        return;
    }
    if (args.cmd === 'dry-run') {
        if (errors.length) { console.error('Refusing dry-run: manifest invalid (' + errors.length + ')'); errors.slice(0, 50).forEach((e) => console.error('  - ' + e)); process.exit(1); }
        if (manifest.status === 'APPLIED') {
            console.log('Manifest is APPLIED: nothing left to apply (files that WOULD change: 0). Verifying the applied state instead.');
            runVerify(manifest, ctx, args);
            return;
        }
        let verifiedOewn = null;
        if (args.archive || args.dir) {
            verifiedOewn = loadVerifiedOewn(args, ctx);
            const fresh = lib.canonicalJson(freshManifest(args, ctx, verifiedOewn));
            if (fresh !== lib.canonicalJson(manifest)) { console.error('Independent re-audit from the verified OEWN source differs from the manifest.'); process.exit(1); }
            console.log('Independent re-audit from the verified OEWN source: IDENTICAL to the manifest.');
        } else console.log('(offline: manifest verified against current pages; add --archive for the independent re-audit)');
        const report = dryRun(manifest, ctx);
        if (args.list) {
            for (const r of report.rows) {
                const clip = (t) => (t === null ? '-' : t.length > 70 ? t.slice(0, 67) + '...' : t);
                console.log([r.action, r.slug, r.frozen ? 'FROZEN' : 'non-frozen', r.source_synset || '-', r.reason.slice(0, 44), 'OLD: ' + clip(r.old_definition), 'NEW: ' + clip(r.new_definition)].join(' | '));
            }
        }
        printSummary(report.summary);
        const guarded = guardedDryRun(manifest, ctx, makeFsIo(path.join(ctx.root, 'word'), { v1View: true }), { oewn: verifiedOewn || undefined });
        console.log('source synsets verified against the OEWN archive: ' + (verifiedOewn ? 'yes' : 'no (offline; apply would require it)'));
        if (!guarded.ok) { console.error('GUARDED PREFLIGHT FAILED (' + guarded.errors.length + ')'); guarded.errors.slice(0, 50).forEach((e) => console.error('  - ' + e)); process.exit(1); }
        printGuardedSummary(guarded);
        if (args.json) fs.writeFileSync(args.json, lib.canonicalJson({ ...report, guarded }), 'utf8');
        console.log('DRY RUN ONLY: no page was modified.');
        return;
    }
    if (args.cmd === 'apply') {
        // The real mutation entry point. Everything is verified before the first byte is written.
        if (manifest.status !== 'PROPOSED_NOT_APPLIED') throw new Error('ALREADY_APPLIED: manifest status is "' + manifest.status + '"; a second application is prohibited and nothing was written');
        if (args.confirm !== APPLY_CONFIRMATION) throw new Error('apply requires --confirm ' + APPLY_CONFIRMATION);
        if (!args.archive && !args.dir) throw new Error('apply requires --archive <zip> (or --oewn-dir) for the independent re-audit');
        if (errors.length) { console.error('Refusing apply: manifest invalid (' + errors.length + ')'); errors.slice(0, 50).forEach((e) => console.error('  - ' + e)); process.exit(1); }
        const verifiedOewn = loadVerifiedOewn(args, ctx);
        if (lib.canonicalJson(freshManifest(args, ctx, verifiedOewn)) !== lib.canonicalJson(manifest)) throw new Error('Independent re-audit from the verified OEWN source differs from the manifest.');
        const io = makeFsIo(path.join(ctx.root, 'word'));
        const preflight = preflightAll(manifest, ctx, io, { expectedApplicable: manifest.summary.safe_non_frozen_cleanup, oewn: verifiedOewn });
        if (!preflight.ok) { console.error('PREFLIGHT FAILED: no page was written (' + preflight.errors.length + ' errors)'); preflight.errors.slice(0, 50).forEach((e) => console.error('  - ' + e)); process.exit(1); }
        const outcome = applyPreflighted(preflight, io);
        if (!outcome.ok) { console.error('APPLY FAILED'); outcome.errors.forEach((e) => console.error('  - ' + e)); console.error('failed: ' + outcome.failed.join(', ') + ' | rolled back: ' + outcome.rolled_back.length + ' | unrestored: ' + outcome.unrestored.join(', ')); process.exit(1); }
        console.log('APPLIED and verified: ' + outcome.written.length + ' pages.');
        return;
    }
    throw new Error('Unknown subcommand "' + args.cmd + '" (use audit | validate | verify | dry-run | apply | mark-applied)');
}

function printGuardedSummary(g) {
    const s = g.summary;
    console.log('--- guarded dry-run');
    console.log('approved corpus: ' + s.approved_corpus);
    console.log('total contamination: ' + s.total_contamination);
    console.log('applicable cleanup: ' + s.applicable_cleanup);
    console.log('frozen excluded: ' + s.frozen_excluded);
    console.log('manual review: ' + s.manual_review);
    console.log('files that WOULD change: ' + s.files_that_would_change);
    console.log('actual word/*.html changed: ' + s.actual_word_html_changed);
    console.log('BEFORE-hash locks: ' + s.before_hash_locked + ' | AFTER-hash locks: ' + s.after_hash_locked);
    console.log('expected visible-definition mutations: ' + s.visible_definition_mutations);
    console.log('expected JSON-LD mutations: ' + s.json_ld_mutations);
    console.log('unrelated byte changes: ' + s.unrelated_byte_changes);
    for (const p of g.simulated_parity) console.log('simulated parity ' + p.slug.padEnd(10) + p.status_now + ' -> ' + p.status_after_apply);
}

module.exports = {
    TYPES, MANIFEST_PATH, MANIFEST_REF, escapeHtml, classifyAgainstSynset, contaminationFor, synsetFromEntry,
    learnerFieldsHash, planPageCleanup, verifyCleanupDiff, auditPage, buildEntry, buildManifest, fingerprint,
    validateEntry, validateManifest, applyEntryToRecord, loadManifest, makeContext, dryRun,
    // SEO-R6B.1 guarded apply engine
    APPLY_CONFIRMATION, STAGING_SUFFIX, locateEdit, differingBytes, structureOf, compareStructure, verifyAfterState,
    DESCRIPTION_PROPOSED, DESCRIPTION_APPLIED, APPLICATION_STATE, validateApplicationState, markApplied, asProposed,
    reverseCleanup, gitReader, verifyApplied,
    deriveLock, verifySynsetAgainstSource, preflightEntry, preflightAll, applyPreflighted, makeFsIo, snapshotPages, guardedDryRun, pageHash
};
if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED (fail closed): ' + error.message); process.exit(1); }
}
