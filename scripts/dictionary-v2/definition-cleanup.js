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
function planPageCleanup(html, entry) {
    const errors = [];
    const before = entry.before_definition;
    const after = entry.after_definition;
    const blocks = [...html.matchAll(/(<p class="definition"[^>]*>[\s\S]*?<span[^>]*>)([\s\S]*?)(<\/span>)/g)];
    if (blocks.length !== 1) { errors.push('expected exactly one .definition block, found ' + blocks.length); return { html: null, errors }; }
    // Two escaping styles exist in the corpus: quotes as &quot; (entity) or literal quotes. Both are valid HTML;
    // the page's own style is preserved so the edit stays minimal.
    const styles = [escapeHtml, escapeText];
    const escape = styles.find((fn) => blocks[0][2] === fn(before));
    if (!escape) errors.push('.definition span is not exactly the BEFORE definition in a known escaping style');
    const ldBefore = '"description": ' + JSON.stringify(before);
    const ldAfter = '"description": ' + JSON.stringify(after);
    if (countOccurrences(html, ldBefore) !== 1) errors.push('JSON-LD description literal found ' + countOccurrences(html, ldBefore) + ' times (expected exactly 1)');
    if (errors.length) return { html: null, errors };
    const start = blocks[0].index + blocks[0][1].length;
    const end = start + blocks[0][2].length;
    let next = html.slice(0, start) + escape(after) + html.slice(end);
    next = next.replace(ldBefore, () => ldAfter);
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
        description: 'Proof of the V1 definition cleanup: BEFORE (live page) -> OEWN source definition -> AFTER (exactly the OEWN definition). Nothing in this file has been applied to word/*.html.',
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
function validateEntry(entry, ctx, { applicable }) {
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
        if (hash === entry.page.sha256_lf_before) {
            if (applicable) {
                const plan = planPageCleanup(html, entry);
                if (plan.errors.length) fail('edit not provable: ' + plan.errors.join('; '));
                else {
                    if (lib.sha256Lf(Buffer.from(plan.html, 'utf8')) !== entry.page.sha256_lf_after_expected) fail('expected AFTER page hash mismatch');
                    for (const e of verifyCleanupDiff(html, plan.html, entry)) fail('diff: ' + e);
                }
            }
        } else if (applicable && hash === entry.page.sha256_lf_after_expected) {
            if (page.definition !== entry.after_definition) fail('page already at AFTER hash but definition differs');
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
    for (const e of manifest.entries) errors.push(...validateEntry(e, ctx, { applicable: true }));
    for (const e of manifest.frozen_documented) errors.push(...validateEntry(e, ctx, { applicable: false }));
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
        readPage: (slug) => fs.readFileSync(path.join(root, 'word', slug + '.html'), 'utf8'),
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

// ---------------------------------------------------------------- CLI
function parseArgs(argv) {
    const args = { cmd: argv[0], list: false, write: false };
    for (let i = 1; i < argv.length; i++) {
        if (argv[i] === '--archive') args.archive = argv[++i];
        else if (argv[i] === '--oewn-dir') args.dir = argv[++i];
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

function freshManifest(args, ctx) {
    const source = lib.openOewnSource({ archive: args.archive, dir: args.dir });
    const sourceErrors = lib.verifyOewnSource(source, ctx.provenance);
    if (sourceErrors.length) throw new Error('OEWN source verification FAILED:\n' + sourceErrors.join('\n'));
    const oewn = lib.oewnFromSynsets(lib.parseOewnData(source.getFile));
    return buildManifest({ registry: ctx.registry, readPage: ctx.readPage, oewn, frozen: ctx.frozen, provenance: ctx.provenance });
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const ctx = makeContext();
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
    if (args.cmd === 'dry-run') {
        if (errors.length) { console.error('Refusing dry-run: manifest invalid (' + errors.length + ')'); errors.slice(0, 50).forEach((e) => console.error('  - ' + e)); process.exit(1); }
        if (args.archive || args.dir) {
            const fresh = lib.canonicalJson(freshManifest(args, ctx));
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
        if (args.json) fs.writeFileSync(args.json, lib.canonicalJson(report), 'utf8');
        console.log('DRY RUN ONLY: no page was modified.');
        return;
    }
    throw new Error('Unknown subcommand "' + args.cmd + '" (use audit | validate | dry-run)');
}

module.exports = {
    TYPES, MANIFEST_PATH, MANIFEST_REF, escapeHtml, classifyAgainstSynset, contaminationFor, synsetFromEntry,
    learnerFieldsHash, planPageCleanup, verifyCleanupDiff, auditPage, buildEntry, buildManifest, fingerprint,
    validateEntry, validateManifest, applyEntryToRecord, loadManifest, makeContext, dryRun
};
if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED (fail closed): ' + error.message); process.exit(1); }
}
