'use strict';

const fs = require('fs');

const [, , sourcePath, outputPath] = process.argv;
if (!sourcePath || !outputPath) {
  throw new Error('Usage: node minify-production-dictionary.js <source> <output>');
}

const minified = JSON.stringify(JSON.parse(fs.readFileSync(sourcePath, 'utf8')));
fs.writeFileSync(outputPath, minified);

const output = fs.readFileSync(outputPath, 'utf8');
if (output !== minified) {
  throw new Error('Minified dictionary semantic verification failed.');
}
