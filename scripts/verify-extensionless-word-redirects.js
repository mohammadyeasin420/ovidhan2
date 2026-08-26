#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const approvedBase = 'b5eb1d3225e825e6062e1a6a8dff47933b2a1169';
const proposalPath = path.join(root, 'reports', 'dictionary-opportunity-7a3c-redirect-proposal.txt');
const manifestPath = path.join(__dirname, 'extensionless-word-redirects-7a3d.json');
const redirectsPath = path.join(root, '_redirects');
const expectedHomepage = '/ /index.html 200';
const expectedCount = 95;
const protectedPaths = [
  'word', 'enriched-dictionary.json', 'sitemap.xml', 'robots.txt',
  'learning-explorer.js', 'data/seo-word-pilot-7a1.json',
  'reports/ovidhan-learning-foundation-3b-frozen-hashes.json'
];

function meaningfulLines(text) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
}

function parseRules(text, label) {
  return meaningfulLines(text).map((line, index) => {
    const parts = line.split(/\s+/);
    assert(parts.length === 2 || parts.length === 3, `${label} line ${index + 1} must have source, target, and optional status: ${line}`);
    const status = parts.length === 3 ? Number(parts[2]) : null;
    assert(status === null || Number.isInteger(status), `${label} line ${index + 1} has invalid status: ${line}`);
    return { source: parts[0], target: parts[1], status };
  });
}

function mappingKey(rule) {
  return `${rule.source}\t${rule.target}\t${rule.status}`;
}

function validateMappings(rules, label, options = {}) {
  assert.strictEqual(rules.length, expectedCount, `${label} must contain exactly ${expectedCount} mappings`);
  const sources = new Map();
  const targets = new Set();
  for (const rule of rules) {
    assert.strictEqual(rule.status, 301, `${label}: wrong status for ${rule.source}`);
    assert(/^\/word\/[^/\s]+$/.test(rule.source), `${label}: invalid exact source ${rule.source}`);
    assert(!rule.source.endsWith('.html'), `${label}: source is not extensionless ${rule.source}`);
    assert(!rule.source.includes('*') && !rule.source.includes(':splat'), `${label}: wildcard source forbidden ${rule.source}`);
    assert(!sources.has(rule.source), `${label}: duplicate/conflicting source ${rule.source}`);
    assert.strictEqual(rule.target, `${rule.source}.html`, `${label}: target mismatch for ${rule.source}`);
    assert(!targets.has(rule.target), `${label}: duplicate target ${rule.target}`);
    assert(!rules.some(other => other.source === rule.target), `${label}: redirect chain mapping ${rule.source} -> ${rule.target}`);
    sources.set(rule.source, rule.target);
    targets.add(rule.target);
  }
  if (options.requireFiles) validateTargets(rules);
  return new Set(rules.map(mappingKey));
}

function validateTargets(rules) {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const rule of rules) {
    const slug = rule.source.slice('/word/'.length);
    const targetFile = path.join(root, 'word', `${slug}.html`);
    assert(fs.existsSync(targetFile), `Target file missing: ${targetFile}`);
    const html = fs.readFileSync(targetFile, 'utf8');
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
    const expectedCanonical = `https://ovidhan.net${rule.target}`;
    assert(canonical, `Canonical missing: ${rule.target}`);
    assert.strictEqual(canonical[1], expectedCanonical, `Canonical mismatch: ${rule.target}`);
    assert(sitemap.includes(`<loc>${expectedCanonical}</loc>`), `Target absent from sitemap: ${rule.target}`);
    assert(!sitemap.includes(`<loc>https://ovidhan.net${rule.source}</loc>`), `Redirect source present in sitemap: ${rule.source}`);
    assert(!/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html), `Target noindexed: ${rule.target}`);
  }
}

function proposalMappings() {
  return parseRules(fs.readFileSync(proposalPath, 'utf8'), '7A3C proposal');
}

function manifestMappings() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  validateManifestMetadata(manifest);
  return manifest.redirects;
}

function validateManifestMetadata(manifest) {
  assert.strictEqual(manifest.schema, 'ovidhan-extensionless-word-redirects-7a3d-v1', 'Manifest schema mismatch');
  assert(Array.isArray(manifest.redirects), 'Manifest redirects must be an array');
  assert.strictEqual(manifest.count, expectedCount, `Manifest declared count must be ${expectedCount}`);
  assert.strictEqual(manifest.source, 'reports/dictionary-opportunity-7a3c-redirect-proposal.txt', 'Manifest source mismatch');
}

function activeMappingsFromText(text, label, phaseStrict = false) {
  const rules = parseRules(text, label);
  const homepage = rules.filter(rule => rule.source === '/');
  assert.strictEqual(homepage.length, 1, 'Homepage rewrite must appear exactly once');
  assert.strictEqual(mappingKey(homepage[0]), mappingKey({ source: '/', target: '/index.html', status: 200 }), 'Homepage rewrite changed');
  const wordRules = rules.filter(rule => rule.source.startsWith('/word/') && !rule.source.endsWith('.html'));
  if (phaseStrict) assert.strictEqual(rules.length, expectedCount + 1, 'Phase-strict redirects must contain exactly 96 meaningful rules');
  assert.strictEqual(wordRules.length, expectedCount, 'Active redirects must contain exactly 95 word redirects');
  assert(!wordRules.some(rule => rule.source.includes('*') || rule.source.includes(':splat')), 'Wildcard word redirect forbidden');
  return wordRules;
}

function activeMappings(filePath = redirectsPath, phaseStrict = false) {
  return activeMappingsFromText(fs.readFileSync(filePath, 'utf8'), path.basename(filePath), phaseStrict);
}

function assertSetEqual(left, right, label) {
  assert.strictEqual(left.size, right.size, `${label}: set size mismatch`);
  for (const item of left) assert(right.has(item), `${label}: missing ${item}`);
}

function generate() {
  const proposal = proposalMappings();
  validateMappings(proposal, '7A3C proposal', { requireFiles: true });
  const sorted = [...proposal].sort((a, b) => a.source.localeCompare(b.source));
  const manifest = {
    schema: 'ovidhan-extensionless-word-redirects-7a3d-v1',
    source: 'reports/dictionary-opportunity-7a3c-redirect-proposal.txt',
    count: sorted.length,
    redirects: sorted
  };
  const manifestLines = [
    '{',
    `  "schema": ${JSON.stringify(manifest.schema)},`,
    `  "source": ${JSON.stringify(manifest.source)},`,
    `  "count": ${manifest.count},`,
    '  "redirects": [',
    ...manifest.redirects.map((rule, index) => `    ${JSON.stringify(rule)}${index + 1 === manifest.redirects.length ? '' : ','}`),
    '  ]',
    '}'
  ];
  fs.writeFileSync(manifestPath, `${manifestLines.join('\n')}\n`, 'utf8');
  const redirectText = [expectedHomepage, ...sorted.map(rule => `${rule.source} ${rule.target} 301`)].join('\n') + '\n';
  fs.writeFileSync(redirectsPath, redirectText, 'utf8');
}

function syntheticRejectionTests(validRules) {
  const expectReject = (mutator, pattern) => {
    const copy = validRules.map(rule => ({ ...rule }));
    mutator(copy);
    assert.throws(() => validateMappings(copy, 'synthetic'), pattern);
  };
  expectReject(rules => { rules[1] = { ...rules[0] }; }, /duplicate|target/);
  expectReject(rules => { rules[1].source = rules[0].source; }, /duplicate\/conflicting/);
  expectReject(rules => { rules[0].source = '/word/*'; rules[0].target = '/word/*.html'; }, /wildcard|invalid exact/);
  expectReject(rules => { rules[0].status = 302; }, /wrong status/);
  expectReject(rules => { rules[0].target = '/word/wrong.html'; }, /target mismatch/);
  expectReject(rules => { rules[1].source = rules[0].target; rules[1].target = `${rules[0].target}.html`; }, /redirect chain|source is not extensionless/);
}

function futureSafetyTests(validRules) {
  const baseText = [expectedHomepage, ...validRules.map(rule => `${rule.source} ${rule.target} 301`)].join('\n');
  assert.strictEqual(parseRules('/legacy /replacement', 'optional-status')[0].status, null, 'Optional status parsing failed');
  assert.strictEqual(activeMappingsFromText(`${baseText}\n/legacy /replacement`, 'unrelated-future').length, expectedCount, 'Unrelated non-word redirect was not allowed');
  assert.throws(() => activeMappingsFromText(baseText.split('\n').slice(0, -1).join('\n'), 'missing-approved'), /exactly 95/);
  assert.throws(() => activeMappingsFromText(`${baseText}\n/word/unapproved /word/unapproved.html 301`, 'extra-unapproved'), /exactly 95/);
  assert.strictEqual(activeMappingsFromText(baseText, 'phase-strict', true).length, expectedCount, 'Current phase-strict rules failed');
  assert.throws(() => activeMappingsFromText(`${baseText}\n/legacy /replacement`, 'phase-strict-extra', true), /exactly 96/);
  const validManifest = { schema: 'ovidhan-extensionless-word-redirects-7a3d-v1', source: 'reports/dictionary-opportunity-7a3c-redirect-proposal.txt', count: expectedCount, redirects: validRules };
  validateManifestMetadata(validManifest);
  assert.throws(() => validateManifestMetadata({ ...validManifest, count: expectedCount - 1 }), /declared count/);
  assert.throws(() => validateManifestMetadata({ ...validManifest, source: 'wrong.txt' }), /source mismatch/);
  assert.strictEqual(shouldCheckPhaseScope([]), false, 'Default validation must not check historical phase scope');
  assert.strictEqual(shouldCheckPhaseScope(['--package', 'x']), false, 'Package validation must not check historical phase scope');
  assert.strictEqual(shouldCheckPhaseScope(['--live', 'https://example.com']), false, 'Live validation must not check historical phase scope');
  assert.strictEqual(shouldCheckPhaseScope(['--check-phase-scope']), true, 'Explicit phase-scope flag not recognized');
  return 13;
}

function currentSourceLeakCount() {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString('utf8').split('\0').filter(Boolean);
  const findings = [];
  const quotedUrl = /(["'`])([^"'`\r\n]*\/word\/[^"'`\r\n]*)\1/g;
  for (const relative of files) {
    if (relative === '_redirects' || relative.startsWith('reports/') || relative.startsWith('scripts/') || relative.startsWith('word/')) continue;
    if (!/\.(?:html|js|json|xml|css)$/i.test(relative)) continue;
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    for (const match of text.matchAll(quotedUrl)) {
      const value = match[2];
      if (!value.includes('.html') && (/\$\{|\{\{|%24%7B|%7B%7B/i.test(value) || /\/word\/[A-Za-z0-9_%.-]+$/.test(value))) {
        findings.push(`${relative}: ${value.slice(0, 180)}`);
      }
    }
  }
  return findings;
}

function shouldCheckPhaseScope(args) {
  return args.includes('--check-phase-scope') || args.includes('--phase-base');
}

function verifyProtectedScope(baseSha) {
  const changed = execFileSync('git', ['diff', '--name-only', baseSha, '--', ...protectedPaths], { cwd: root, encoding: 'utf8' }).trim();
  assert.strictEqual(changed, '', `Protected files changed:\n${changed}`);
}

async function verifyLive(baseUrl, rules) {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  for (const rule of rules) {
    const response = await fetch(`${normalizedBase}${rule.source}`, { redirect: 'manual' });
    assert.strictEqual(response.status, 301, `Live first response is not 301: ${rule.source} (${response.status})`);
    const location = response.headers.get('location');
    assert(location, `Live Location missing: ${rule.source}`);
    assert.strictEqual(new URL(location, normalizedBase).href, new URL(rule.target, normalizedBase).href, `Live Location mismatch: ${rule.source}`);
  }
  const sampleIndexes = [...new Set([0, Math.floor(rules.length / 2), rules.length - 1])];
  for (const index of sampleIndexes) {
    const target = rules[index].target;
    const response = await fetch(`${normalizedBase}${target}`, { redirect: 'manual' });
    assert.strictEqual(response.status, 200, `Final target sample is not 200: ${target} (${response.status})`);
  }
  return sampleIndexes.map(index => rules[index].target);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--write')) generate();
  const phaseStrict = args.includes('--phase-strict');
  const proposal = proposalMappings();
  const manifest = manifestMappings();
  const active = activeMappings(redirectsPath, phaseStrict);
  const activeMeaningfulRules = parseRules(fs.readFileSync(redirectsPath, 'utf8'), '_redirects').length;
  const proposalSet = validateMappings(proposal, '7A3C proposal', { requireFiles: true });
  const manifestSet = validateMappings(manifest, '7A3D manifest', { requireFiles: true });
  const activeSet = validateMappings(active, 'active _redirects', { requireFiles: true });
  assertSetEqual(proposalSet, manifestSet, 'proposal/manifest');
  assertSetEqual(proposalSet, activeSet, 'proposal/_redirects');
  syntheticRejectionTests(proposal);
  const futureSafetyTestCount = futureSafetyTests(proposal);
  const phaseScopeChecked = shouldCheckPhaseScope(args);
  let phaseBase = null;
  if (phaseScopeChecked) {
    const phaseBaseIndex = args.indexOf('--phase-base');
    phaseBase = phaseBaseIndex >= 0 ? args[phaseBaseIndex + 1] : approvedBase;
    assert(phaseBase, '--phase-base requires a SHA');
    verifyProtectedScope(phaseBase);
  }
  const sourceLeakFindings = currentSourceLeakCount();
  assert.strictEqual(sourceLeakFindings.length, 0, `Current internal extensionless word URL generation detected:\n${sourceLeakFindings.join('\n')}`);

  const packageIndex = args.indexOf('--package');
  let packageRules = null;
  let packageMeaningfulRules = null;
  if (packageIndex >= 0) {
    const packagePath = args[packageIndex + 1];
    assert(packagePath, '--package requires a path');
    const packageRedirects = path.join(packagePath, '_redirects');
    packageRules = activeMappings(packageRedirects, phaseStrict);
    packageMeaningfulRules = parseRules(fs.readFileSync(packageRedirects, 'utf8'), 'production package _redirects').length;
    assertSetEqual(activeSet, validateMappings(packageRules, 'production package _redirects'), 'source/package');
    const sourceText = fs.readFileSync(redirectsPath, 'utf8').replace(/\r\n/g, '\n').trimEnd();
    const packageText = fs.readFileSync(packageRedirects, 'utf8').replace(/\r\n/g, '\n').trimEnd();
    assert.strictEqual(packageText, sourceText, 'Production package _redirects differs from source');
  }

  const liveIndex = args.indexOf('--live');
  let liveSamples = null;
  if (liveIndex >= 0) {
    const baseUrl = args[liveIndex + 1];
    assert(baseUrl, '--live requires a base URL');
    liveSamples = await verifyLive(baseUrl, manifest);
  }

  console.log(JSON.stringify({
    status: 'PASS', proposal: proposal.length, manifest: manifest.length,
    active_word_redirects: active.length, active_meaningful_rules: activeMeaningfulRules,
    targets_verified: active.length, current_internal_source_leaks: sourceLeakFindings.length,
    package_rules: packageMeaningfulRules,
    synthetic_rejection_tests: 6, future_safety_tests: futureSafetyTestCount,
    phase_strict: phaseStrict, phase_scope_checked: phaseScopeChecked, phase_base: phaseBase,
    live_samples: liveSamples
  }, null, 2));
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
