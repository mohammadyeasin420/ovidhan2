'use strict';
// Check that generated phrase pages match a fresh render.
//
//   node scripts/phrase/check-t1.js --slug mind-it

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');
const validate = require('./validate');
const { renderPhrasePage } = require('./render');

function parseArgs(argv) {
    const args = { slug: null };
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (token === '--slug') {
            args.slug = argv[++i];
            if (!args.slug) throw new Error('--slug requires a value');
        } else throw new Error('unknown argument: ' + token);
    }
    if (!args.slug) throw new Error('use --slug <slug>');
    return args;
}

function checkSlug(slug, root = lib.ROOT) {
    const allowlist = lib.loadAllowlist(root);
    const allowlistErrors = validate.validateAllowlist(allowlist);
    if (allowlistErrors.length) throw new Error(allowlistErrors.join('; '));
    if (!allowlist.slugs.includes(slug)) throw new Error('slug not allowlisted: ' + slug);
    const record = lib.loadRecord(slug, root);
    const recordErrors = validate.validateRecord(record, { allowlist, root });
    if (recordErrors.length) throw new Error(recordErrors.join('; '));
    const expected = renderPhrasePage(record, {
        shell: lib.loadShell(root),
        css: lib.loadCss(root),
        allowlist,
        released: lib.releasedSlugs(root, allowlist)
    }).replace(/\n/g, '\r\n');
    const outPath = lib.outputPath(slug, root);
    lib.assertOutputPath(outPath, root);
    if (!fs.existsSync(outPath)) throw new Error('missing output: ' + outPath);
    const actual = fs.readFileSync(outPath);
    if (Buffer.compare(actual, Buffer.from(expected, 'utf8')) !== 0) {
        throw new Error('phrase page drifted from renderer: ' + path.relative(root, outPath));
    }
    return outPath;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const file = checkSlug(args.slug);
    console.log('OK: ' + path.relative(lib.ROOT, file).replace(/\\/g, '/') + ' matches renderer');
}

if (require.main === module) {
    try { main(); }
    catch (error) {
        console.error('FAILED: ' + error.message);
        process.exit(1);
    }
}

module.exports = { checkSlug, parseArgs };
