'use strict';
// Shared helpers for the Dictionary V2 data foundation (SEO-R6A).
// No third-party dependencies. Nothing here writes to word/*.html or any production file.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..', '..');
const V2_DIR = path.join(ROOT, 'dictionary-v2');

const ATTRIBUTION = Object.freeze({
    definition_source: 'Open English WordNet 2025',
    source_url: 'https://en-word.net/',
    license: 'CC BY 4.0',
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    editorial_statement: 'Bangla explanation and examples adapted and written for Ovidhan.'
});

const POS_BY_SUFFIX = Object.freeze({ n: 'noun', v: 'verb', a: 'adjective', r: 'adverb' });
const DATA_FILE_POS = Object.freeze({ 'data.noun': 'n', 'data.verb': 'v', 'data.adj': 'a', 'data.adv': 'r' });

// ---------------------------------------------------------------- generic helpers
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const stripBom = (text) => text.replace(/^\uFEFF/, '');
const toLf = (text) => text.replace(/\r\n/g, '\n');
const readText = (file) => stripBom(fs.readFileSync(file, 'utf8'));
const readJson = (file) => JSON.parse(readText(file));
// Hash of file content with CRLF folded to LF, so results do not depend on core.autocrlf.
const sha256Lf = (buffer) => sha256(Buffer.from(toLf(buffer.toString('utf8')), 'utf8'));

function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
        return out;
    }
    return value;
}
// Canonical serialization: recursively key-sorted, 2-space indent, LF, trailing newline, UTF-8.
const canonicalJson = (value) => JSON.stringify(sortKeys(value), null, 2) + '\n';

// ---------------------------------------------------------------- minimal zip reader (stored/deflate)
function readZipEntries(buffer) {
    let eocd = -1;
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
        if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Not a zip archive (end of central directory not found).');
    const count = buffer.readUInt16LE(eocd + 10);
    let offset = buffer.readUInt32LE(eocd + 16);
    const entries = new Map();
    for (let n = 0; n < count; n++) {
        if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Corrupt zip central directory.');
        const method = buffer.readUInt16LE(offset + 10);
        const compressedSize = buffer.readUInt32LE(offset + 20);
        const uncompressedSize = buffer.readUInt32LE(offset + 24);
        const nameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        const localOffset = buffer.readUInt32LE(offset + 42);
        const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
        offset += 46 + nameLength + extraLength + commentLength;
        if (name.endsWith('/')) continue;
        if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Corrupt zip local header: ' + name);
        const start = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
        const raw = buffer.subarray(start, start + compressedSize);
        let data;
        if (method === 0) data = raw;
        else if (method === 8) data = zlib.inflateRawSync(raw);
        else throw new Error('Unsupported zip compression method ' + method + ': ' + name);
        if (data.length !== uncompressedSize) throw new Error('Zip entry size mismatch: ' + name);
        entries.set(name, data);
    }
    return entries;
}

// ---------------------------------------------------------------- OEWN WNDB parsing
function splitGloss(gloss) {
    const definition = gloss.split(/;\s*"/)[0].trim();
    const quotedExamples = [...gloss.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    return { definition, quoted_examples: quotedExamples };
}

function synsetId(offset, posLetter) { return offset + '-' + posLetter; }

// Parses the four WNDB data files. getFile(name) must return a Buffer.
function parseOewnData(getFile) {
    const synsets = new Map();
    for (const [fileName, posLetter] of Object.entries(DATA_FILE_POS)) {
        for (const line of getFile(fileName).toString('utf8').split('\n')) {
            if (!line || line[0] === ' ') continue;
            const bar = line.indexOf(' | ');
            const head = (bar < 0 ? line : line.slice(0, bar)).trim().split(/\s+/);
            const gloss = bar < 0 ? '' : line.slice(bar + 3).trim();
            const offset = head[0];
            const wordCount = parseInt(head[3], 16);
            let i = 4;
            const words = [];
            for (let k = 0; k < wordCount; k++) { words.push(head[i].replace(/\((a|p|ip)\)$/, '')); i += 2; }
            const pointerCount = parseInt(head[i], 10); i++;
            const pointers = [];
            for (let k = 0; k < pointerCount; k++) {
                const st = head[i + 3];
                pointers.push({ symbol: head[i], offset: head[i + 1], pos: head[i + 2], source: parseInt(st.slice(0, 2), 16), target: parseInt(st.slice(2), 16) });
                i += 4;
            }
            const parts = splitGloss(gloss);
            const id = synsetId(offset, posLetter);
            synsets.set(id, {
                id, offset, pos: POS_BY_SUFFIX[posLetter], pos_letter: posLetter, ss_type: head[2], words,
                pointers, gloss, definition: parts.definition, quoted_examples: parts.quoted_examples,
                line_sha256: sha256(Buffer.from(line, 'utf8'))
            });
        }
    }
    return synsets;
}

// Lexical antonym pointers (!) of one synset, resolved to words.
function lexicalAntonyms(synset, synsets) {
    const out = [];
    for (const p of synset.pointers) {
        if (p.symbol !== '!' || p.source === 0) continue;
        const target = synsets.get(synsetId(p.offset, p.pos === 's' ? 'a' : p.pos));
        if (!target) continue;
        const fromWord = (synset.words[p.source - 1] || '').toLowerCase();
        const toWord = (target.words[p.target - 1] || '').toLowerCase();
        if (fromWord && toWord) out.push({ from_word: fromWord, to_word: toWord, to_synset_id: target.id });
    }
    return out.sort((a, b) => a.from_word.localeCompare(b.from_word) || a.to_word.localeCompare(b.to_word));
}

// Full OEWN access from an extracted directory or the original archive.
function openOewnSource(options) {
    if (options.archive) {
        const archiveBuffer = fs.readFileSync(options.archive);
        const entries = readZipEntries(archiveBuffer);
        const prefix = [...entries.keys()].map((n) => n.split('/')[0]).find(Boolean) + '/';
        return {
            kind: 'ARCHIVE', archiveSha256: sha256(archiveBuffer), archiveBytes: archiveBuffer.length,
            getFile: (name) => { const b = entries.get(prefix + name); if (!b) throw new Error('OEWN file missing from archive: ' + name); return b; },
            listFiles: () => [...entries.keys()].map((n) => n.slice(prefix.length)).sort()
        };
    }
    if (options.dir) {
        return {
            kind: 'EXTRACTED_DIR', archiveSha256: null,
            getFile: (name) => fs.readFileSync(path.join(options.dir, name)),
            listFiles: () => fs.readdirSync(options.dir).sort()
        };
    }
    throw new Error('No OEWN source supplied (use --archive <zip> or --oewn-dir <dir>).');
}

// Fail-closed verification of the OEWN source against the committed provenance.
function verifyOewnSource(source, provenance) {
    const errors = [];
    if (source.kind === 'ARCHIVE') {
        if (source.archiveSha256 !== provenance.source.archive_sha256.toLowerCase()) errors.push('OEWN archive SHA-256 mismatch: ' + source.archiveSha256);
        if (source.archiveBytes !== provenance.source.archive_bytes) errors.push('OEWN archive size mismatch: ' + source.archiveBytes);
    }
    for (const file of provenance.files) {
        let buffer;
        try { buffer = source.getFile(file.name); } catch (error) { errors.push(String(error.message)); continue; }
        if (buffer.length !== file.bytes) errors.push('OEWN file size mismatch: ' + file.name);
        if (sha256(buffer) !== file.sha256.toLowerCase()) errors.push('OEWN file SHA-256 mismatch: ' + file.name);
    }
    return errors;
}

// Uniform lookup interface used by the migration (full OEWN or the committed lock).
function oewnFromSynsets(synsets) {
    const byLemma = new Map();
    for (const synset of synsets.values()) {
        for (const word of synset.words) {
            const key = word.toLowerCase();
            if (!byLemma.has(key)) byLemma.set(key, []);
            byLemma.get(key).push(synset);
        }
    }
    return { synsets, synsetsForLemma: (lemma) => byLemma.get(lemma.toLowerCase()) || [], get: (id) => synsets.get(id) };
}

function oewnFromLock(lock) {
    const synsets = new Map();
    for (const s of lock.synsets) synsets.set(s.id, { ...s, pointers: [] });
    return oewnFromSynsets(synsets);
}

// Compares learner-facing definition text with a locked OEWN synset.
// alignment: EXACT_OEWN_DEFINITION | RAW_OEWN_GLOSS | MISMATCH. contamination is the list a record MUST declare.
// Migration reports contamination; it never repairs it.
function classifyDefinition(text, synset) {
    let alignment = 'MISMATCH';
    if (text === synset.definition) alignment = 'EXACT_OEWN_DEFINITION';
    else if (text === synset.gloss) alignment = 'RAW_OEWN_GLOSS';
    const contamination = [];
    if (alignment === 'RAW_OEWN_GLOSS' && synset.quoted_examples.length) {
        contamination.push({ kind: 'OEWN_QUOTED_EXAMPLES_IN_DEFINITION', quoted_examples: synset.quoted_examples });
    }
    if (alignment !== 'MISMATCH' && /;\s+-\s/.test(text)) contamination.push({ kind: 'OEWN_ATTRIBUTION_IN_DEFINITION' });
    return { alignment, contamination };
}

// ---------------------------------------------------------------- V1 HTML extraction (read-only)
function decodeEntities(text) {
    return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (match, entity) => {
        if (entity[0] === '#') {
            const code = entity[1] === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
            return String.fromCodePoint(code);
        }
        return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[entity];
    });
}

const V1_FIELD_CLASSES = Object.freeze({
    bangla_meaning: 'bangla-meaning',
    part_of_speech: 'part-of-speech',
    definition: 'definition',
    bangla_explanation: 'bangla-explanation',
    example_en: 'example',
    example_bn: 'bangla-example'
});

function extractV1Page(html) {
    const problems = [];
    const articles = html.match(/<article class="dictionary-answer"[^>]*>[\s\S]*?<\/article>/g) || [];
    if (articles.length !== 1) problems.push('expected exactly one article.dictionary-answer, found ' + articles.length);
    const article = articles[0] || '';
    const page = { problems };
    for (const [field, cls] of Object.entries(V1_FIELD_CLASSES)) {
        const matches = [...article.matchAll(new RegExp('<p class="' + cls + '"[^>]*>([\\s\\S]*?)</p>', 'g'))];
        if (matches.length !== 1) { problems.push('expected exactly one .' + cls + ', found ' + matches.length); page[field] = null; continue; }
        const span = /<span[^>]*>([\s\S]*?)<\/span>/.exec(matches[0][1]);
        if (!span) { problems.push('.' + cls + ' has no span'); page[field] = null; continue; }
        if (/<[a-zA-Z]/.test(span[1])) problems.push('.' + cls + ' contains nested markup');
        page[field] = decodeEntities(span[1].trim());
    }
    const h1 = [...article.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
    page.h1 = h1.length === 1 ? decodeEntities(h1[0][1].replace(/<[^>]+>/g, '').trim()) : null;
    if (h1.length !== 1) problems.push('expected exactly one h1 in article, found ' + h1.length);
    const source = /<p class="lexical-source"[^>]*>([\s\S]*?)<\/p>/.exec(article);
    page.source_line_text = source ? decodeEntities(source[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()) : null;
    page.source_line_hrefs = source ? [...source[1].matchAll(/href="([^"]+)"/g)].map((m) => m[1]) : [];
    if (!source) problems.push('missing .lexical-source');
    const title = /<title>([\s\S]*?)<\/title>/.exec(html);
    page.title = title ? decodeEntities(title[1].trim()) : null;
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html);
    page.canonical = canonical ? canonical[1] : null;
    return page;
}

// ---------------------------------------------------------------- registry and frozen sets
function loadRegistry(root = ROOT) {
    const list = readJson(path.join(root, 'data', 'approved-static-word-slugs.json'));
    if (!Array.isArray(list)) throw new Error('approved-static-word-slugs.json must be an array.');
    return new Set(list);
}

function csvWordColumn(file) {
    const lines = toLf(readText(file)).split('\n').filter(Boolean);
    const index = lines[0].split(',').indexOf('word');
    if (index < 0) throw new Error('No "word" column in ' + file);
    return lines.slice(1).map((line) => line.split(',')[index]);
}

// Frozen experiment words, derived only from tracked manifests (same sources as the R5B audit).
function loadFrozenWords(root = ROOT) {
    const frozen = new Map();
    const add = (source, words) => { for (const w of words) { if (!w) continue; if (!frozen.has(w)) frozen.set(w, new Set()); frozen.get(w).add(source); } };
    add('2E_treatment_manifest', csvWordColumn(path.join(root, 'reports', 'dictionary-seo-treatment-manifest-2e.csv')));
    add('2E_control_manifest', csvWordColumn(path.join(root, 'reports', 'dictionary-seo-control-manifest-2e.csv')));
    add('2E_baseline', csvWordColumn(path.join(root, 'reports', 'dictionary-seo-experiment-baseline-2e.csv')));
    add('R1_cohorts', csvWordColumn(path.join(root, 'reports', 'ovidhan-seo-r1-experiment-cohorts.csv')));
    add('3B_frozen_hashes', readJson(path.join(root, 'reports', 'ovidhan-learning-foundation-3b-frozen-hashes.json')).pages.map((p) => p.word));
    const pilot = readJson(path.join(root, 'data', 'seo-word-pilot-7a1.json'));
    add('7A1_pilot_treatment', pilot.entries.filter((e) => e.group === 'treatment').map((e) => e.slug));
    add('7A1_pilot_control', pilot.entries.filter((e) => e.group === 'control').map((e) => e.slug));
    const deploy = readText(path.join(root, 'deploy-production.ps1'));
    for (const name of ['pilotTreatment', 'pilotControls']) {
        const match = new RegExp('\\$' + name + '\\s*=\\s*@\\(([\\s\\S]*?)\\)').exec(deploy);
        add('deploy_' + name, match ? [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []);
    }
    add('named_extra', ['prologue', 'nevertheless', 'casual', 'nutshell', 'cheap']);
    return frozen;
}

// ---------------------------------------------------------------- tiny JSON Schema validator (draft 2020-12 subset)
function resolveRef(rootSchema, ref) {
    if (!ref.startsWith('#/')) throw new Error('Unsupported $ref: ' + ref);
    return ref.slice(2).split('/').reduce((node, key) => node[key], rootSchema);
}

function typeMatches(value, type) {
    switch (type) {
        case 'string': return typeof value === 'string';
        case 'boolean': return typeof value === 'boolean';
        case 'number': return typeof value === 'number' && Number.isFinite(value);
        case 'integer': return Number.isInteger(value);
        case 'array': return Array.isArray(value);
        case 'object': return value !== null && typeof value === 'object' && !Array.isArray(value);
        case 'null': return value === null;
        default: throw new Error('Unsupported schema type: ' + type);
    }
}

function validateSchema(value, schema, rootSchema = schema, where = '') {
    const errors = [];
    const at = where || '/';
    if (schema.$ref) return validateSchema(value, resolveRef(rootSchema, schema.$ref), rootSchema, where);
    if (schema.type) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        if (!types.some((t) => typeMatches(value, t))) return [at + ': expected ' + types.join('|')];
    }
    if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) errors.push(at + ': must equal ' + JSON.stringify(schema.const));
    if (schema.enum && !schema.enum.includes(value)) errors.push(at + ': must be one of ' + schema.enum.join(', '));
    if (typeof value === 'string') {
        if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(at + ': shorter than ' + schema.minLength);
        if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(at + ': longer than ' + schema.maxLength);
        if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push(at + ': does not match pattern ' + schema.pattern);
    }
    if (typeof value === 'number') {
        if (schema.minimum !== undefined && value < schema.minimum) errors.push(at + ': below minimum ' + schema.minimum);
        if (schema.maximum !== undefined && value > schema.maximum) errors.push(at + ': above maximum ' + schema.maximum);
    }
    if (Array.isArray(value)) {
        if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(at + ': fewer than ' + schema.minItems + ' items');
        if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(at + ': more than ' + schema.maxItems + ' items');
        if (schema.uniqueItems) {
            const seen = new Set();
            for (const item of value) { const key = JSON.stringify(sortKeys(item)); if (seen.has(key)) errors.push(at + ': duplicate item'); seen.add(key); }
        }
        if (schema.items) value.forEach((item, index) => errors.push(...validateSchema(item, schema.items, rootSchema, where + '/' + index)));
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        for (const key of schema.required || []) if (!(key in value)) errors.push(at + ': missing required property "' + key + '"');
        const properties = schema.properties || {};
        for (const key of Object.keys(value)) {
            if (key in properties) errors.push(...validateSchema(value[key], properties[key], rootSchema, where + '/' + key));
            else if (schema.additionalProperties === false) errors.push(at + ': unexpected property "' + key + '"');
        }
    }
    return errors;
}

module.exports = {
    ROOT, V2_DIR, ATTRIBUTION, POS_BY_SUFFIX, DATA_FILE_POS, V1_FIELD_CLASSES,
    sha256, sha256Lf, stripBom, toLf, readText, readJson, sortKeys, canonicalJson,
    readZipEntries, splitGloss, synsetId, parseOewnData, lexicalAntonyms,
    openOewnSource, verifyOewnSource, oewnFromSynsets, oewnFromLock, classifyDefinition,
    decodeEntities, extractV1Page, loadRegistry, loadFrozenWords, validateSchema
};
