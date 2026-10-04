'use strict';
// SEO-R6A: deterministic, fail-closed validator for Dictionary V2 records.
//
// Usage:
//   node scripts/dictionary-v2/validate.js                      (offline, against the committed synset lock)
//   node scripts/dictionary-v2/validate.js --archive <zip>      (additionally re-derive the lock from the verified archive)
//   node scripts/dictionary-v2/validate.js --oewn-dir <dir>     (same, from an extracted directory)
//
// Exit code 0 only if every check passes. Any error, exception or missing input exits 1.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');
const { buildLock } = require('./build-oewn-lock');
const cleanup = require('./definition-cleanup');

const PLACEHOLDER_EXACT = /^(tbd|todo|fixme|n\/a|na|none|null|undefined|unknown|placeholder|lorem ipsum.*|x{2,}|\?+|-+|\.+|…+)$/i;
const PLACEHOLDER_CONTAINS = /\b(TODO|TBD|FIXME)\b|lorem ipsum|\{\{|\}\}|<placeholder>|\[placeholder\]/i;
const norm = (text) => text.toLowerCase().replace(/\s+/g, ' ').trim();
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function loadContext(options = {}) {
    const root = options.root || lib.ROOT;
    const v2 = path.join(root, 'dictionary-v2');
    const provenance = lib.readJson(path.join(v2, 'oewn-2025-provenance.json'));
    const lock = lib.readJson(path.join(v2, 'oewn-2025-synset-lock.json'));
    const ctx = {
        root, v2,
        schema: lib.readJson(path.join(v2, 'dictionary-v2.schema.json')),
        provenance, lock,
        lockById: new Map(lock.synsets.map((s) => [s.id, s])),
        registry: lib.loadRegistry(root),
        frozen: lib.loadFrozenWords(root),
        cohort: lib.readJson(path.join(v2, 'prototype-cohort.json')),
        cleanupManifest: fs.existsSync(path.join(v2, 'definition-cleanup-manifest.json')) ? lib.readJson(path.join(v2, 'definition-cleanup-manifest.json')) : null,
        exceptionForms: null
    };
    if (options.source) {
        ctx.exceptionForms = new Map();
        for (const [file, pos] of [['noun.exc', 'noun'], ['verb.exc', 'verb'], ['adj.exc', 'adjective'], ['adv.exc', 'adverb']]) {
            for (const line of options.source.getFile(file).toString('utf8').split('\n')) {
                const t = line.trim().split(/\s+/);
                if (t.length >= 2) ctx.exceptionForms.set(pos + ':' + t[0], t.slice(1));
            }
        }
    }
    return ctx;
}

function walkStrings(value, where, visit) {
    if (value === null) visit(null, where);
    else if (Array.isArray(value)) {
        if (!value.length) visit(undefined, where, 'empty array');
        value.forEach((item, i) => walkStrings(item, where + '/' + i, visit));
    } else if (typeof value === 'object') {
        if (!Object.keys(value).length) visit(undefined, where, 'empty object');
        for (const [k, v] of Object.entries(value)) walkStrings(v, where + '/' + k, visit);
    } else if (typeof value === 'string') visit(value, where);
}

function isSorted(items, keyFn) {
    for (let i = 1; i < items.length; i++) if (cmp(keyFn(items[i - 1]), keyFn(items[i])) >= 0) return false;
    return true;
}

function validateRecord(record, ctx) {
    const errors = [];
    const fail = (msg) => errors.push(msg);
    const schemaErrors = lib.validateSchema(record, ctx.schema);
    if (schemaErrors.length) return schemaErrors.map((e) => 'schema: ' + e);

    // placeholders, nulls and empty containers
    walkStrings(record, '', (value, where, kind) => {
        if (kind) fail('placeholder: ' + kind + ' at ' + where);
        else if (value === null) fail('placeholder: null at ' + where);
        else if (PLACEHOLDER_EXACT.test(value.trim()) || PLACEHOLDER_CONTAINS.test(value)) fail('placeholder: "' + value.slice(0, 40) + '" at ' + where);
    });

    const slug = record.slug;
    if (record.headword.toLowerCase().replace(/ /g, '-') !== slug) fail('headword "' + record.headword + '" does not correspond to slug "' + slug + '"');
    if (!ctx.registry.has(slug)) fail('slug is not in the approved registry: ' + slug);
    if (ctx.frozen.has(slug)) fail('slug belongs to a frozen experiment set and must not be modified: ' + slug);

    // attribution and provenance
    for (const [key, expected] of Object.entries(lib.ATTRIBUTION)) {
        if (record.attribution[key] !== expected) fail('attribution.' + key + ' differs from the required OEWN attribution');
    }
    if (record.provenance.oewn.archive_sha256 !== ctx.provenance.source.archive_sha256.toLowerCase()) fail('provenance.oewn.archive_sha256 does not match oewn-2025-provenance.json');
    if (record.provenance.v1_migration.source_page !== 'word/' + slug + '.html') fail('provenance.v1_migration.source_page does not match slug');

    // V1_MIGRATION is lossless: one primary sense, nothing optional
    if (record.record_status === 'V1_MIGRATION') {
        if (record.senses.length !== 1) fail('V1_MIGRATION record must contain exactly one sense');
        for (const key of ['forms', 'phrases', 'collocations', 'usage_notes', 'related_words']) if (key in record) fail('V1_MIGRATION record must not contain "' + key + '" (no enrichment in a lossless migration)');
        for (const sense of record.senses) for (const key of ['synonyms', 'antonyms']) if (key in sense) fail('V1_MIGRATION sense must not contain "' + key + '"');
    }

    // senses: order, ids, primary
    let lastIndex = 0;
    const senseIds = new Set();
    const seenSynsets = new Set();
    const seenDefinitions = new Set();
    const seenMeanings = new Set();
    record.senses.forEach((sense, i) => {
        const where = 'senses[' + i + ']';
        const index = Number(sense.sense_id.slice(1));
        if (index <= lastIndex) fail(where + ': sense_id must strictly increase in array order');
        lastIndex = index;
        if (senseIds.has(sense.sense_id)) fail(where + ': duplicate sense_id');
        senseIds.add(sense.sense_id);
        if (i === 0 && sense.v1_primary !== true) fail(where + ': first sense must be the V1 primary sense');
        if (i > 0 && sense.v1_primary) fail(where + ': only the first sense may be v1_primary');

        const defKey = norm(sense.definition.text) + '|' + sense.pos;
        if (seenDefinitions.has(defKey)) fail(where + ': duplicate sense (same definition and POS)');
        seenDefinitions.add(defKey);
        const meaningKey = sense.pos + '|' + norm(sense.bangla_meaning.display);
        if (seenMeanings.has(meaningKey)) fail(where + ': duplicate sense (same Bangla meaning and POS)');
        seenMeanings.add(meaningKey);

        let synset = null;
        if (sense.source.type === 'OEWN_2025') {
            const id = sense.source.synset_id;
            if (!id) { fail(where + ': OEWN_2025 source requires synset_id'); }
            else {
                if (seenSynsets.has(id)) fail(where + ': duplicate sense (synset ' + id + ' used twice)');
                seenSynsets.add(id);
                synset = ctx.lockById.get(id) || null;
                if (!synset) fail(where + ': synset ' + id + ' is not a valid OEWN 2025 reference (absent from the verified lock)');
            }
            if ('rationale' in sense.source) fail(where + ': OEWN_2025 source must not carry rationale');
        } else {
            if ('synset_id' in sense.source) fail(where + ': OVIDHAN_EDITORIAL source must not carry synset_id');
            if (!sense.source.rationale) fail(where + ': OVIDHAN_EDITORIAL source requires rationale');
            if (sense.definition.origin !== 'OVIDHAN_EDITORIAL') fail(where + ': definition of an editorial sense must have origin OVIDHAN_EDITORIAL');
        }
        if (synset) {
            if (synset.pos !== sense.pos) fail(where + ': POS "' + sense.pos + '" differs from OEWN synset POS "' + synset.pos + '"');
            if (!synset.words.some((w) => w.toLowerCase() === slug)) fail(where + ': headword "' + slug + '" is not a lemma of synset ' + synset.id);
            if (sense.definition.origin !== 'OEWN_GLOSS') fail(where + ': definition of an OEWN sense must have origin OEWN_GLOSS');
            if (sense.definition.oewn_definition !== synset.definition) fail(where + ': definition.oewn_definition differs from OEWN');
            const original = sense.definition.v1_original;
            if (original) {
                // SEO-R6B cleaned definition: text is exactly the OEWN definition; v1_original is the audit trail.
                if (record.schema_version !== '1.1.0') fail(where + ': definition.v1_original requires schema_version 1.1.0');
                if ('contamination' in sense.definition) fail(where + ': a cleaned definition must not also declare contamination');
                if (sense.definition.text !== synset.definition) fail(where + ': cleaned definition.text must be exactly the OEWN definition');
                const classified = cleanup.classifyAgainstSynset(original.text, synset);
                if (!classified || classified.type === cleanup.TYPES.CLEAN) fail(where + ': v1_original.text is not provable OEWN contamination of this synset');
                else {
                    if (!original.text.startsWith(sense.definition.text) || original.removed_material !== original.text.slice(sense.definition.text.length)) fail(where + ': v1_original.removed_material is not exactly the removed contamination');
                    if (JSON.stringify(original.contamination) !== JSON.stringify(cleanup.contaminationFor(classified.type, classified.removed))) fail(where + ': v1_original.contamination is not declared exactly');
                }
                const entry = ctx.cleanupManifest && ctx.cleanupManifest.entries.find((e) => e.slug === slug);
                if (!entry) fail(where + ': no entry for this word in the cleanup manifest');
                else if (entry.source_synset_id !== sense.source.synset_id || entry.before_definition !== original.text || entry.after_definition !== sense.definition.text || entry.removed_material !== original.removed_material) fail(where + ': record disagrees with the cleanup manifest entry');
            } else {
                if (record.schema_version === '1.0.0' || sense.definition.contamination) {
                    const { alignment, contamination } = lib.classifyDefinition(sense.definition.text, synset);
                    if (alignment === 'MISMATCH') fail(where + ': definition.text matches neither the OEWN definition nor the raw OEWN gloss');
                    const declared = JSON.stringify(sense.definition.contamination || []);
                    if (alignment !== 'MISMATCH' && declared !== JSON.stringify(contamination)) fail(where + ': definition contamination is not declared exactly (expected ' + JSON.stringify(contamination) + ')');
                } else if (sense.definition.text !== synset.definition) fail(where + ': definition.text must equal the OEWN definition');
            }
        } else if (sense.definition.contamination || sense.definition.oewn_definition) {
            if (sense.source.type === 'OVIDHAN_EDITORIAL') fail(where + ': editorial definition must not carry OEWN fields');
        }

        // examples
        const seenExamples = new Set();
        for (const example of sense.examples) {
            const key = norm(example.en);
            if (seenExamples.has(key)) fail(where + ': duplicate example "' + example.en.slice(0, 40) + '"');
            seenExamples.add(key);
        }

        // synonyms / antonyms by sense
        for (const kind of ['synonyms', 'antonyms']) {
            const list = sense[kind];
            if (!list) continue;
            if (!isSorted(list, (x) => x.word)) fail(where + '.' + kind + ': must be sorted by word, ascending, without duplicates');
            for (const item of list) {
                if (item.word.toLowerCase() === slug) fail(where + '.' + kind + ': contains the headword itself');
                if (item.approved_slug !== undefined && (!ctx.registry.has(item.approved_slug) || item.approved_slug !== item.word.toLowerCase())) fail(where + '.' + kind + ': approved_slug "' + item.approved_slug + '" is not the approved word "' + item.word + '"');
                if (item.origin === 'OEWN_SYNSET') {
                    if (!synset || !synset.words.some((w) => w.toLowerCase() === item.word.toLowerCase())) fail(where + '.synonyms: "' + item.word + '" is not in the OEWN synset of this sense');
                }
                if (item.origin === 'OEWN_LEXICAL_POINTER') {
                    const ok = synset && (synset.lexical_antonyms || []).some((a) => a.from_word === slug && a.to_word === item.word.toLowerCase());
                    if (!ok) fail(where + '.antonyms: "' + item.word + '" is not an OEWN lexical antonym of this sense');
                }
            }
        }
    });

    // record-level optional blocks
    const checkSenseRef = (item, label) => { if (item.sense_id && !senseIds.has(item.sense_id)) fail(label + ': sense_id ' + item.sense_id + ' does not exist'); };
    const checkBlock = (key, keyFn) => {
        const list = record[key];
        if (!list) return;
        if (!isSorted(list, keyFn)) fail(key + ': must be sorted ascending without duplicates');
        list.forEach((item) => checkSenseRef(item, key));
    };
    checkBlock('forms', (x) => x.pos + '|' + x.kind + '|' + x.form);
    checkBlock('phrases', (x) => x.phrase);
    checkBlock('collocations', (x) => x.text);
    checkBlock('usage_notes', (x) => (x.sense_id || '') + '|' + x.text);
    checkBlock('related_words', (x) => x.slug + '|' + x.relation + '|' + (x.sense_id || ''));
    for (const form of record.forms || []) {
        if (form.origin === 'OEWN_EXCEPTION_LIST') {
            if (!ctx.exceptionForms) fail('forms: "' + form.form + '" cannot be verified offline; supply --archive or --oewn-dir');
            else if (!(ctx.exceptionForms.get(form.pos + ':' + form.form) || []).includes(slug)) fail('forms: "' + form.form + '" is not an OEWN exception form of "' + slug + '"');
        }
    }
    for (const rel of record.related_words || []) {
        if (rel.slug === slug) fail('related_words: a word cannot relate to itself');
        if (!ctx.registry.has(rel.slug)) fail('related_words: "' + rel.slug + '" is not an approved word');
        if (rel.relation === 'EDITORIAL' && rel.origin !== 'OVIDHAN_EDITORIAL') fail('related_words: EDITORIAL relation must have origin OVIDHAN_EDITORIAL');
        if (rel.relation !== 'EDITORIAL' && rel.origin !== 'OEWN_POINTER') fail('related_words: ' + rel.relation + ' must have origin OEWN_POINTER');
        const targetSenses = rel.sense_id ? record.senses.filter((s) => s.sense_id === rel.sense_id) : record.senses;
        const locked = targetSenses.map((s) => ctx.lockById.get(s.source.synset_id)).filter(Boolean);
        if (rel.relation === 'SAME_SYNSET' && !locked.some((s) => s.words.some((w) => w.toLowerCase() === rel.slug))) fail('related_words: "' + rel.slug + '" is not in the same OEWN synset');
        if (rel.relation === 'LEXICAL_ANTONYM' && !locked.some((s) => (s.lexical_antonyms || []).some((a) => a.from_word === slug && a.to_word === rel.slug))) fail('related_words: "' + rel.slug + '" is not an OEWN lexical antonym');
    }
    return errors;
}

function validateLock(lock, ctx) {
    const errors = [];
    if (lock.schema !== 'ovidhan.oewn-synset-lock/1') errors.push('lock: unknown schema');
    if (lock.archive_sha256 !== ctx.provenance.source.archive_sha256.toLowerCase()) errors.push('lock: archive_sha256 differs from provenance');
    if (lock.oewn_release !== ctx.provenance.source.release) errors.push('lock: oewn_release differs from provenance');
    let previous = '';
    for (const s of lock.synsets) {
        if (!/^[0-9]{8}-[nvar]$/.test(s.id)) errors.push('lock: bad synset id ' + s.id);
        if (s.id <= previous) errors.push('lock: synsets must be sorted by id without duplicates (' + s.id + ')');
        previous = s.id;
        if (s.id.slice(0, 8) !== s.offset || lib.POS_BY_SUFFIX[s.id.slice(-1)] !== s.pos) errors.push('lock: id/offset/pos disagree for ' + s.id);
        const split = lib.splitGloss(s.gloss);
        if (split.definition !== s.definition || JSON.stringify(split.quoted_examples) !== JSON.stringify(s.quoted_examples)) errors.push('lock: definition/examples do not derive from gloss for ' + s.id);
        if (!Array.isArray(s.words) || !s.words.length) errors.push('lock: no words for ' + s.id);
        if (!/^[0-9a-f]{64}$/.test(s.line_sha256)) errors.push('lock: bad line_sha256 for ' + s.id);
    }
    return errors;
}

function validateAll(ctx, options = {}) {
    const errors = [];
    errors.push(...validateLock(ctx.lock, ctx));
    const recordsDir = path.join(ctx.v2, 'records');
    if (!fs.existsSync(recordsDir)) return ['records directory is missing'];
    const files = fs.readdirSync(recordsDir).sort();
    const expected = ctx.cohort.words.map((w) => w + '.json');
    if (JSON.stringify(ctx.cohort.words) !== JSON.stringify([...ctx.cohort.words].sort()) || new Set(ctx.cohort.words).size !== ctx.cohort.words.length) errors.push('prototype-cohort.json words must be unique and sorted');
    if (JSON.stringify(files) !== JSON.stringify([...expected].sort())) errors.push('records/ does not match prototype-cohort.json exactly (expected ' + expected.length + ' files, found ' + files.length + ')');
    const slugs = new Set();
    const examples = new Map();
    const referenced = new Set();
    for (const file of files) {
        const target = path.join(recordsDir, file);
        let record;
        try { record = lib.readJson(target); } catch (error) { errors.push(file + ': invalid JSON (' + error.message + ')'); continue; }
        if (lib.toLf(fs.readFileSync(target, 'utf8')) !== lib.canonicalJson(record)) errors.push(file + ': not in canonical form (sorted keys, 2-space indent, LF, trailing newline)');
        if (record.slug + '.json' !== file) errors.push(file + ': slug "' + record.slug + '" does not match file name');
        if (slugs.has(record.slug)) errors.push(file + ': duplicate slug');
        slugs.add(record.slug);
        for (const e of validateRecord(record, ctx)) errors.push(file + ': ' + e);
        for (const sense of record.senses || []) {
            if (sense.source && sense.source.synset_id) referenced.add(sense.source.synset_id);
            for (const ex of sense.examples || []) {
                const key = norm(ex.en || '');
                if (examples.has(key) && examples.get(key) !== record.slug) errors.push(file + ': example duplicated in record "' + examples.get(key) + '"');
                examples.set(key, record.slug);
            }
        }
    }
    for (const s of ctx.lock.synsets) if (!referenced.has(s.id)) errors.push('lock: synset ' + s.id + ' is not referenced by any record (stale lock)');
    if (options.source) {
        const sourceErrors = lib.verifyOewnSource(options.source, ctx.provenance);
        errors.push(...sourceErrors);
        if (!sourceErrors.length) {
            const synsets = lib.parseOewnData(options.source.getFile);
            const fresh = lib.canonicalJson(buildLock({ synsets, ids: ctx.lock.synsets.map((s) => s.id), provenance: ctx.provenance }));
            if (fresh !== lib.canonicalJson(ctx.lock)) errors.push('lock: differs from the verified OEWN source');
        }
    }
    return errors;
}

function main() {
    const argv = process.argv.slice(2);
    const opts = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--archive') opts.archive = argv[++i];
        else if (argv[i] === '--oewn-dir') opts.dir = argv[++i];
        else throw new Error('Unknown argument: ' + argv[i]);
    }
    const source = opts.archive || opts.dir ? lib.openOewnSource({ archive: opts.archive, dir: opts.dir }) : null;
    const ctx = loadContext({ source });
    const errors = validateAll(ctx, { source });
    if (errors.length) {
        console.error('INVALID (' + errors.length + ' errors)');
        for (const e of errors) console.error('  - ' + e);
        process.exit(1);
    }
    console.log('VALID: ' + ctx.cohort.words.length + ' records, ' + ctx.lock.synsets.length + ' locked synsets' + (source ? ', verified against ' + source.kind : ', offline lock mode'));
}

module.exports = { loadContext, validateRecord, validateLock, validateAll };
if (require.main === module) {
    try { main(); } catch (error) { console.error('INVALID (fail closed): ' + error.message); process.exit(1); }
}
