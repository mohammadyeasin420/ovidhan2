'use strict';
// SEO-R6E: controlled Dictionary V2 PRODUCTION PILOT - guarded plan / apply / verify for exactly 12 existing word pages.
//
//   node scripts/dictionary-v2/r6e.js manifest [--write | --check]   the BEFORE/AFTER proof file (dictionary-v2/r6e-production-manifest.json)
//   node scripts/dictionary-v2/r6e.js plan                           full preflight, in memory, writes nothing
//   node scripts/dictionary-v2/r6e.js apply --confirm APPLY_R6E_12_V2_PILOT
//                                                                    all-or-nothing staged write of the 12 pages, verified, rolled back on failure
//   node scripts/dictionary-v2/r6e.js verify                         post-application proof (pages, scope, protected files, SEO contract)
//
// The pages are produced by scripts/dictionary-v2/render.js (renderProductionPage) from dictionary-v2/records/<slug>.json;
// this file only decides WHETHER and WHERE they may be written. No fuzzy matching, no globbing, no fallback word: the
// allowlist is the literal 12-word list in render.js. A page is only ever overwritten while it still equals its audited V1
// baseline page; once it equals the expected V2 production page a second apply is refused.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('./lib');
const r6c = require('./r6c');
const render = require('./render');
const { loadContext, validateRecord } = require('./validate');

const MANIFEST_REF = 'dictionary-v2/r6e-production-manifest.json';
const MANIFEST_SCHEMA = 'ovidhan.dictionary-v2.r6e-production-manifest/1';
const APPLY_CONFIRMATION = 'APPLY_R6E_12_V2_PILOT';
const STAGING_SUFFIX = '.r6e-staging';
const ALLOWLIST = render.PRODUCTION_COHORT;
const EXPECTED_SENSES = 31;
const EXPECTED_PAGE_COUNT = 12;

const hashLf = (text) => lib.sha256(Buffer.from(lib.toLf(text), 'utf8'));
const eolOf = (text) => (text.includes('\r\n') ? 'CRLF' : 'LF');
const withEol = (lf, eol) => (eol === 'CRLF' ? lf.replace(/\n/g, '\r\n') : lf);

function git(root, args, { allowFail = false } = {}) {
    try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 27 }); } catch (error) { if (allowFail) return null; throw error; }
}
const gitLines = (root, args) => git(root, args).split('\n').map((s) => s.trim()).filter(Boolean);

// Paths that no R6E command may ever change (word/ is governed separately: exactly the 12 allowlisted pages).
const PROTECTED = [
    /^data\//, /^sitemap[^/]*$/, /^robots\.txt$/, /^deploy-production\.ps1$/, /^dictionary[^/]*\.html$/, /^dictionary\//, /^learning-explorer\.js$/,
    /^styles\.css$/, /^_headers$/, /^_redirects$/, /^index\.html$/, /^reports\//,
    /^dictionary-v2\/records\//, /^dictionary-v2\/r6c-editorial-/, /^dictionary-v2\/oewn-2025-/, /^dictionary-v2\/dictionary-v2\.schema\.json$/,
    /^dictionary-v2\/definition-cleanup-manifest\.json$/, /^dictionary-v2\/prototype-cohort\.json$/, /^dictionary-v2\/previews\//
];

// ------------------------------------------------------------------ V1 baseline invariants
// What a production V1 page must look like before it may be replaced: the exact shared shell, one self canonical, the two
// JSON-LD blocks, one H1, one explorer and no hidden hook. Anything else means the page carries something the V2 page would drop.
function v1BaselineProblems(html, slug, shellPins = render.SHELL) {
    const problems = [];
    const need = (condition, message) => { if (!condition) problems.push(slug + ': ' + message); };
    const count = (re) => (html.match(re) || []).length;
    const shell = render.extractShell(html);
    need(Boolean(shell), 'shared header/footer shell markers present');
    if (shell) {
        const h = render.shellHashes(shell);
        need(h.header === shellPins.headerSha256, 'header shell equals the pinned production shell');
        need(h.footer === shellPins.footerSha256, 'footer shell equals the pinned production shell');
    }
    need(count(/<link rel="canonical" href="https:\/\/ovidhan\.net\/word\/[^"]+\.html">/g) === 1 && html.includes('<link rel="canonical" href="https://ovidhan.net/word/' + slug + '.html">'), 'exactly one self canonical');
    need(count(/<script type="application\/ld\+json">/g) === 2, 'exactly two JSON-LD blocks');
    need(count(/<h1\b/g) === 1 && html.includes('<h1>' + slug + ' meaning in Bangla</h1>'), 'one H1 "' + slug + ' meaning in Bangla"');
    need(count(/<article class="dictionary-answer"/g) === 1, 'one V1 answer article');
    need(count(/class="explorer-container"/g) === 1 && html.includes('id="wordInput"') && html.includes('value="' + slug + '"') && count(/learning-explorer\.js/g) === 1, 'one Learning Explorer for this word');
    need(!/staticWordContent|ovidhan-word-data|noindex|nofollow/.test(html), 'no explorer hook, embedded data or robots directive');
    need(!lib.isV2ProductionPage(html), 'is still a V1 page');
    return problems;
}

// ------------------------------------------------------------------ plan (pure: no writes)
// io: { readRaw(slug) } supplies the live page bytes as text (injectable for tests).
function makeFsReader(root) { return { readRaw: (slug) => fs.readFileSync(path.join(root, 'word', slug + '.html'), 'utf8') }; }

function v1BaselinePage(root, slug) {
    const blob = git(root, ['show', lib.V1_BASELINE_COMMIT + ':word/' + slug + '.html'], { allowFail: true });
    if (blob === null) throw new Error(slug + ': V1 baseline page is not readable from git at ' + lib.V1_BASELINE_COMMIT.slice(0, 10));
    return blob;
}

function buildManifest({ root = lib.ROOT, records, shell }) {
    const pages = ALLOWLIST.map((slug) => {
        const record = records.get(slug);
        const after = render.renderProductionPage(record, { shell });
        return {
            slug,
            path: render.productionPath(slug),
            record: 'dictionary-v2/records/' + slug + '.json',
            record_sha256_lf: hashLf(fs.readFileSync(path.join(root, 'dictionary-v2', 'records', slug + '.json'), 'utf8')),
            senses: record.senses.length,
            v1_before_sha256_lf: hashLf(v1BaselinePage(root, slug)),
            v2_after_sha256_lf: lib.sha256(Buffer.from(after, 'utf8'))
        };
    });
    return {
        schema: MANIFEST_SCHEMA,
        phase: 'SEO-R6E',
        description: 'BEFORE/AFTER proof for the 12-word Dictionary V2 production pilot. BEFORE = the V1 page at v1_baseline_commit; AFTER = the page rendered by scripts/dictionary-v2/render.js (production mode) from the listed record. Hashes are SHA-256 of the LF-normalised page.',
        allowlist: [...ALLOWLIST],
        v1_baseline_commit: lib.V1_BASELINE_COMMIT,
        renderer: { name: 'scripts/dictionary-v2/render.js', version: render.RENDERER_VERSION, mode: 'production', shell_source: render.SHELL.source, shell_header_sha256: render.SHELL.headerSha256, shell_footer_sha256: render.SHELL.footerSha256 },
        apply_confirmation: APPLY_CONFIRMATION,
        totals: { pages: pages.length, senses: pages.reduce((n, p) => n + p.senses, 0) },
        pages
    };
}

function loadManifest(root = lib.ROOT) { return lib.readJson(path.join(root, MANIFEST_REF)); }

// Full preflight. Returns { ok, errors, checks, pages, manifest }. Nothing is written.
function plan({ root = lib.ROOT, reader = makeFsReader(root), ctx = loadContext({ root }), records = r6c.loadRecords(ctx.v2), expectBefore = true, checkGit = true } = {}) {
    const errors = [];
    const checks = {};
    const fail = (message) => errors.push(message);
    const record = (name, ok, detail) => { checks[name] = { ok, detail }; if (!ok) fail(name + ': ' + detail); };

    // A. exact allowlist
    const literal = ['swarm', 'good', 'chaos', 'designation', 'introvert', 'tough', 'savage', 'repeat', 'crush', 'guess', 'potential', 'waist'];
    record('allowlist_exact_12', JSON.stringify([...ALLOWLIST]) === JSON.stringify(literal) && ALLOWLIST.length === EXPECTED_PAGE_COUNT && new Set(ALLOWLIST).size === EXPECTED_PAGE_COUNT, 'the renderer allowlist is the literal 12-word R6E list');
    record('allowlist_equals_r6c_cohort', JSON.stringify([...render.COHORT]) === JSON.stringify(literal) && JSON.stringify([...require('./r6c-enrich').COHORT]) === JSON.stringify(literal), 'allowlist equals the R6C editorial cohort and the R6D preview cohort');

    // B. registry, frozen and records
    const frozen = ctx.frozen;
    const collisions = ALLOWLIST.filter((slug) => frozen.has(slug));
    record('zero_frozen_collisions', collisions.length === 0, collisions.length ? 'frozen collisions: ' + collisions.join(', ') : 'none of the 12 is in any frozen experiment/pilot/named manifest (' + frozen.size + ' frozen words checked)');
    const unapproved = ALLOWLIST.filter((slug) => !ctx.registry.has(slug));
    record('all_in_approved_registry', unapproved.length === 0, unapproved.length ? 'not in the approved registry: ' + unapproved.join(', ') : 'all 12 are in data/approved-static-word-slugs.json');
    const recordErrors = [];
    for (const slug of ALLOWLIST) {
        const rec = records.get(slug);
        if (!rec) { recordErrors.push(slug + ': record missing'); continue; }
        for (const e of validateRecord(rec, ctx)) recordErrors.push(slug + ': ' + e);
    }
    record('records_valid', recordErrors.length === 0, recordErrors.length ? recordErrors.slice(0, 3).join(' | ') : 'all 12 V2 records validate');

    // C. renderer (in memory) + contract
    let shell = null; let rendered = new Map();
    try {
        shell = render.loadShell(root);
        for (const slug of ALLOWLIST) rendered.set(slug, render.renderProductionPage(records.get(slug), { shell }));
        const again = ALLOWLIST.map((slug) => render.renderProductionPage(records.get(slug), { shell }));
        record('render_deterministic', ALLOWLIST.every((slug, i) => again[i] === rendered.get(slug)), 'two renders are byte-identical');
        record('seo_static_schema_contract', true, 'all 12 pages satisfy the production contract (canonical, title, H1, static answer, senses, explorer, JSON-LD)');
    } catch (error) {
        record('render', false, error.message);
        rendered = new Map();
    }
    const senseTotal = ALLOWLIST.reduce((n, slug) => n + (records.get(slug) ? records.get(slug).senses.length : 0), 0);
    record('sense_total_31', senseTotal === EXPECTED_SENSES, 'total rendered senses = ' + senseTotal);

    // D. current pages: BEFORE hash state of every page
    const pages = [];
    let manifest = null;
    try { manifest = loadManifest(root); } catch (error) { record('manifest_present', false, MANIFEST_REF + ' is missing or unreadable'); }
    if (manifest) {
        record('manifest_shape', manifest.schema === MANIFEST_SCHEMA && manifest.pages.length === EXPECTED_PAGE_COUNT && JSON.stringify(manifest.allowlist) === JSON.stringify(literal) && manifest.totals.senses === EXPECTED_SENSES, 'manifest lists exactly the 12 allowlisted pages and 31 senses');
        if (rendered.size === EXPECTED_PAGE_COUNT) {
            let fresh = null;
            try { fresh = buildManifest({ root, records, shell }); } catch (error) { record('manifest_current', false, error.message); }
            if (fresh) record('manifest_current', lib.canonicalJson(fresh) === lib.canonicalJson(manifest), 'the committed manifest equals the manifest derived from the baseline pages, the records and the renderer');
        }
    }
    const baselineProblems = [];
    for (const slug of ALLOWLIST) {
        let raw;
        try { raw = reader.readRaw(slug); } catch (error) { fail(slug + ': live page cannot be read'); continue; }
        const after = rendered.get(slug);
        const expectedRaw = after ? withEol(after, eolOf(raw)) : null;
        const entry = manifest && manifest.pages.find((p) => p.slug === slug);
        const liveHash = hashLf(raw);
        let state = 'MISMATCH';
        if (entry && liveHash === entry.v1_before_sha256_lf) state = 'V1_BASELINE';
        else if (entry && after && raw === expectedRaw && liveHash === entry.v2_after_sha256_lf) state = 'V2_APPLIED';
        if (state === 'V1_BASELINE') for (const p of v1BaselineProblems(raw, slug)) baselineProblems.push(p);
        pages.push({ slug, state, eol: eolOf(raw), before_sha256_lf: liveHash, expected_after_sha256_lf: entry ? entry.v2_after_sha256_lf : null, raw, expectedRaw, after });
    }
    const states = new Set(pages.map((p) => p.state));
    record('before_hashes_locked', pages.length === EXPECTED_PAGE_COUNT && !states.has('MISMATCH'), 'every one of the 12 live pages is exactly its audited V1 baseline (' + pages.filter((p) => p.state === 'V1_BASELINE').length + ') or exactly its V2 production page (' + pages.filter((p) => p.state === 'V2_APPLIED').length + ')' + (states.has('MISMATCH') ? '; mismatching: ' + pages.filter((p) => p.state === 'MISMATCH').map((p) => p.slug).join(', ') : ''));
    record('v1_baseline_invariants', baselineProblems.length === 0, baselineProblems.length ? baselineProblems.slice(0, 3).join(' | ') : 'every V1 baseline page has the shared shell, one self canonical, two JSON-LD blocks, one H1 and one explorer');
    const mixed = states.size > 1;
    if (mixed) fail('mixed state: ' + pages.map((p) => p.slug + '=' + p.state).join(', '));
    const state = pages.length === EXPECTED_PAGE_COUNT && states.size === 1 ? [...states][0] : 'INCONSISTENT';
    if (expectBefore && state === 'V2_APPLIED') fail('ALREADY_APPLIED: all 12 pages already equal their expected V2 production output; a second application is prohibited');
    if (expectBefore && state !== 'V1_BASELINE' && state !== 'V2_APPLIED' && !mixed) fail('state ' + state + ' is not the V1 baseline');

    // E. scope: exactly these 12 word files would change
    const wouldChange = pages.filter((p) => p.state === 'V1_BASELINE' && p.expectedRaw !== null && p.expectedRaw !== p.raw).map((p) => render.productionPath(p.slug)).sort();
    record('scope_exactly_12_word_files', state === 'V1_BASELINE' ? JSON.stringify(wouldChange) === JSON.stringify(ALLOWLIST.map((s) => render.productionPath(s)).sort()) : state === 'V2_APPLIED', state === 'V1_BASELINE' ? 'applying changes exactly: ' + wouldChange.length + ' word files, all on the allowlist' : 'nothing left to change (' + state + ')');

    // F. repository invariants (git)
    if (checkGit) {
        const head = git(root, ['rev-parse', 'HEAD']).trim();
        const ancestor = git(root, ['merge-base', '--is-ancestor', lib.V1_BASELINE_COMMIT, 'HEAD'], { allowFail: true }) !== null;
        record('baseline_is_ancestor_of_head', ancestor, 'HEAD ' + head.slice(0, 10) + (ancestor ? ' contains' : ' does NOT contain') + ' the V1 baseline commit ' + lib.V1_BASELINE_COMMIT.slice(0, 10));
        const dirty = gitLines(root, ['status', '--porcelain=v1', '--untracked-files=no']).map((l) => l.slice(3).replace(/"/g, '')).filter((p) => (p.startsWith('word/') && !(state === 'V2_APPLIED' && ALLOWLIST.map((s) => 'word/' + s + '.html').includes(p))) || PROTECTED.some((re) => re.test(p)));
        record('protected_files_clean', dirty.length === 0, dirty.length ? 'protected/other word files modified: ' + dirty.slice(0, 5).join(', ') : 'no protected file or non-allowlisted word page is modified');
    }
    return { ok: errors.length === 0, errors: [...new Set(errors)], checks, state, pages, manifest, rendered };
}

// ------------------------------------------------------------------ apply (staged, verified, rolled back on failure)
function makeFsIo(wordDir) {
    const target = (slug) => path.join(wordDir, slug + '.html');
    const staging = (slug) => target(slug) + STAGING_SUFFIX;
    return {
        read(slug) { return fs.readFileSync(target(slug), 'utf8'); },
        stage(slug, text) { fs.writeFileSync(staging(slug), text, { encoding: 'utf8', flag: 'wx' }); },
        readStaged(slug) { return fs.readFileSync(staging(slug), 'utf8'); },
        commit(slug) { fs.renameSync(staging(slug), target(slug)); },
        discard(slug) { fs.rmSync(staging(slug), { force: true }); },
        restore(slug, text) { fs.writeFileSync(target(slug), text, 'utf8'); },
        listStale() { return fs.readdirSync(wordDir).filter((f) => f.endsWith(STAGING_SUFFIX)); }
    };
}

function applyPlanned(planned, io) {
    const outcome = { ok: false, written: [], failed: [], rolled_back: [], unrestored: [], errors: [] };
    if (!planned.ok || planned.state !== 'V1_BASELINE') { outcome.errors.push('refusing to write: preflight did not pass'); return outcome; }
    const items = planned.pages;
    if (items.length !== EXPECTED_PAGE_COUNT || items.some((p) => p.state !== 'V1_BASELINE' || !p.expectedRaw)) { outcome.errors.push('refusing to write: not exactly 12 V1 baseline pages'); return outcome; }
    const discardAll = () => { for (const p of items) { try { io.discard(p.slug); } catch { /* reported by listStale */ } } };
    try {
        for (const p of items) io.stage(p.slug, p.expectedRaw);
        for (const p of items) if (io.readStaged(p.slug) !== p.expectedRaw) outcome.errors.push(p.slug + ': staged output does not equal the expected V2 page');
        if (outcome.errors.length) { discardAll(); outcome.failed = items.map((p) => p.slug); return outcome; }
    } catch (error) { outcome.errors.push('staging failed before any page was written: ' + error.message); discardAll(); return outcome; }
    const committed = []; let writeError = null;
    for (const p of items) { try { io.commit(p.slug); committed.push(p.slug); } catch (error) { writeError = p.slug + ': commit failed: ' + error.message; break; } }
    const mismatched = [];
    if (!writeError) for (const p of items) { let now = null; try { now = io.read(p.slug); } catch { now = null; } if (now !== p.expectedRaw) mismatched.push(p.slug); }
    if (!writeError && !mismatched.length) { discardAll(); outcome.ok = true; outcome.written = items.map((p) => p.slug); return outcome; }
    if (writeError) outcome.errors.push(writeError);
    if (mismatched.length) outcome.errors.push('post-write verification failed for: ' + mismatched.join(', '));
    outcome.failed = writeError ? [writeError.split(':')[0]] : mismatched;
    const touched = new Set([...committed, ...mismatched]);
    for (const p of items) {
        if (!touched.has(p.slug)) continue;
        try { io.restore(p.slug, p.raw); if (io.read(p.slug) === p.raw) outcome.rolled_back.push(p.slug); else outcome.unrestored.push(p.slug); } catch { outcome.unrestored.push(p.slug); }
    }
    discardAll();
    if (outcome.unrestored.length) outcome.errors.push('ROLLBACK INCOMPLETE; restore from git: ' + outcome.unrestored.join(', '));
    return outcome;
}

// ------------------------------------------------------------------ verify (post-application proof)
function verify({ root = lib.ROOT } = {}) {
    const errors = [];
    const planned = plan({ root, expectBefore: false });
    for (const e of planned.errors) errors.push(e);
    if (planned.state !== 'V2_APPLIED') errors.push('the 12 pages are not at the expected V2 production output (state ' + planned.state + ')');
    const baseline = lib.V1_BASELINE_COMMIT;
    const changedWord = gitLines(root, ['diff', '--name-only', baseline, '--', 'word']).sort();
    const expectedWord = ALLOWLIST.map((s) => 'word/' + s + '.html').sort();
    if (JSON.stringify(changedWord) !== JSON.stringify(expectedWord)) errors.push('changed word pages differ from the allowlist: ' + changedWord.join(', '));
    const untrackedWord = gitLines(root, ['ls-files', '--others', '--exclude-standard', '--', 'word']);
    if (untrackedWord.length) errors.push('untracked files in word/: ' + untrackedWord.join(', '));
    const changedAll = gitLines(root, ['diff', '--name-only', baseline]);
    const protectedChanged = changedAll.filter((p) => PROTECTED.some((re) => re.test(p)));
    if (protectedChanged.length) errors.push('protected files changed: ' + protectedChanged.join(', '));
    // every live page re-checked against the production contract, read straight from disk
    const records = r6c.loadRecords(path.join(root, 'dictionary-v2'));
    for (const slug of ALLOWLIST) {
        const html = lib.toLf(fs.readFileSync(path.join(root, 'word', slug + '.html'), 'utf8'));
        for (const p of render.productionContractProblems(html, records.get(slug))) errors.push(slug + ': ' + p);
        if (!lib.isV2ProductionPage(html)) errors.push(slug + ': live page is not a V2 production page');
    }
    return { ok: errors.length === 0, errors: [...new Set(errors)], changed_word_pages: changedWord, protected_changed: protectedChanged, state: planned.state, checks: planned.checks };
}

// ------------------------------------------------------------------ CLI
function printPlan(p) {
    console.log('R6E PLAN: state ' + p.state + ', ' + (p.ok ? 'PREFLIGHT PASS' : 'PREFLIGHT FAIL'));
    for (const [name, c] of Object.entries(p.checks)) console.log('  ' + (c.ok ? 'PASS' : 'FAIL') + '  ' + name + ' - ' + c.detail);
    for (const e of p.errors) if (!Object.values(p.checks).some((c) => !c.ok && e.includes(c.detail))) console.log('  ERROR ' + e);
    for (const page of p.pages) console.log('  ' + page.slug.padEnd(12) + page.state.padEnd(13) + page.eol + '  before ' + page.before_sha256_lf.slice(0, 12) + '  after ' + (page.expected_after_sha256_lf || '-').slice(0, 12));
}

function main() {
    const argv = process.argv.slice(2);
    const command = argv.shift();
    const args = { write: false, check: false, confirm: null };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--write') args.write = true;
        else if (argv[i] === '--check') args.check = true;
        else if (argv[i] === '--confirm') args.confirm = argv[++i];
        else throw new Error('Unknown argument: ' + argv[i] + ' (no word, glob or path arguments are accepted)');
    }
    const root = lib.ROOT;
    if (command === 'manifest') {
        const ctx = loadContext({ root });
        const records = r6c.loadRecords(ctx.v2);
        const text = lib.canonicalJson(buildManifest({ root, records, shell: render.loadShell(root) }));
        const target = path.join(root, MANIFEST_REF);
        if (args.check) {
            const existing = fs.existsSync(target) ? lib.toLf(fs.readFileSync(target, 'utf8')) : null;
            if (existing !== text) { console.error('R6E manifest differs from the one derived from the baseline pages, records and renderer.'); process.exit(1); }
            console.log('R6E manifest OK: byte-identical to the derived manifest (' + EXPECTED_PAGE_COUNT + ' pages, ' + EXPECTED_SENSES + ' senses).');
        } else if (args.write) { fs.writeFileSync(target, text, 'utf8'); console.log('Wrote ' + MANIFEST_REF + '.'); }
        else process.stdout.write(text);
    } else if (command === 'plan') {
        const p = plan({ root, expectBefore: false });
        printPlan(p);
        if (!p.ok) process.exit(1);
    } else if (command === 'apply') {
        if (args.confirm !== APPLY_CONFIRMATION) throw new Error('apply requires --confirm ' + APPLY_CONFIRMATION + ' (nothing was written)');
        const p = plan({ root, expectBefore: true });
        printPlan(p);
        if (!p.ok) throw new Error('preflight failed; nothing was written');
        const io = makeFsIo(path.join(root, 'word'));
        if (io.listStale().length) throw new Error('stale staging files present: ' + io.listStale().join(', '));
        const outcome = applyPlanned(p, io);
        if (!outcome.ok) { console.error('R6E APPLY FAILED'); for (const e of outcome.errors) console.error('  - ' + e); console.error('  rolled back: ' + outcome.rolled_back.join(', ')); process.exit(1); }
        const v = verify({ root });
        if (!v.ok) { console.error('R6E POST-APPLY VERIFICATION FAILED'); for (const e of v.errors) console.error('  - ' + e); process.exit(1); }
        console.log('R6E APPLIED: ' + outcome.written.length + ' word pages written atomically and verified: ' + outcome.written.join(', '));
    } else if (command === 'verify') {
        const v = verify({ root });
        if (!v.ok) { console.error('R6E VERIFY FAILED'); for (const e of v.errors) console.error('  - ' + e); process.exit(1); }
        console.log('R6E VERIFIED: 12 pages at the expected V2 production output; changed word pages = exactly the allowlist; protected files unchanged.');
    } else {
        throw new Error('Usage: r6e.js manifest|plan|apply|verify (see header)');
    }
}

module.exports = {
    MANIFEST_REF, MANIFEST_SCHEMA, APPLY_CONFIRMATION, STAGING_SUFFIX, ALLOWLIST, PROTECTED, EXPECTED_SENSES, EXPECTED_PAGE_COUNT,
    hashLf, eolOf, withEol, v1BaselineProblems, v1BaselinePage, buildManifest, loadManifest, plan, makeFsIo, makeFsReader, applyPlanned, verify
};
if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
