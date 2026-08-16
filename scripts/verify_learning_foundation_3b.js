'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputArgument = process.argv.indexOf('--write');
const outputPath = outputArgument >= 0 && process.argv[outputArgument + 1]
    ? path.resolve(root, process.argv[outputArgument + 1])
    : null;
const compareArgument = process.argv.indexOf('--compare');
const comparePath = compareArgument >= 0 && process.argv[compareArgument + 1]
    ? path.resolve(root, process.argv[compareArgument + 1])
    : null;

function sha256(relativePath) {
    return crypto.createHash('sha256')
        .update(fs.readFileSync(path.join(root, relativePath)))
        .digest('hex');
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (quoted) {
            if (character === '"' && text[index + 1] === '"') {
                field += '"';
                index += 1;
            } else if (character === '"') {
                quoted = false;
            } else {
                field += character;
            }
        } else if (character === '"') {
            quoted = true;
        } else if (character === ',') {
            row.push(field);
            field = '';
        } else if (character === '\n') {
            row.push(field.replace(/\r$/, ''));
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += character;
        }
    }

    if (field || row.length) {
        row.push(field.replace(/\r$/, ''));
        rows.push(row);
    }

    const headers = rows.shift();
    return rows.filter(values => values.some(Boolean)).map(values => Object.fromEntries(
        headers.map((header, index) => [header, values[index] || ''])
    ));
}

function manifestRows(relativePath) {
    return parseCsv(fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/^\uFEFF/, ''));
}

const treatment = manifestRows('reports/dictionary-seo-treatment-manifest-2e.csv').map(row => ({
    cohort: 'treatment',
    word: row.word,
    path: row.path
}));
const control = manifestRows('reports/dictionary-seo-control-manifest-2e.csv').map(row => ({
    cohort: 'control',
    word: row.word,
    path: `word/${row.word}.html`
}));
const pages = treatment.concat(control).map(page => ({
    ...page,
    sha256: sha256(page.path)
}));

const guards = [
    'sitemap.xml',
    'robots.txt',
    'enriched-dictionary.json',
    'reports/dictionary-seo-treatment-manifest-2e.csv',
    'reports/dictionary-seo-control-manifest-2e.csv',
    'reports/dictionary-seo-experiment-baseline-2e.csv'
].map(relativePath => ({
    path: relativePath,
    sha256: sha256(relativePath)
}));

const aggregateSha256 = crypto.createHash('sha256')
    .update(pages.map(page => `${page.path}\0${page.sha256}\n`).sort().join(''))
    .digest('hex');

const record = {
    schema: 'ovidhan-frozen-page-hashes-3b-v1',
    capturedAt: new Date().toISOString(),
    treatmentCount: treatment.length,
    controlCount: control.length,
    uniquePageCount: new Set(pages.map(page => page.path)).size,
    aggregateSha256,
    pages,
    guards
};

let comparison = null;
if (comparePath) {
    const baseline = JSON.parse(fs.readFileSync(comparePath, 'utf8'));
    const expectedPages = new Map((baseline.pages || []).map(page => [page.path, page.sha256]));
    const expectedGuards = new Map((baseline.guards || []).map(guard => [guard.path, guard.sha256]));
    comparison = {
        changedPages: pages.filter(page => expectedPages.get(page.path) !== page.sha256).map(page => page.path),
        missingPages: Array.from(expectedPages.keys()).filter(relativePath => !pages.some(page => page.path === relativePath)),
        changedGuards: guards.filter(guard => expectedGuards.get(guard.path) !== guard.sha256).map(guard => guard.path),
        aggregateEqual: baseline.aggregateSha256 === aggregateSha256
    };
}

if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(record, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify({
    treatmentCount: record.treatmentCount,
    controlCount: record.controlCount,
    uniquePageCount: record.uniquePageCount,
    aggregateSha256: record.aggregateSha256,
    guards: Object.fromEntries(record.guards.map(guard => [guard.path, guard.sha256])),
    comparison,
    outputPath
}, null, 2));

if (
    record.treatmentCount !== 72 ||
    record.controlCount !== 72 ||
    record.uniquePageCount !== 144 ||
    (comparison && (
        comparison.changedPages.length ||
        comparison.missingPages.length ||
        comparison.changedGuards.length ||
        !comparison.aggregateEqual
    ))
) {
    process.exitCode = 1;
}
