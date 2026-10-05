'use strict';
// SEO-R7F-100E: render the frozen 97-word batch through the existing V2 renderer.
//
//   node scripts/dictionary-v2/r7f-b1.js
//
// Writes dictionary-v2/r7f-b1/<slug>.json, replaces those 97 legacy shells,
// and appends the slugs to the approved registry.
// Does not touch sitemap.xml, the R7E records, or the historical 2374 pages.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');
const lib = require('./lib');
const render = require('./render');

const EDITORIAL_PATH = path.join(lib.ROOT, 'research', 'SEO_R7F_BATCH1_97_FINAL_EDITORIAL.json');
const EDITORIAL_SHA = '5e8334b738d22421ae37beefaeb81306d87ee44fca6d9bbcbe695797669b4dcd';
const SELECTION_PATH = path.join(lib.ROOT, 'research', 'SEO_R7F_BATCH1_100_SELECTION.json');
const R7E_SELECTION = path.join(lib.ROOT, 'research', 'SEO_R7E_PILOT_SELECTION.json');
const AUDIT_PATH = path.join(lib.ROOT, 'research', 'SEO_R7D_UNREGISTERED_STATIC_734_AUDIT.json');
const RECORD_DIR = path.join(lib.ROOT, 'dictionary-v2', 'r7f-b1');
const ARCHIVE = 'C:/Users/yeasi/Downloads/english-wordnet-2025.zip';
const PHRASE = 'Bengali';
const EXPECTED_HEAD = 'eb54cede44cb94a1721695a7348f1182e368c0ed';
const EXCLUDED = ['scalability', 'disappointed', 'noticed'];
const FROZEN_STRINGS = {
    integer: { example_bn: 'ঋণাত্মক তিন একটি পূর্ণসংখ্যা, কিন্তু অর্ধেক নয়।' },
    persuasive: { head_meaning_bn: 'বিশ্বাস জাগাতে সক্ষম' },
    majesty: {
        head_meaning_bn: 'বিশালত্ব',
        example_bn: 'ভরা জোয়ারে পদ্মার বিশালত্ব যাত্রীদের চুপ করিয়ে দিল।'
    },
    autumn: {
        head_meaning_bn: 'পাতাঝরার ঋতু',
        example_bn: 'পাতাঝরার মৌসুমে স্কুলের উঠোনে শুকনো পাতা জমল।'
    },
    desired: { example_bn: 'জানালার ধারের কাঙ্ক্ষিত আসনটি আগেই অন্য কেউ নিয়ে নিয়েছিল।' }
};

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function recordFor(entry, selection, shellHash) {
    return {
        schema_version: '1.0.0',
        record_status: 'V1_MIGRATION',
        slug: entry.word,
        headword: entry.word,
        attribution: lib.ATTRIBUTION,
        provenance: {
            oewn: {
                release: '2025',
                archive_sha256: '38b16326159f51853626b7d24a44c453fa88ab33f06fce5ec8fc5996d1c2be93',
                provenance_file: 'dictionary-v2/oewn-2025-provenance.json'
            },
            v1_migration: {
                tool: 'scripts/dictionary-v2/r7f-b1.js',
                batch: 'SEO-R7F-100E',
                source_page: 'word/' + entry.word + '.html',
                source_page_sha256_lf: shellHash
            }
        },
        senses: [{
            sense_id: 's1',
            pos: entry.pos,
            v1_primary: true,
            source: { type: 'OEWN_2025', synset_id: entry.oewn_synset },
            definition: {
                text: selection.oewn_definition,
                origin: 'OEWN_GLOSS',
                oewn_definition: selection.oewn_definition
            },
            bangla_meaning: { display: entry.head_meaning_bn, origin: 'OVIDHAN_EDITORIAL' },
            bangla_explanation: { text: entry.explanation_bn, origin: 'OVIDHAN_EDITORIAL' },
            examples: [{ en: entry.example_en, bn: entry.example_bn, origin: 'OVIDHAN_EDITORIAL' }]
        }]
    };
}

function main() {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: lib.ROOT }).toString().trim();
    const head = execSync('git rev-parse HEAD', { cwd: lib.ROOT }).toString().trim();
    if (branch !== 'main') throw new Error('branch is ' + branch);
    if (head !== EXPECTED_HEAD) throw new Error('HEAD is ' + head);
    const dirty = execSync('git status --porcelain', { cwd: lib.ROOT }).toString().split(/\r?\n/).filter(Boolean)
        .filter((line) => !line.startsWith('??'));
    if (dirty.length) throw new Error('tracked production tree is dirty:\n' + dirty.join('\n'));

    const editorialRaw = fs.readFileSync(EDITORIAL_PATH);
    if (sha256(editorialRaw) !== EDITORIAL_SHA) throw new Error('editorial SHA mismatch');
    const editorial = JSON.parse(editorialRaw.toString('utf8'));
    const entries = editorial.entries;
    if (!entries || entries.length !== 97) throw new Error('editorial entries are ' + (entries ? entries.length : 0));
    if (entries.some((entry) => entry.status !== 'PASS')) throw new Error('a non-PASS entry is in the production set');
    for (const slug of EXCLUDED) {
        if (entries.some((entry) => entry.word === slug)) throw new Error(slug + ' is in the production set');
    }
    if (new Set(entries.map((entry) => entry.word)).size !== 97) throw new Error('duplicate editorial word');

    const selection = JSON.parse(fs.readFileSync(SELECTION_PATH, 'utf8'));
    const selected = new Map(selection.words.map((word) => [word.slug, word]));
    const r7e = JSON.parse(fs.readFileSync(R7E_SELECTION, 'utf8'));
    const r7eSet = new Set(r7e.words.map((word) => word.slug));
    const holdout = new Set(r7e.observational_holdout);
    const unreg = new Set(JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8')).pages.map((page) => page.slug));
    const registry = lib.loadRegistry();
    const frozen = lib.loadFrozenWords();
    if (registry.size !== 2374) throw new Error('approved is ' + registry.size);
    if (r7eSet.size !== 48) throw new Error('R7E is ' + r7eSet.size);
    if (frozen.size !== 186) throw new Error('frozen is ' + frozen.size);

    const source = lib.openOewnSource({ archive: ARCHIVE });
    const provenance = lib.readJson(path.join(lib.ROOT, 'dictionary-v2', 'oewn-2025-provenance.json'));
    const sourceErrors = lib.verifyOewnSource(source, provenance);
    if (sourceErrors.length) throw new Error(sourceErrors.join('; '));
    const synsets = lib.parseOewnData(source.getFile);

    const planned = [];
    for (const entry of entries) {
        const row = selected.get(entry.word);
        if (!row) throw new Error(entry.word + ': not in the selection');
        if (row.action !== 'UPGRADE') throw new Error(entry.word + ': not an upgrade');
        if (row.pos !== entry.pos) throw new Error(entry.word + ': POS mismatch');
        if (row.oewn_synset !== entry.oewn_synset) throw new Error(entry.word + ': synset mismatch');
        if (registry.has(entry.word)) throw new Error(entry.word + ': already approved');
        if (r7eSet.has(entry.word)) throw new Error(entry.word + ': R7E overlap');
        if (frozen.has(entry.word)) throw new Error(entry.word + ': frozen overlap');
        if (holdout.has(entry.word)) throw new Error(entry.word + ': R7E holdout overlap');
        if (unreg.has(entry.word)) throw new Error(entry.word + ': historical-unregistered conflict');
        const pagePath = path.join(lib.ROOT, 'word', entry.word + '.html');
        if (!fs.existsSync(pagePath)) throw new Error(entry.word + ': page missing');
        const before = fs.readFileSync(pagePath);
        if (sha256(before) !== row.file_sha256) throw new Error(entry.word + ': before SHA mismatch');
        if (lib.isV2ProductionPage(before.toString('utf8'))) throw new Error(entry.word + ': already a V2 page');
        const syn = synsets.get(entry.oewn_synset);
        if (!syn) throw new Error(entry.word + ': synset missing from OEWN');
        if (syn.definition.replace(/\s+/g, ' ').trim() !== row.oewn_definition) throw new Error(entry.word + ': gloss mismatch');
        if (syn.pos !== entry.pos) throw new Error(entry.word + ': OEWN POS mismatch');
        if (!entry.head_meaning_bn || !entry.explanation_bn || !entry.example_en || !entry.example_bn) throw new Error(entry.word + ': empty editorial field');
        const lower = entry.example_en.toLowerCase();
        if (!lower.includes(entry.word)) throw new Error(entry.word + ': example omits the headword');
        for (const quote of syn.quoted_examples || []) {
            if (quote && lower.includes(String(quote).toLowerCase())) throw new Error(entry.word + ': copies an OEWN example');
        }
        const locked = FROZEN_STRINGS[entry.word];
        if (locked) {
            for (const [key, value] of Object.entries(locked)) {
                if (entry[key] !== value) throw new Error(entry.word + ': frozen ' + key + ' mismatch');
            }
        }
        planned.push({ entry, row, shellHash: lib.sha256Lf(before) });
    }
    if (planned.length !== 97) throw new Error('planned ' + planned.length);

    fs.mkdirSync(RECORD_DIR, { recursive: true });
    const cohort = planned.map((item) => item.entry.word);
    for (const item of planned) {
        const recordPath = path.join(RECORD_DIR, item.entry.word + '.json');
        fs.writeFileSync(recordPath, lib.canonicalJson(recordFor(item.entry, item.row, item.shellHash)));
    }

    const shell = render.loadShell();
    for (const slug of cohort) {
        const record = lib.readJson(path.join(RECORD_DIR, slug + '.json'));
        if (record.slug !== slug || record.senses.length !== 1) throw new Error(slug + ': record shape');
        const html = render.renderPage(record, { mode: 'production', shell, cohort, phrase: PHRASE });
        const problems = render.productionContractProblems(html, record, { phrase: PHRASE });
        if (problems.length) throw new Error(slug + ': ' + problems.join('; '));
        if (html.includes('Meaning in Bangla') || html.includes('Bengali (Bangla)')) throw new Error(slug + ': title phrase');
        const locked = FROZEN_STRINGS[slug];
        if (locked) {
            for (const value of Object.values(locked)) {
                if (!html.includes(value)) throw new Error(slug + ': frozen string missing after render');
            }
        }
        fs.writeFileSync(path.join(lib.ROOT, 'word', slug + '.html'), html.replace(/\n/g, '\r\n'));
    }

    const registryPath = path.join(lib.ROOT, 'data', 'approved-static-word-slugs.json');
    const registryText = fs.readFileSync(registryPath);
    const crlf = registryText.includes(13);
    let body = registryText.toString('utf8').replace(/\s*\]\s*$/, '');
    const nl = crlf ? '\r\n' : '\n';
    let added = 0;
    for (const slug of cohort) {
        if (registry.has(slug)) throw new Error(slug + ': registry already contains it');
        body += ',' + nl + '  "' + slug + '"';
        added++;
    }
    body += nl + ']' + nl;
    const after = JSON.parse(body);
    if (after.length !== 2471 || new Set(after).size !== 2471) throw new Error('registry count ' + after.length);
    const previous = JSON.parse(registryText.toString('utf8'));
    if (previous.length !== 2374) throw new Error('previous registry ' + previous.length);
    for (const slug of previous) if (!after.includes(slug)) throw new Error('lost approved slug ' + slug);
    for (const slug of EXCLUDED) if (after.includes(slug)) throw new Error(slug + ' entered the registry');
    fs.writeFileSync(registryPath, body);
    console.log('rendered 97 R7F pages; registry appended ' + added + '; approved ' + after.length);
}

if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
