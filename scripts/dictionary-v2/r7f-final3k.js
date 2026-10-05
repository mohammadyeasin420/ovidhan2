'use strict';
// SEO-R7F final 3k: render the frozen 420-word editorial set through the existing V2 renderer.
//
//   node scripts/dictionary-v2/r7f-final3k.js
//
// Writes dictionary-v2/r7f-final3k/<slug>.json, upgrades 416 legacy shells, creates 4 new pages,
// and appends the slugs to the approved registry.
// Does not touch sitemap.xml, the R7E records, the R7F batch 1 records, or the R7F batch 2 records.
// English definition text is the OEWN gloss of the frozen synset, as in batch 1 and batch 2.
// Bangla heads, explanations, and examples are copied from the frozen editorial file.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');
const lib = require('./lib');
const render = require('./render');

const EDITORIAL_PATH = path.join(lib.ROOT, 'research', 'SEO_R7F_FINAL3K_420_FINAL_EDITORIAL.json');
const EDITORIAL_SHA = 'ed0ebf209dc7e782f6caf995317d74e3672c361b92830ca07cad910c370dabc8';
const R7E_SELECTION = path.join(lib.ROOT, 'research', 'SEO_R7E_PILOT_SELECTION.json');
const BATCH1_SELECTION = path.join(lib.ROOT, 'research', 'SEO_R7F_BATCH1_100_SELECTION.json');
const BATCH1_EDITORIAL = path.join(lib.ROOT, 'research', 'SEO_R7F_BATCH1_97_FINAL_EDITORIAL.json');
const BATCH1_RAW = path.join(lib.ROOT, 'research', 'SEO_R7F_BATCH1_100_GROK_RAW.json');
const BATCH2_SELECTION = path.join(lib.ROOT, 'research', 'SEO_R7F_BATCH2_200_SELECTION.json');
const BATCH2_EDITORIAL = path.join(lib.ROOT, 'research', 'SEO_R7F_BATCH2_174_FINAL_EDITORIAL.json');
const AUDIT_PATH = path.join(lib.ROOT, 'research', 'SEO_R7D_UNREGISTERED_STATIC_734_AUDIT.json');
const RECORD_DIR = path.join(lib.ROOT, 'dictionary-v2', 'r7f-final3k');
const ARCHIVE = 'C:/Users/yeasi/Downloads/english-wordnet-2025.zip';
const PHRASE = 'Bengali';
const EXPECTED_HEAD = 'b3ea637a4b50a978e40f0c949cd35869402244e8';
const BUILDS = ['perusal', 'godliness', 'examinee', 'demurrage'];
const HOLDS = ['dicky', 'wired', 'demise', 'undermine', 'graduated', 'wight', 'swipe', 'dyspnea', 'merchandiser', 'madam', 'argent', 'detox', 'hours', 'circumcision', 'grazing', 'bachelor', 'urologist', 'decided', 'gypsy', 'lunatic', 'corrigendum', 'ablution', 'catholic', 'higher', 'veritable', 'weirdo', 'doomsday', 'twitter', 'hell', 'equity'];
const BATCH2_HOLDS = ['insane', 'resilience', 'redemption', 'streaming', 'atheist', 'except', 'garbage', 'banger', 'wow', 'grooming', 'personnel', 'null', 'each', 'explicit', 'such', 'snitch', 'piles', 'dumb', 'saturated', 'congress', 'ecstasy', 'intro', 'staring', 'possessed', 'stalking', 'stalker'];
const RECOVERY = new Set(['unconventional', 'reinvent', 'barbaric', 'skew', 'shouting', 'totality', 'smoothed', 'softly']);
const PREVIOUS_HOLDS = new Set(['scalability', 'disappointed', 'noticed'].concat(BATCH2_HOLDS));

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function pageClass(html) {
    const v2 = /dictionary-v2-entry-styles/.test(html);
    const article = /class="dictionary-answer"/.test(html);
    const explorer = /learning-explorer\.js/.test(html) || /Learning Explorer/.test(html);
    if (v2) return 'V2_PRODUCTION';
    if (explorer && !article && !v2) return 'LEGACY_SHELL';
    if (article) return 'STATIC_ARTICLE';
    return 'OTHER';
}

function recordFor(entry, shellHash) {
    return {
        schema_version: '1.0.0',
        record_status: 'V1_MIGRATION',
        slug: entry.slug,
        headword: entry.word,
        attribution: lib.ATTRIBUTION,
        provenance: {
            oewn: {
                release: '2025',
                archive_sha256: '38b16326159f51853626b7d24a44c453fa88ab33f06fce5ec8fc5996d1c2be93',
                provenance_file: 'dictionary-v2/oewn-2025-provenance.json'
            },
            v1_migration: {
                tool: 'scripts/dictionary-v2/r7f-final3k.js',
                batch: 'SEO-R7F-FINAL3K-420',
                action: entry.action,
                source_page: entry.action === 'BUILD' ? null : 'word/' + entry.slug + '.html',
                source_page_sha256_lf: shellHash
            }
        },
        senses: entry.senses.map((sense, index) => {
            const built = {
                sense_id: 's' + (index + 1),
                pos: sense.pos,
                source: { type: 'OEWN_2025', synset_id: sense.oewn_synset },
                definition: {
                    text: sense.oewn_definition,
                    origin: 'OEWN_GLOSS',
                    oewn_definition: sense.oewn_definition
                },
                bangla_meaning: { display: sense.head_meaning_bn, origin: 'OVIDHAN_EDITORIAL' },
                bangla_explanation: { text: sense.explanation_bn, origin: 'OVIDHAN_EDITORIAL' },
                examples: [{ en: sense.example_en, bn: sense.example_bn, origin: 'OVIDHAN_EDITORIAL' }]
            };
            if (index === 0) built.v1_primary = true;
            return built;
        })
    };
}

function visible(html, value) {
    const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    return html.includes(escaped) || html.includes(value);
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
    if (!entries || entries.length !== 420) throw new Error('editorial entries are ' + (entries ? entries.length : 0));
    if (new Set(entries.map((entry) => entry.slug)).size !== 420) throw new Error('duplicate editorial slug');
    const excluded = new Set((editorial.excluded || []).map((item) => item.slug));
    if (excluded.size !== 30) throw new Error('freeze exclusions are ' + excluded.size);
    for (const slug of HOLDS) {
        if (entries.some((entry) => entry.slug === slug)) throw new Error(slug + ' is in the production set');
        if (!excluded.has(slug)) throw new Error('freeze missing exclusion ' + slug);
    }

    const applied = new Map((editorial.corrections_applied || []).map((row) => [row.slug, row]));
    if (applied.size !== 44) throw new Error('embedded corrections are ' + applied.size);
    const pass = entries.filter((entry) => entry.qa_verdict === 'PASS_AS_IS').length;
    const corrected = entries.filter((entry) => entry.qa_verdict === 'CORRECTION_REQUIRED').length;
    if (pass !== 376 || corrected !== 44) throw new Error('qa split ' + pass + ' ' + corrected);
    for (const entry of entries) {
        if (entry.qa_verdict === 'CORRECTION_REQUIRED') {
            const row = applied.get(entry.slug);
            if (!row) throw new Error(entry.slug + ' is not in corrections_applied');
            for (const field of row.fields) {
                const sense = entry.senses.find((item) => item.order === field.sense_order);
                if (!sense || sense[field.field] !== field.value) throw new Error(entry.slug + ' missing embedded ' + field.field);
            }
        } else if (applied.has(entry.slug)) throw new Error(entry.slug + ' pass has a correction');
    }

    let learnerSenses = 0;
    const sizes = { 1: 0, 2: 0, 3: 0 };
    const pos = {};
    const action = { UPGRADE: 0, BUILD: 0 };
    for (const entry of entries) {
        if (![1, 2, 3].includes(entry.senses.length)) throw new Error(entry.slug + ' sense count ' + entry.senses.length);
        sizes[entry.senses.length]++;
        learnerSenses += entry.senses.length;
        action[entry.action] = (action[entry.action] || 0) + 1;
        const ids = entry.senses.map((sense) => sense.oewn_synset);
        if (new Set(ids).size !== ids.length) throw new Error(entry.slug + ' duplicate synset');
        for (const sense of entry.senses) pos[sense.pos] = (pos[sense.pos] || 0) + 1;
    }
    if (learnerSenses !== 537 || sizes[1] !== 305 || sizes[2] !== 113 || sizes[3] !== 2) throw new Error('sense distribution');
    if (action.UPGRADE !== 416 || action.BUILD !== 4) throw new Error('action split');
    if (entries.filter((entry) => entry.action === 'BUILD').map((entry) => entry.slug).join(',') !== BUILDS.join(',')) throw new Error('build set');
    if ((pos.noun || 0) !== 313 || (pos.verb || 0) !== 70 || (pos.adjective || 0) !== 140 || (pos.adverb || 0) !== 14) throw new Error('pos split');
    for (const slug of ['initial', 'means']) {
        const entry = entries.find((item) => item.slug === slug);
        if (!entry || entry.senses.length !== 3) throw new Error(slug + ' is not a three-sense page');
    }
    if (entries.filter((entry) => entry.senses.length === 3).map((entry) => entry.slug).join(',') !== 'initial,means') throw new Error('three-sense set');

    const r7e = JSON.parse(fs.readFileSync(R7E_SELECTION, 'utf8'));
    const r7eSet = new Set(r7e.words.map((word) => word.slug));
    const holdout = new Set(r7e.observational_holdout);
    const batch1Selection = new Set(JSON.parse(fs.readFileSync(BATCH1_SELECTION, 'utf8')).words.map((word) => word.slug));
    const batch1Live = new Set(JSON.parse(fs.readFileSync(BATCH1_EDITORIAL, 'utf8')).entries.map((entry) => entry.word));
    const batch2Selection = new Set(JSON.parse(fs.readFileSync(BATCH2_SELECTION, 'utf8')).words.map((word) => word.slug));
    const batch2Live = new Set(JSON.parse(fs.readFileSync(BATCH2_EDITORIAL, 'utf8')).entries.map((entry) => entry.slug));
    for (const row of JSON.parse(fs.readFileSync(BATCH1_RAW, 'utf8')).results) {
        if (row.status === 'HOLD') PREVIOUS_HOLDS.add(row.word);
    }
    const unreg = new Set(JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8')).pages.map((page) => page.slug));
    const registry = lib.loadRegistry();
    const frozen = lib.loadFrozenWords();
    if (registry.size !== 2645) throw new Error('approved is ' + registry.size);
    if (r7eSet.size !== 48 || batch1Live.size !== 97 || batch2Live.size !== 174 || batch2Selection.size !== 200 || frozen.size !== 186 || holdout.size !== 24) throw new Error('cohort size');

    const source = lib.openOewnSource({ archive: ARCHIVE });
    const provenance = lib.readJson(path.join(lib.ROOT, 'dictionary-v2', 'oewn-2025-provenance.json'));
    const sourceErrors = lib.verifyOewnSource(source, provenance);
    if (sourceErrors.length) throw new Error(sourceErrors.join('; '));
    const synsets = lib.parseOewnData(source.getFile);

    const planned = [];
    for (const entry of entries) {
        if (registry.has(entry.slug)) throw new Error(entry.slug + ': already approved');
        if (r7eSet.has(entry.slug)) throw new Error(entry.slug + ': R7E overlap');
        if (batch1Selection.has(entry.slug) || batch1Live.has(entry.slug)) throw new Error(entry.slug + ': R7F batch 1 overlap');
        if (batch2Selection.has(entry.slug) || batch2Live.has(entry.slug)) throw new Error(entry.slug + ': R7F batch 2 overlap');
        if (frozen.has(entry.slug)) throw new Error(entry.slug + ': frozen overlap');
        if (holdout.has(entry.slug)) throw new Error(entry.slug + ': R7E holdout overlap');
        if (PREVIOUS_HOLDS.has(entry.slug)) throw new Error(entry.slug + ': previous HOLD overlap');
        if (RECOVERY.has(entry.slug)) throw new Error(entry.slug + ': recovery overlap');
        if (unreg.has(entry.slug)) throw new Error(entry.slug + ': historical-unregistered conflict');
        const pagePath = path.join(lib.ROOT, 'word', entry.slug + '.html');
        let shellHash = null;
        if (entry.action === 'BUILD') {
            if (fs.existsSync(pagePath)) throw new Error(entry.slug + ': BUILD page already exists');
            if (entry.file_sha256) throw new Error(entry.slug + ': BUILD has a file hash');
        } else if (entry.action === 'UPGRADE') {
            if (!fs.existsSync(pagePath)) throw new Error(entry.slug + ': page missing');
            const before = fs.readFileSync(pagePath);
            if (sha256(before) !== entry.file_sha256) throw new Error(entry.slug + ': before SHA mismatch');
            const beforeHtml = before.toString('utf8');
            if (pageClass(beforeHtml) !== 'LEGACY_SHELL' || lib.isV2ProductionPage(beforeHtml)) throw new Error(entry.slug + ': not a legacy shell');
            shellHash = lib.sha256Lf(before);
        } else throw new Error(entry.slug + ': bad action');
        const enriched = {
            slug: entry.slug,
            word: entry.word,
            action: entry.action,
            senses: entry.senses.map((sense) => {
                const syn = synsets.get(sense.oewn_synset);
                if (!syn) throw new Error(entry.slug + ': synset missing ' + sense.oewn_synset);
                if (syn.pos !== sense.pos) throw new Error(entry.slug + ': OEWN POS mismatch');
                if (!syn.words.some((word) => word.toLowerCase() === entry.slug)) throw new Error(entry.slug + ': lemma mismatch ' + sense.oewn_synset);
                if (syn.definition !== sense.oewn_definition) throw new Error(entry.slug + ': gloss mismatch ' + sense.oewn_synset);
                if (!sense.head_meaning_bn || !sense.explanation_bn || !sense.example_en || !sense.example_bn) throw new Error(entry.slug + ': empty editorial field');
                const example = sense.example_en.toLowerCase();
                if (!example.includes(entry.slug)) throw new Error(entry.slug + ': example omits the headword');
                for (const quote of syn.quoted_examples || []) {
                    if (quote && example === String(quote).toLowerCase().replace(/\s+/g, ' ').trim()) throw new Error(entry.slug + ': example is an OEWN quotation');
                }
                return sense;
            })
        };
        planned.push({ entry: enriched, shellHash });
    }
    if (planned.length !== 420) throw new Error('planned ' + planned.length);

    const cohort = planned.map((item) => item.entry.slug);
    const shell = render.loadShell();
    const rendered = [];
    for (const item of planned) {
        const record = recordFor(item.entry, item.shellHash);
        const html = render.renderPage(record, { mode: 'production', shell, cohort, phrase: PHRASE });
        const problems = render.productionContractProblems(html, record, { phrase: PHRASE });
        if (problems.length) throw new Error(item.entry.slug + ': ' + problems.join('; '));
        if (html.includes('Meaning in Bangla') || html.includes('Bengali (Bangla)')) throw new Error(item.entry.slug + ': title phrase');
        if (/Grok|Cursor|qa_verdict|hold_reason|research\/SEO/.test(html)) throw new Error(item.entry.slug + ': editorial leak');
        if (item.entry.senses.length === 1) {
            if (html.includes('class="v2-jump"') || html.includes('class="v2-senses"')) throw new Error(item.entry.slug + ': one-sense page looks multi-sense');
        } else if (!html.includes('class="v2-jump"') || !html.includes(item.entry.senses.length + ' meanings')) {
            throw new Error(item.entry.slug + ': multi-sense overview missing');
        }
        for (const sense of item.entry.senses) {
            for (const value of [sense.head_meaning_bn, sense.explanation_bn, sense.example_en, sense.example_bn, sense.oewn_definition]) {
                if (!visible(html, value)) throw new Error(item.entry.slug + ': frozen text missing after render');
            }
        }
        rendered.push({ record, html });
    }

    fs.mkdirSync(RECORD_DIR, { recursive: true });
    for (const item of rendered) {
        fs.writeFileSync(path.join(RECORD_DIR, item.record.slug + '.json'), lib.canonicalJson(item.record));
        fs.writeFileSync(path.join(lib.ROOT, 'word', item.record.slug + '.html'), item.html.replace(/\n/g, '\r\n'));
    }

    const registryPath = path.join(lib.ROOT, 'data', 'approved-static-word-slugs.json');
    const registryText = fs.readFileSync(registryPath);
    const crlf = registryText.includes(13);
    let body = registryText.toString('utf8').replace(/\s*\]\s*$/, '');
    const nl = crlf ? '\r\n' : '\n';
    for (const slug of cohort) {
        if (registry.has(slug)) throw new Error(slug + ': registry already contains it');
        body += ',' + nl + '  "' + slug + '"';
    }
    body += nl + ']' + nl;
    const after = JSON.parse(body);
    if (after.length !== 3065 || new Set(after).size !== 3065) throw new Error('registry count ' + after.length);
    const previous = JSON.parse(registryText.toString('utf8'));
    if (previous.length !== 2645) throw new Error('previous registry ' + previous.length);
    for (const slug of previous) if (!after.includes(slug)) throw new Error('lost approved slug ' + slug);
    for (const slug of HOLDS) if (after.includes(slug)) throw new Error(slug + ' entered the registry');
    fs.writeFileSync(registryPath, body);
    console.log('rendered 420 R7F final 3k pages; senses ' + learnerSenses + '; registry ' + after.length);
}

if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
