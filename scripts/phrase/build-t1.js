'use strict';
// Build Phrase T1 pages from reviewed records.
//
//   node scripts/phrase/build-t1.js --slug mind-it
//   node scripts/phrase/build-t1.js --all
//
// --all fails closed until every frozen allowlist slug has a reviewed record.
// The approved first release currently has six reviewed records.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');
const validate = require('./validate');
const { renderPhrasePage } = require('./render');

function parseArgs(argv) {
    const args = { slug: null, all: false };
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (token === '--all') args.all = true;
        else if (token === '--slug') {
            args.slug = argv[++i];
            if (!args.slug) throw new Error('--slug requires a value');
        } else throw new Error('unknown argument: ' + token);
    }
    if (Boolean(args.all) === Boolean(args.slug)) throw new Error('use exactly one of --slug <slug> or --all');
    return args;
}

function writePage(record, { shell, css, allowlist, released, root }) {
    const html = renderPhrasePage(record, { shell, css, allowlist, released });
    const outPath = lib.outputPath(record.slug, root);
    lib.assertOutputPath(outPath, root);
    if (outPath.includes(path.sep + 'word' + path.sep)) throw new Error('refusing to write under word/');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html.replace(/\n/g, '\r\n'));
    return outPath;
}

function build({ slug = null, all = false, root = lib.ROOT } = {}) {
    const allowlistErrors = validate.validateAllowlist(lib.loadAllowlist(root));
    if (allowlistErrors.length) throw new Error(allowlistErrors.join('; '));
    const allowlist = lib.loadAllowlist(root);
    const shell = lib.loadShell(root);
    const css = lib.loadCss(root);
    const existing = new Set(lib.listRecordSlugs(root));
    const released = lib.releasedSlugs(root, allowlist);

    if (all) {
        const missing = allowlist.slugs.filter((item) => !existing.has(item));
        if (missing.length) {
            throw new Error('full T1 build refused: missing reviewed records for ' + missing.length + ' allowlisted slugs (example: ' + missing.slice(0, 5).join(', ') + ')');
        }
        const extras = [...existing].filter((item) => !allowlist.slugs.includes(item));
        if (extras.length) throw new Error('full T1 build refused: extra records outside allowlist: ' + extras.join(', '));
        const written = [];
        for (const item of allowlist.slugs) {
            const record = lib.loadRecord(item, root);
            written.push(writePage(record, { shell, css, allowlist, released, root }));
        }
        return { mode: 'all', written };
    }

    if (!allowlist.slugs.includes(slug)) throw new Error('refusing unknown/non-allowlisted slug: ' + slug);
    if (!existing.has(slug)) throw new Error('no reviewed record for slug: ' + slug);
    const record = lib.loadRecord(slug, root);
    const recordErrors = validate.validateRecord(record, { allowlist, root });
    if (recordErrors.length) throw new Error(recordErrors.join('; '));
    const outPath = writePage(record, { shell, css, allowlist, released, root });
    return { mode: 'slug', written: [outPath] };
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const result = build(args);
    console.log('wrote ' + result.written.length + ' phrase page(s):');
    for (const file of result.written) console.log('  ' + path.relative(lib.ROOT, file).replace(/\\/g, '/'));
}

if (require.main === module) {
    try { main(); }
    catch (error) {
        console.error('FAILED: ' + error.message);
        process.exit(1);
    }
}

module.exports = { build, parseArgs, writePage };
