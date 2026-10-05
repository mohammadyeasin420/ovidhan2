'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolveExplorerRoute, approvedPagePath } = require('../learning-explorer.js');

const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/approved-static-word-slugs.json'), 'utf8'));
const approved = new Set(registry.map(slug => String(slug).trim().toLowerCase()));
const samples = ['waist', 'introvert', 'hi', 'perseverance', 'viva'];
const unapproved = ['school', 'friend', 'happy', 'teacher', 'market'];

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

function expectStatic(word, pathname, search, replace) {
    const decision = resolveExplorerRoute(word, pathname, search, approved);
    assert.equal(decision.action, 'static');
    assert.equal(decision.target, approvedPagePath(word.trim().toLowerCase()));
    assert.equal(decision.replace, replace);
}

scenario('clean explorer search for an approved word opens the static page', () => {
    for (const word of samples) expectStatic(word, '/explorer.html', '', false);
});

scenario('letter shell search for an approved word opens the static page', () => {
    for (const word of samples) expectStatic(word, '/word/g.html', '', false);
    expectStatic('waist', '/word/w.html', '', false);
});

scenario('legacy approved query replaces the shell with the static page', () => {
    expectStatic('waist', '/word/g.html', '?word=waist', true);
    expectStatic('waist', '/explorer.html', '?word=waist', true);
    expectStatic('Waist', '/word/w.html', '?word=Waist', true);
});

scenario('same approved search stays on the clean static page', () => {
    const decision = resolveExplorerRoute('waist', '/word/waist.html', '', approved);
    assert.equal(decision.action, 'stay');
});

scenario('approved page with its own legacy query is cleaned without an explorer result', () => {
    const decision = resolveExplorerRoute('waist', '/word/waist.html', '?word=waist', approved);
    assert.equal(decision.action, 'clean');
    assert.equal(decision.target, '/word/waist.html');
    assert.equal(decision.replace, true);
});

scenario('approved page search for another approved word opens that static page', () => {
    expectStatic('hi', '/word/waist.html', '', false);
    expectStatic('perseverance', '/word/viva.html', '', false);
});

scenario('approved page search for an unapproved word opens explorer', () => {
    for (const word of unapproved) {
        const decision = resolveExplorerRoute(word, '/word/waist.html', '', approved);
        assert.equal(decision.action, 'explorer');
        assert.equal(decision.target, '/explorer.html?word=' + encodeURIComponent(word));
        assert.equal(decision.replace, false);
    }
    const legacy = resolveExplorerRoute('school', '/word/waist.html', '?word=school', approved);
    assert.equal(legacy.action, 'explorer');
    assert.equal(legacy.target, '/explorer.html?word=school');
    assert.equal(legacy.replace, true);
});

scenario('explorer and letter shells keep unapproved runtime rendering', () => {
    for (const word of unapproved) {
        assert.equal(resolveExplorerRoute(word, '/explorer.html', '', approved).action, 'render');
        assert.equal(resolveExplorerRoute(word, '/word/g.html', '', approved).action, 'render');
        assert.equal(resolveExplorerRoute(word, '/word/g.html', '?word=' + word, approved).action, 'render');
        assert.equal(resolveExplorerRoute(word, '/explorer.html', '?word=' + word, approved).action, 'render');
    }
});

scenario('registry fetch failure preserves explorer rendering', () => {
    const empty = new Set();
    assert.equal(resolveExplorerRoute('waist', '/word/g.html', '?word=waist', empty).action, 'render');
    assert.equal(resolveExplorerRoute('school', '/explorer.html', '?word=school', empty).action, 'render');
    assert.equal(resolveExplorerRoute('school', '/word/waist.html', '', empty).action, 'render');
});

scenario('all approved slugs route to their static pages and never stay as explorer results', () => {
    assert.equal(registry.length, 2645);
    assert.equal(new Set(registry).size, 2645);
    for (const slug of registry) {
        const page = '/word/' + slug + '.html';
        assert.equal(fs.existsSync(path.join(__dirname, '../word', slug + '.html')), true);
        for (const from of ['/explorer.html', '/word/g.html', '/word/w.html']) {
            const decision = resolveExplorerRoute(slug, from, '', approved);
            assert.equal(decision.action, 'static', slug + ' from ' + from);
            assert.equal(decision.target, page);
        }
        const legacy = resolveExplorerRoute(slug, '/word/g.html', '?word=' + slug, approved);
        assert.equal(legacy.action, 'static');
        assert.equal(legacy.replace, true);
        assert.equal(legacy.target, page);
        assert.notEqual(legacy.action, 'render');
        assert.equal(resolveExplorerRoute(slug, page, '', approved).action, 'stay');
        assert.equal(resolveExplorerRoute(slug, page, '?word=' + slug, approved).action, 'clean');
    }
});

console.log('APPROVED ROUTING ' + registry.length + '/' + registry.length);
console.log('UNAPPROVED EXPLORER TESTS ' + unapproved.length + '/' + unapproved.length);
