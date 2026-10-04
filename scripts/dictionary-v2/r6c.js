'use strict';
// SEO-R6C: editorial audit report, validation and scope guard for the 12-word editorial enrichment.
//
// Usage:
//   node scripts/dictionary-v2/r6c.js report   --archive <zip> [--check]   build (or byte-check) dictionary-v2/r6c-editorial-report.json
//   node scripts/dictionary-v2/r6c.js validate [--archive <zip>]           validate source, report, records, OEWN alignment and V1 traceability
//   node scripts/dictionary-v2/r6c.js guard [--base <sha>]                 prove that only R6C files changed since the base commit
//
// Records themselves are produced by scripts/dictionary-v2/migrate-v1.js (migration + r6c-enrich.js); this tool never
// writes a record and never writes anywhere outside dictionary-v2/r6c-editorial-report.json.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('./lib');
const r6c = require('./r6c-enrich');
const { loadOewn, candidatesFor } = require('./r6c-candidates');
const { loadContext, validateRecord } = require('./validate');
const { checkParity } = require('./check-v1-parity');

const REPORT_PATH = r6c.REPORT_FILE;
const BASE_COMMIT = '380176337a63a9b40fc5e91c31143a62b36845d0';
const RISKS = ['LOW', 'MEDIUM', 'HIGH'];
const BENGALI = /[\u0980-\u09FF]/;
const norm = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const posOf = (id) => lib.POS_BY_SUFFIX[id.slice(-1)];

// ------------------------------------------------------------------ report
function readRecord(root, slug) { return lib.readJson(path.join(root, 'dictionary-v2', 'records', slug + '.json')); }

function buildReport({ root = lib.ROOT, source, oewn, provenance }) {
    const words = source.words.map((word) => {
        const record = readRecord(root, word.slug);
        const candidates = candidatesFor(oewn, word.slug);
        const candidateIds = candidates.map((c) => c.synset_id);
        const selectedIds = word.selected.map((s) => s.synset_id);
        const rejectedIds = word.rejected.map((r) => r.synset_id);
        const partition = [...selectedIds, ...rejectedIds].sort();
        if (JSON.stringify(partition) !== JSON.stringify([...candidateIds].sort())) {
            const missing = candidateIds.filter((id) => !partition.includes(id));
            const extra = partition.filter((id) => !candidateIds.includes(id));
            throw new Error(word.slug + ': selected+rejected must partition the OEWN candidates exactly (not decided: ' + (missing.join(', ') || 'none') + '; not a candidate or duplicated: ' + (extra.join(', ') || 'none') + ')');
        }
        const v1Sense = record.senses.find((s) => s.v1_primary === true);
        const senseIdBySynset = new Map(record.senses.map((s) => [s.source.synset_id, s.sense_id]));
        const decision = new Map([...selectedIds.map((id) => [id, 'SELECTED']), ...rejectedIds.map((id) => [id, 'REJECTED'])]);
        const enriched = r6c.isEnriched(word);
        const entry = {
            lemma: word.slug,
            record_file: 'dictionary-v2/records/' + word.slug + '.json',
            record_outcome: enriched ? 'ENRICHED' : 'UNCHANGED_V1_RETAINED',
            candidates_inspected: candidates.length,
            candidates: candidates.map((c) => ({ ...c, decision: decision.get(c.synset_id) })),
            v1_source: { synset_id: v1Sense.source.synset_id, pos: v1Sense.pos, v1_position: 1, sense_id_in_record: v1Sense.sense_id },
            selected: word.selected.map((s) => ({
                sense_id: senseIdBySynset.get(s.synset_id),
                synset_id: s.synset_id,
                pos: posOf(s.synset_id),
                v1_source: s.v1 === true,
                reason: s.reason
            })),
            rejected: word.rejected.map((r) => ({ synset_id: r.synset_id, pos: posOf(r.synset_id), reason: r.reason })),
            final_sense_order: word.selected.map((s) => senseIdBySynset.get(s.synset_id) + ' ' + s.synset_id),
            selected_count: word.selected.length,
            v1_learner_gap: word.v1_gap,
            order_changed: word.selected[0].v1 !== true,
            order_rationale: word.order_rationale,
            editorial_risk: word.editorial_risk
        };
        for (const key of ['risk_note', 'more_than_three_justification', 'pos_notes']) if (word[key]) entry[key] = word[key];
        const revision = word.selected.find((s) => s.v1).v1_revision;
        if (revision) entry.v1_sense_revision = { fields_revised: Object.keys(revision.learner).sort(), reason: revision.reason };
        return entry;
    });
    return {
        report: 'ovidhan.dictionary-v2.r6c-editorial-report/1',
        phase: r6c.PHASE,
        cohort_id: r6c.COHORT_ID,
        base_commit: BASE_COMMIT,
        source_file: r6c.SOURCE_FILE,
        oewn: {
            provider: 'Open English WordNet',
            release: '2025',
            archive_sha256: provenance.source.archive_sha256.toLowerCase(),
            provenance_file: 'dictionary-v2/oewn-2025-provenance.json',
            license: 'CC BY 4.0',
            license_url: 'https://creativecommons.org/licenses/by/4.0/',
            source_url: 'https://en-word.net/'
        },
        method: 'For every cohort lemma the full OEWN 2025 candidate set (all parts of speech) was read from the verified archive. Each candidate is either SELECTED (a learner sense for a Bangladeshi English learner) or REJECTED with a reason. Definitions are the exact OEWN definitions; OEWN examples are listed as evidence only and are never reused. Bangla meanings, explanations and English/Bangla examples are Ovidhan editorial text (origin OVIDHAN_EDITORIAL).',
        totals: totalsOf(words),
        words
    };
}

function totalsOf(words) {
    const count = (fn) => words.filter(fn).length;
    const byPos = {};
    for (const w of words) for (const s of w.selected) byPos[s.pos] = (byPos[s.pos] || 0) + 1;
    return {
        words: words.length,
        candidates_inspected: words.reduce((n, w) => n + w.candidates_inspected, 0),
        selected_senses: words.reduce((n, w) => n + w.selected_count, 0),
        rejected_candidates: words.reduce((n, w) => n + w.rejected.length, 0),
        v1_senses_retained: words.length,
        new_senses_added: words.reduce((n, w) => n + w.selected.filter((s) => !s.v1_source).length, 0),
        words_enriched: count((w) => w.record_outcome === 'ENRICHED'),
        words_unchanged: count((w) => w.record_outcome === 'UNCHANGED_V1_RETAINED'),
        words_with_meaningful_v1_gap: count((w) => w.v1_learner_gap.meaningful),
        words_with_order_change: count((w) => w.order_changed),
        words_with_more_than_three_senses: count((w) => w.selected_count > 3),
        editorial_risk: { LOW: count((w) => w.editorial_risk === 'LOW'), MEDIUM: count((w) => w.editorial_risk === 'MEDIUM'), HIGH: count((w) => w.editorial_risk === 'HIGH') },
        selected_senses_by_pos: Object.fromEntries(Object.entries(byPos).sort())
    };
}

// ------------------------------------------------------------------ validation
// ctx: validate.js loadContext(); returns a list of error strings (empty = valid).
function loadRecords(v2) {
    return new Map(fs.readdirSync(path.join(v2, 'records')).sort().map((file) => [file.replace(/\.json$/, ''), lib.readJson(path.join(v2, 'records', file))]));
}

// records (optional) lets tests inject tampered records; by default the committed records are read.
function validateEditorial({ root = lib.ROOT, ctx = loadContext({ root }), source = r6c.loadSource(root), report = null, oewn = null, records = loadRecords(ctx.v2) } = {}) {
    const errors = [];
    const fail = (msg) => errors.push(msg);
    report = report || lib.readJson(path.join(root, REPORT_PATH));

    // 1. exact cohort
    const cohort = [...r6c.COHORT];
    if (cohort.length !== 12 || new Set(cohort).size !== 12) fail('R6C cohort constant must list exactly 12 distinct words');
    const sourceWords = source.words.map((w) => w.slug);
    if (JSON.stringify(sourceWords) !== JSON.stringify(cohort)) fail('editorial source words differ from the R6C cohort (expected ' + cohort.join(', ') + ')');
    const reportWords = report.words.map((w) => w.lemma);
    if (JSON.stringify(reportWords) !== JSON.stringify(cohort)) fail('editorial report words differ from the R6C cohort');
    if (report.phase !== r6c.PHASE || report.cohort_id !== r6c.COHORT_ID || source.cohort_id !== r6c.COHORT_ID) fail('phase/cohort id mismatch between source and report');

    // 2. report-level provenance
    if (report.oewn.archive_sha256 !== ctx.provenance.source.archive_sha256.toLowerCase() || report.oewn.release !== '2025') fail('report.oewn does not match the OEWN 2025 provenance');
    if (report.oewn.license !== 'CC BY 4.0' || !report.oewn.provider) fail('report.oewn license/provider missing or wrong');
    if (lib.canonicalJson(report.totals) !== lib.canonicalJson(totalsOf(report.words))) fail('report totals do not equal the totals recomputed from the words');

    const cleanupEntries = new Map(ctx.cleanupManifest ? ctx.cleanupManifest.entries.map((e) => [e.slug, e]) : []);
    const allExamples = new Map();
    for (const other of records.values()) for (const s of other.senses || []) for (const ex of s.examples || []) if (ex && typeof ex.en === 'string') allExamples.set(norm(ex.en), other.slug + ':' + s.sense_id);

    for (const slug of cohort) {
        const word = source.words.find((w) => w.slug === slug);
        const entry = report.words.find((w) => w.lemma === slug);
        const here = (msg) => fail(slug + ': ' + msg);
        if (!word || !entry) { here('missing from the editorial source or report'); continue; }
        if (!ctx.cohort.words.includes(slug)) here('is not in prototype-cohort.json');
        if (!ctx.registry.has(slug)) here('is not an approved word');
        if (ctx.frozen.has(slug)) here('belongs to a frozen experiment set and must not be modified');
        const record = records.get(slug);
        if (!record) { here('V2 record does not exist'); continue; }
        const recordErrors = validateRecord(record, ctx);
        for (const e of recordErrors) here('record: ' + e);
        // A structurally invalid record (schema errors) cannot be inspected further: fail closed without crashing.
        if (recordErrors.some((e) => e.startsWith('schema:'))) continue;

        // 3. candidates: all inspected, partitioned, reasons present
        const candidateIds = entry.candidates.map((c) => c.synset_id);
        if (new Set(candidateIds).size !== candidateIds.length) here('duplicate candidate in report');
        if (entry.candidates_inspected !== entry.candidates.length) here('candidates_inspected disagrees with the candidate list');
        const selectedIds = entry.selected.map((s) => s.synset_id);
        const rejectedIds = entry.rejected.map((r) => r.synset_id);
        if (new Set(selectedIds).size !== selectedIds.length) here('duplicate synset among the selected senses');
        if (selectedIds.some((id) => rejectedIds.includes(id))) here('a synset is both selected and rejected');
        if (JSON.stringify([...selectedIds, ...rejectedIds].sort()) !== JSON.stringify([...candidateIds].sort())) here('selected + rejected do not equal the inspected candidates');
        for (const c of entry.candidates) {
            const wanted = selectedIds.includes(c.synset_id) ? 'SELECTED' : 'REJECTED';
            if (c.decision !== wanted) here('candidate ' + c.synset_id + ' decision ' + c.decision + ' disagrees with the selected/rejected lists');
            if (!c.words.some((w) => w.toLowerCase() === slug)) here('candidate ' + c.synset_id + ' does not contain the lemma');
            if (c.pos !== posOf(c.synset_id)) here('candidate ' + c.synset_id + ' POS disagrees with its id');
        }
        for (const r of entry.rejected) if (typeof r.reason !== 'string' || r.reason.trim().length < 15) here('rejected candidate ' + r.synset_id + ' has no concise rejection reason');
        for (const s of entry.selected) if (typeof s.reason !== 'string' || s.reason.trim().length < 15) here('selected sense ' + s.synset_id + ' has no selection reason');
        if (entry.selected_count !== entry.selected.length) here('selected_count disagrees with the selected list');
        if (entry.selected_count < 1) here('no selected sense');
        if (entry.selected_count > 3 && !(typeof entry.more_than_three_justification === 'string' && entry.more_than_three_justification.length >= 40)) here('more than three senses requires an explicit more_than_three_justification');
        if (entry.selected_count > 4) here('more than four senses selected');
        if (!RISKS.includes(entry.editorial_risk)) here('editorial_risk must be LOW, MEDIUM or HIGH');
        if (!entry.v1_learner_gap || typeof entry.v1_learner_gap.meaningful !== 'boolean' || typeof entry.v1_learner_gap.description !== 'string' || entry.v1_learner_gap.description.length < 15) here('v1_learner_gap must state whether there is a meaningful gap and describe it');
        if (typeof entry.order_rationale !== 'string' || entry.order_rationale.length < 15) here('order_rationale missing');

        // 4. candidate evidence against OEWN (committed lock offline; the full archive when supplied)
        for (const c of entry.candidates) {
            if (oewn) {
                const live = oewn.get(c.synset_id);
                if (!live) here('candidate ' + c.synset_id + ' does not exist in the verified OEWN archive');
                else if (live.pos !== c.pos || live.definition !== c.definition || live.gloss !== c.gloss || JSON.stringify(live.words) !== JSON.stringify(c.words) || JSON.stringify(live.quoted_examples) !== JSON.stringify(c.quoted_examples)) here('candidate ' + c.synset_id + ' differs from the verified OEWN archive');
            }
            if (c.decision === 'SELECTED') {
                const locked = ctx.lockById.get(c.synset_id);
                if (!locked) here('selected synset ' + c.synset_id + ' is absent from the OEWN lock');
                else if (locked.pos !== c.pos || locked.definition !== c.definition || locked.gloss !== c.gloss || JSON.stringify(locked.words) !== JSON.stringify(c.words) || JSON.stringify(locked.quoted_examples) !== JSON.stringify(c.quoted_examples)) here('selected synset ' + c.synset_id + ' differs from the OEWN lock');
            }
        }
        if (oewn) {
            const fresh = candidatesFor(oewn, slug).map((c) => c.synset_id).sort();
            if (JSON.stringify(fresh) !== JSON.stringify([...candidateIds].sort())) here('the report did not inspect every OEWN candidate synset for the lemma (archive lists ' + fresh.length + ')');
        }

        // 5. record <-> report <-> source agreement
        const recordOrder = record.senses.map((s) => s.source.synset_id);
        if (JSON.stringify(recordOrder) !== JSON.stringify(selectedIds)) here('record sense order ' + recordOrder.join(',') + ' differs from the report selected order ' + selectedIds.join(','));
        if (JSON.stringify(word.selected.map((s) => s.synset_id)) !== JSON.stringify(selectedIds)) here('editorial source selection differs from the report');
        entry.selected.forEach((s, i) => { if (record.senses[i] && s.sense_id !== record.senses[i].sense_id) here('report sense_id ' + s.sense_id + ' differs from the record'); });
        const v1Sense = record.senses.find((s) => s.v1_primary === true);
        if (!v1Sense) { here('no v1_primary sense'); continue; }
        if (entry.v1_source.synset_id !== v1Sense.source.synset_id || entry.v1_source.pos !== v1Sense.pos || entry.v1_source.sense_id_in_record !== v1Sense.sense_id) here('report v1_source does not match the record v1_primary sense');
        if (entry.selected.filter((s) => s.v1_source).length !== 1 || !entry.selected.find((s) => s.v1_source && s.synset_id === v1Sense.source.synset_id)) here('the V1 source sense is not selected exactly once');
        // a revised V1 learner text is declared in the record, the source and the report, and the three agree
        const recordRevision = v1Sense.v1_revision || null;
        const reportRevision = entry.v1_sense_revision || null;
        const sourceRevision = (word.selected.find((s) => s.v1) || {}).v1_revision || null;
        if (Boolean(recordRevision) !== Boolean(reportRevision) || Boolean(recordRevision) !== Boolean(sourceRevision)) here('v1_revision must be declared consistently in the record, the report and the editorial source');
        if (recordRevision && reportRevision) {
            if (JSON.stringify(Object.keys(recordRevision.v1_original).sort()) !== JSON.stringify(reportRevision.fields_revised) || recordRevision.reason !== reportRevision.reason) here('v1_revision fields/reason differ between the record and the report');
        }
        for (const s of record.senses) if (s !== v1Sense && s.v1_revision) here('only the V1 sense may carry v1_revision');
        const enriched = r6c.isEnriched(word);
        if ((entry.record_outcome === 'ENRICHED') !== enriched) here('record_outcome disagrees with the source selection');
        if (enriched !== (record.record_status === 'EDITORIAL_ENRICHED')) here('record_status ' + record.record_status + ' disagrees with the editorial outcome');
        if (!enriched && record.senses.length !== 1) here('an unchanged word must keep exactly its V1 sense');
        if (enriched && record.senses.length < 2) here('an enriched record must select at least two senses');
        const changedOrder = record.senses[0].v1_primary !== true;
        if (entry.order_changed !== changedOrder) here('order_changed disagrees with the record');
        if (enriched && (!record.editorial_enrichment || record.editorial_enrichment.order_rationale !== entry.order_rationale)) here('editorial_enrichment.order_rationale differs from the report');
        const pagePath = path.join(root, 'word', slug + '.html');
        const parityResult = fs.existsSync(pagePath) ? checkParity(record, fs.readFileSync(pagePath, 'utf8'), cleanupEntries.get(slug) || null) : null;
        if (!parityResult || parityResult.status === 'FAIL') here('V1 parity failed: the V1 sense no longer equals the live V1 page' + (parityResult ? ' (' + parityResult.differences.map((d) => d.field).join(', ') + ')' : ''));

        // 6. per-sense learner quality
        const candidatesById = new Map(entry.candidates.map((c) => [c.synset_id, c]));
        const lemmaStem = slug.toLowerCase();
        const explanations = new Set();
        const oewnExamples = entry.candidates.flatMap((c) => c.quoted_examples).map(norm).filter(Boolean);
        record.senses.forEach((sense) => {
            const where = 'sense ' + sense.sense_id + ' (' + sense.source.synset_id + ')';
            const candidate = candidatesById.get(sense.source.synset_id);
            if (sense.source.type !== 'OEWN_2025' || !candidate) { here(where + ': must be an OEWN 2025 candidate sense'); return; }
            if (!sense.pos) here(where + ': missing POS');
            if (sense.pos !== candidate.pos) here(where + ': POS differs from the OEWN candidate');
            if (sense.definition.oewn_definition !== candidate.definition) here(where + ': oewn_definition differs from the OEWN definition');
            if (!sense.v1_primary && sense.definition.text !== candidate.definition) here(where + ': a new sense must carry the exact OEWN definition');
            if (sense.definition.origin !== 'OEWN_GLOSS') here(where + ': definition origin must be OEWN_GLOSS');
            // no OEWN example contamination / citation residue in the learner-visible definition
            const text = sense.definition.text;
            if (/"|\u201c|\u201d/.test(text)) here(where + ': definition contains quotation marks (possible OEWN example contamination)');
            if (/;\s+-\s/.test(text)) here(where + ': definition contains citation residue');
            for (const example of candidate.quoted_examples) if (text.includes(example)) here(where + ': definition contains an OEWN example');
            if (sense.definition.contamination) here(where + ': definition still declares contamination');
            // Ovidhan-authored fields are labelled and present
            if (sense.bangla_meaning.origin !== 'OVIDHAN_EDITORIAL' || sense.bangla_explanation.origin !== 'OVIDHAN_EDITORIAL') here(where + ': Bangla fields must be OVIDHAN_EDITORIAL');
            if (!BENGALI.test(sense.bangla_meaning.display)) here(where + ': Bangla meaning has no Bangla text');
            if (!BENGALI.test(sense.bangla_explanation.text)) here(where + ': Bangla explanation has no Bangla text');
            if (sense.bangla_explanation.text === sense.bangla_meaning.display || sense.bangla_explanation.text.length < 30) here(where + ': Bangla explanation merely repeats the meaning or is too short');
            if (explanations.has(norm(sense.bangla_explanation.text))) here(where + ': Bangla explanation duplicated across senses');
            explanations.add(norm(sense.bangla_explanation.text));
            if (!sense.v1_primary && !new RegExp('\\b' + lemmaStem, 'i').test(sense.bangla_explanation.text)) here(where + ': Bangla explanation does not name the English word');
            if (sense.examples.length < 1) here(where + ': no example');
            for (const example of sense.examples) {
                if (example.origin !== 'OVIDHAN_EDITORIAL') here(where + ': example must be OVIDHAN_EDITORIAL');
                if (!/[A-Za-z]/.test(example.en) || BENGALI.test(example.en)) here(where + ': English example must be English');
                if (!BENGALI.test(example.bn)) here(where + ': Bangla example translation has no Bangla text');
                if (!new RegExp('\\b' + lemmaStem, 'i').test(example.en)) here(where + ': English example does not use the headword');
                const key = norm(example.en);
                for (const quoted of oewnExamples) if (key === quoted || key.includes(quoted) || (quoted.length > 20 && quoted.includes(key))) here(where + ': example copies an OEWN example');
                if (allExamples.get(key) && allExamples.get(key) !== slug + ':' + sense.sense_id) here(where + ': example duplicated in ' + allExamples.get(key));
            }
        });
        const meanings = record.senses.map((s) => s.pos + '|' + norm(s.bangla_meaning.display));
        if (new Set(meanings).size !== meanings.length) here('duplicate Bangla meaning for the same part of speech');
        // usage notes (optional) must point at real senses and be Ovidhan-authored
        for (const note of record.usage_notes || []) {
            if (!record.senses.some((s) => s.sense_id === note.sense_id)) here('usage note points at a missing sense');
            if (!BENGALI.test(note.text)) here('usage note has no Bangla text');
        }
    }

    // 7. nothing outside the cohort was enriched
    for (const [slug, record] of records) {
        if (cohort.includes(slug)) continue;
        if (record.record_status !== 'V1_MIGRATION') fail(slug + ': is outside the R6C cohort but is not a V1_MIGRATION record');
    }
    return errors;
}

// ------------------------------------------------------------------ scope guard
// Allowed to change in R6C: the Dictionary V2 data, tools and tests. Everything else (word pages, the approved registry,
// sitemaps, robots.txt, dictionary pages, the deploy script, frozen experiment artifacts) must be byte-identical to the base.
const ALLOWED_PREFIXES = ['dictionary-v2/', 'scripts/dictionary-v2/', 'tests/dictionary-v2-'];
const NEVER_CHANGE = [
    /^word\//, /^data\/approved-static-word-slugs\.json$/, /^sitemap[^/]*$/, /^robots\.txt$/, /^deploy-production\.ps1$/,
    /^dictionary[^/]*\.html$/, /^dictionary\//, /^learning-explorer\.js$/, /^reports\//, /^data\//
];
function guardCheck(changedPaths) {
    const errors = [];
    for (const raw of changedPaths) {
        const p = raw.replace(/\\/g, '/');
        const forbidden = NEVER_CHANGE.find((re) => re.test(p));
        if (forbidden) errors.push('protected path changed: ' + p);
        else if (!ALLOWED_PREFIXES.some((prefix) => p.startsWith(prefix))) errors.push('path outside the R6C scope changed: ' + p);
    }
    return errors;
}

// Untracked local material that has existed since before R6C and must stay untracked (it is not part of any commit).
const PREEXISTING_UNTRACKED = ['.wrangler/', 'OVIDHAN_APPROVED_2326_WORDS.txt', 'research/'];

function changedSince(root, base) {
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').map((s) => s.trim()).filter(Boolean);
    const untracked = git(['ls-files', '--others', '--exclude-standard']).filter((p) => !PREEXISTING_UNTRACKED.some((prefix) => p === prefix || p.startsWith(prefix)));
    return [...new Set([
        ...git(['diff', '--name-only', base]),
        ...git(['diff', '--name-only', '--cached', base]),
        ...untracked
    ])].sort();
}

// ------------------------------------------------------------------ CLI
function main() {
    const argv = process.argv.slice(2);
    const command = argv.shift();
    const args = { check: false, base: BASE_COMMIT };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--archive') args.archive = argv[++i];
        else if (argv[i] === '--check') args.check = true;
        else if (argv[i] === '--base') args.base = argv[++i];
        else throw new Error('Unknown argument: ' + argv[i]);
    }
    if (command === 'report') {
        if (!args.archive) throw new Error('--archive <zip> is required');
        const { provenance, oewn } = loadOewn(args.archive);
        const text = lib.canonicalJson(buildReport({ source: r6c.loadSource(), oewn, provenance }));
        const target = path.join(lib.ROOT, REPORT_PATH);
        if (args.check) {
            const existing = fs.existsSync(target) ? lib.toLf(fs.readFileSync(target, 'utf8')) : null;
            if (existing !== text) { console.error('R6C report differs from the one derived from the verified OEWN archive.'); process.exit(1); }
            console.log('R6C report OK: byte-identical to the report derived from the verified OEWN archive.');
        } else {
            fs.writeFileSync(target, text, 'utf8');
            console.log('Wrote ' + REPORT_PATH + '.');
        }
    } else if (command === 'validate') {
        let oewn = null;
        if (args.archive) oewn = loadOewn(args.archive).oewn;
        const ctx = loadContext();
        const errors = validateEditorial({ ctx, oewn });
        if (errors.length) { console.error('R6C INVALID (' + errors.length + ' errors)'); for (const e of errors) console.error('  - ' + e); process.exit(1); }
        const report = lib.readJson(path.join(lib.ROOT, REPORT_PATH));
        const t = report.totals;
        console.log('R6C VALID: ' + t.words + ' words, ' + t.candidates_inspected + ' OEWN candidates inspected, ' + t.selected_senses + ' senses selected (' + t.new_senses_added + ' new, ' + t.v1_senses_retained + ' V1 retained), ' + t.rejected_candidates + ' rejected' + (oewn ? ', verified against the OEWN archive' : ', offline lock mode'));
    } else if (command === 'guard') {
        const changed = changedSince(lib.ROOT, args.base);
        const errors = guardCheck(changed);
        if (errors.length) { console.error('R6C GUARD FAILED'); for (const e of errors) console.error('  - ' + e); process.exit(1); }
        console.log('R6C GUARD OK: ' + changed.length + ' changed/new paths since ' + args.base.slice(0, 10) + ', all inside the R6C scope; zero word/*.html, registry, sitemap, robots.txt, dictionary page, deploy script or frozen artifact changes.');
        for (const p of changed) console.log('  ' + p);
    } else {
        throw new Error('Usage: r6c.js report|validate|guard (see header)');
    }
}

module.exports = { buildReport, totalsOf, validateEditorial, loadRecords, guardCheck, changedSince, REPORT_PATH, BASE_COMMIT, ALLOWED_PREFIXES, NEVER_CHANGE };
if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
