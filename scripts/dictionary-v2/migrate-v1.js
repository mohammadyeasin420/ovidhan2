'use strict';
// SEO-R6A: lossless migration of the live V1 word pages of the prototype cohort into
// canonical Dictionary V2 records. Read-only with respect to word/*.html.
//
// Source-of-truth rule (established in SEO-R5C): the LIVE V1 page is authoritative.
// The OEWN synset is found by matching the page's displayed definition against OEWN glosses
// for the headword and part of speech. Research artifacts are only compared and reported.
//
// Usage:
//   node scripts/dictionary-v2/migrate-v1.js [--archive <zip> | --oewn-dir <dir>] [--research-dir <dir>] [--check]
// Without --archive/--oewn-dir the committed synset lock is used as the OEWN source.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');
const cleanup = require('./definition-cleanup');
const r6c = require('./r6c-enrich');

const TOOL = 'scripts/dictionary-v2/migrate-v1.js@1.0.0';
const PROVENANCE_FILE = 'dictionary-v2/oewn-2025-provenance.json';

// cleanupEntry (optional, SEO-R6B): the verified definition-cleanup manifest entry for this word. When given, the
// record is emitted as schema 1.1.0 with the clean OEWN definition and an auditable v1_original block. This works
// whether the V1 page still shows the contaminated text or has already been cleaned, so the record is reproducible both ways.
function buildRecord({ slug, html, oewn, archiveSha256, cleanupEntry }) {
    const record = buildBaseRecord({ slug, html, oewn, archiveSha256 });
    return cleanupEntry ? cleanup.applyEntryToRecord(record, cleanupEntry) : record;
}

function buildBaseRecord({ slug, html, oewn, archiveSha256 }) {
    const page = lib.extractV1Page(html);
    if (page.problems.length) throw new Error(slug + ': V1 page not parseable: ' + page.problems.join('; '));
    const h1 = /^(.+) meaning in Bangla$/.exec(page.h1 || '');
    if (!h1 || h1[1].toLowerCase() !== slug) throw new Error(slug + ': unexpected H1 "' + page.h1 + '"');
    const candidates = oewn.synsetsForLemma(slug).filter((s) =>
        s.pos === page.part_of_speech && (s.definition === page.definition || s.gloss === page.definition));
    const unique = [...new Map(candidates.map((s) => [s.id, s])).values()];
    if (unique.length !== 1) {
        throw new Error(slug + ': displayed definition matches ' + unique.length + ' OEWN synsets (' + unique.map((s) => s.id).join(', ') + '); migration refuses to guess.');
    }
    const synset = unique[0];
    const { alignment, contamination } = lib.classifyDefinition(page.definition, synset);
    if (alignment === 'MISMATCH') throw new Error(slug + ': definition does not align with ' + synset.id);
    const definition = { text: page.definition, origin: 'OEWN_GLOSS', oewn_definition: synset.definition };
    if (contamination.length) definition.contamination = contamination;
    return {
        schema_version: '1.0.0',
        record_status: 'V1_MIGRATION',
        slug,
        headword: h1[1],
        attribution: { ...lib.ATTRIBUTION },
        provenance: {
            oewn: { release: '2025', archive_sha256: archiveSha256, provenance_file: PROVENANCE_FILE },
            v1_migration: {
                source_page: 'word/' + slug + '.html',
                source_page_sha256_lf: lib.sha256Lf(Buffer.from(html, 'utf8')),
                tool: TOOL
            }
        },
        senses: [{
            sense_id: 's1',
            pos: page.part_of_speech,
            v1_primary: true,
            source: { type: 'OEWN_2025', synset_id: synset.id },
            definition,
            bangla_meaning: { display: page.bangla_meaning, origin: 'OVIDHAN_EDITORIAL' },
            bangla_explanation: { text: page.bangla_explanation, origin: 'OVIDHAN_EDITORIAL' },
            examples: [{ en: page.example_en, bn: page.example_bn, origin: 'OVIDHAN_EDITORIAL' }]
        }]
    };
}

// Optional: what the untracked research artifacts claim for each word (reported, never trusted).
const ARTIFACT_FILES = [
    'SEO_R3C_AHREFS_2500_MASTER_FINAL.json', 'SEO_R3B_PILOT_EDITORIAL_REVIEW.json',
    'SEO_R3C_BATCH1B_APPROVED50_EDITORIAL.json', 'SEO_R3C_BATCH2_TOP500_APPROVED_EDITORIAL.json',
    'SEO_R4_BATCH3_TOP1000_FINAL_EDITORIAL.json', 'SEO_R4_BATCH4_FINAL_EDITORIAL.json'
];

function loadArtifactClaims(researchDir, slugs) {
    const claims = new Map();
    for (const file of ARTIFACT_FILES) {
        const target = path.join(researchDir, file);
        if (!fs.existsSync(target)) continue;
        const json = lib.readJson(target);
        for (const list of Object.values(json)) {
            if (!Array.isArray(list)) continue;
            for (const r of list) {
                if (!r || typeof r !== 'object') continue;
                const slug = r.slug || r.word;
                if (!slugs.has(slug)) continue;
                const offset = r.oewn_synset_id || r.selected_synset || r.selected_offset || r.synset || r.candidate_offset || null;
                if (offset) claims.set(slug, { file, offset: String(offset).padStart(8, '0') });
            }
        }
    }
    return claims;
}

function buildReport({ cohort, records, oewn, researchDir }) {
    const slugs = new Set(cohort.words);
    const claims = researchDir ? loadArtifactClaims(researchDir, slugs) : new Map();
    let lineage = new Map();
    const r5bFile = researchDir && path.join(researchDir, 'SEO_R5B_ENGLISH_BANGLA_DELTA_AUDIT.json');
    if (r5bFile && fs.existsSync(r5bFile)) {
        lineage = new Map(lib.readJson(r5bFile).candidates.filter((c) => slugs.has(c.slug)).map((c) => [c.slug, c.static_origin]));
    }
    const words = cohort.words.map((slug) => {
        const sense = records.get(slug).senses.find((s) => s.v1_primary === true);
        // The report describes the live V1 page as audited, so a cleaned record reports its v1_original contamination.
        const contamination = sense.definition.contamination || (sense.definition.v1_original && sense.definition.v1_original.contamination) || [];
        const entry = {
            slug,
            synset_id: sense.source.synset_id,
            pos: sense.pos,
            definition_alignment: contamination.length ? 'RAW_OEWN_GLOSS' : 'EXACT_OEWN_DEFINITION',
            definition_contamination: contamination.map((c) => c.kind)
        };
        if (lineage.has(slug)) entry.editorial_lineage_static_origin = lineage.get(slug);
        const claim = claims.get(slug);
        if (claim) {
            const claimed = [...new Set(oewnLookupIds(oewn, slug, claim.offset))];
            const agrees = claimed.includes(sense.source.synset_id);
            entry.artifact_claim = { file: claim.file, offset: claim.offset, agrees_with_live_page: agrees };
            if (!agrees) {
                const other = claimed.map((id) => oewn.get(id)).filter(Boolean)[0];
                entry.artifact_claim.claimed_definition = other ? other.definition : null;
                entry.artifact_claim.resolution = 'LIVE_PAGE_WINS';
            }
        }
        return entry;
    });
    return {
        report: 'ovidhan.dictionary-v2.migration-report/1',
        cohort_id: cohort.cohort_id,
        source_of_truth_rule: 'Live V1 page is authoritative. The OEWN synset is the unique synset (headword, POS) whose definition or raw gloss equals the displayed definition. Research artifacts are compared and reported only.',
        totals: {
            records: words.length,
            definition_exact_oewn: words.filter((w) => !w.definition_contamination.length).length,
            definition_contaminated_not_fixed: words.filter((w) => w.definition_contamination.length).length,
            artifact_disagreements: words.filter((w) => w.artifact_claim && !w.artifact_claim.agrees_with_live_page).length
        },
        words
    };
}

function oewnLookupIds(oewn, slug, offset) {
    return oewn.synsetsForLemma(slug).filter((s) => s.offset === offset).map((s) => s.id);
}

function parseArgs(argv) {
    const args = { check: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--check') args.check = true;
        else if (a === '--archive') args.archive = argv[++i];
        else if (a === '--oewn-dir') args.dir = argv[++i];
        else if (a === '--research-dir') args.research = argv[++i];
        else throw new Error('Unknown argument: ' + a);
    }
    return args;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const provenance = lib.readJson(path.join(lib.V2_DIR, 'oewn-2025-provenance.json'));
    const cohort = lib.readJson(path.join(lib.V2_DIR, 'prototype-cohort.json'));
    let oewn;
    if (args.archive || args.dir) {
        const source = lib.openOewnSource({ archive: args.archive, dir: args.dir });
        const errors = lib.verifyOewnSource(source, provenance);
        if (errors.length) { console.error('OEWN source verification FAILED:\n' + errors.join('\n')); process.exit(1); }
        oewn = lib.oewnFromSynsets(lib.parseOewnData(source.getFile));
    } else {
        oewn = lib.oewnFromLock(lib.readJson(path.join(lib.V2_DIR, 'oewn-2025-synset-lock.json')));
    }
    const archiveSha256 = provenance.source.archive_sha256.toLowerCase();
    const records = new Map();
    const differences = [];
    const manifestPath = path.join(lib.V2_DIR, 'definition-cleanup-manifest.json');
    const r6cSource = fs.existsSync(path.join(lib.ROOT, r6c.SOURCE_FILE)) ? r6c.loadSource() : null;
    const cleanupEntries = new Map(fs.existsSync(manifestPath) ? lib.readJson(manifestPath).entries.map((e) => [e.slug, e]) : []);
    for (const slug of cohort.words) {
        const html = fs.readFileSync(path.join(lib.ROOT, 'word', slug + '.html'), 'utf8');
        const migrated = buildRecord({ slug, html, oewn, archiveSha256, cleanupEntry: cleanupEntries.get(slug) });
        // SEO-R6C: the 12-word editorial cohort is reproduced as migration + authored enrichment (single-sense words stay unchanged).
        const editorial = r6cSource && r6c.wordSource(r6cSource, slug);
        const record = editorial ? r6c.enrichRecord({ base: migrated, word: editorial, oewn }) : migrated;
        records.set(slug, record);
        const target = path.join(lib.V2_DIR, 'records', slug + '.json');
        const text = lib.canonicalJson(record);
        if (args.check) {
            const existing = fs.existsSync(target) ? lib.toLf(fs.readFileSync(target, 'utf8')) : null;
            if (existing !== text) differences.push(slug);
        } else {
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, text, 'utf8');
        }
    }
    if (args.research) {
        const report = lib.canonicalJson(buildReport({ cohort, records, oewn, researchDir: path.resolve(args.research) }));
        const target = path.join(lib.V2_DIR, 'migration-report.json');
        if (args.check) { if (!fs.existsSync(target) || lib.toLf(fs.readFileSync(target, 'utf8')) !== report) differences.push('migration-report.json'); }
        else fs.writeFileSync(target, report, 'utf8');
    }
    if (args.check) {
        if (differences.length) { console.error('Migration check FAILED; differing: ' + differences.join(', ')); process.exit(1); }
        console.log('Migration check OK: ' + records.size + ' records reproduce byte-for-byte.');
    } else {
        console.log('Wrote ' + records.size + ' records.');
    }
}

module.exports = { buildRecord, buildReport, loadArtifactClaims, TOOL };
if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
