import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse } from 'parse5';
import { categories, schemes } from '../ui/catalog.mjs';
import { pages } from '../ui/routes.mjs';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const origin = 'https://preview.example';
const ids = schemes.map(({ id }) => id);
const attribute = (node, key) => node.attrs?.find(({ name }) => name === key)?.value;

function* walk(node) {
  yield node;
  for (const child of node.childNodes ?? []) yield* walk(child);
}

const compiled = Object.fromEntries(Object.entries(pages).map(([name, entry]) => {
  const html = readFileSync(join(dist, entry), 'utf8');
  return [name, { entry, html, nodes: [...walk(parse(html))] }];
}));
const entries = new Map(Object.values(compiled).map((page) => [page.entry, page]));

const select = (nodes, key) => nodes.filter((node) => attribute(node, key) !== undefined);

test('all eight screens build as standalone pages with the shared navigation', () => {
  assert.equal(Object.keys(compiled).length, 8);
  for (const [name, { entry, html, nodes }] of Object.entries(compiled)) {
    assert.equal(nodes.filter((node) => node.tagName === 'main' && attribute(node, 'id') === 'main').length, 1, entry);
    assert.equal(attribute(nodes.find((node) => node.tagName === 'body'), 'data-page'), name);
    assert.doesNotMatch(html, /<!-- ui:|cdn\.tailwindcss\.com|fonts\.googleapis\.com/);
    assert.match(html, /design preview/i);
    assert.ok(nodes.some((node) => node.tagName === 'svg'), `${entry}: inline icons missing`);
    if (name !== 'landing') {
      assert.ok(nodes.some((node) => node.tagName === 'nav' && attribute(node, 'aria-label') === 'Workspace'));
      assert.ok(nodes.some((node) => node.tagName === 'nav' && attribute(node, 'aria-label') === 'Mobile workspace'));
    }
  }
});

test('internal links, fragment targets, scripts, and styles exist in the output', () => {
  for (const { entry, nodes } of Object.values(compiled)) {
    for (const node of nodes) {
      if (!['a', 'link', 'script'].includes(node.tagName)) continue;
      const href = attribute(node, node.tagName === 'script' ? 'src' : 'href');
      if (href === undefined) continue;
      assert.ok(href && href !== '#', `${entry}: empty link`);
      const url = new URL(href, `${origin}/${entry}`);
      if (url.origin !== origin) {
        assert.equal(url.protocol, 'https:', href);
        if (attribute(node, 'target') === '_blank') assert.match(attribute(node, 'rel') ?? '', /\bnoopener\b/, href);
        continue;
      }
      const path = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
      assert.ok(existsSync(join(dist, path)) && statSync(join(dist, path)).isFile(), `${entry}: ${href} does not resolve`);
      if (url.hash) {
        const fragment = decodeURIComponent(url.hash.slice(1));
        assert.ok(entries.get(path)?.nodes.some((target) => attribute(target, 'id') === fragment), `${entry}: ${href} has no fragment target`);
      }
      if (url.searchParams.has('scheme')) assert.ok(ids.includes(url.searchParams.get('scheme')), href);
      if (url.searchParams.has('category')) assert.ok(Object.hasOwn(categories, url.searchParams.get('category')), href);
    }
  }
});

test('each preview scheme has a result, matching detail page view and checklist', () => {
  for (const [page, key] of [['results', 'data-result'], ['details', 'data-detail'], ['documents', 'data-checklist']]) {
    assert.deepEqual(select(compiled[page].nodes, key).map((node) => attribute(node, key)), ids);
  }
  const options = compiled.documents.nodes.filter((node) => node.tagName === 'option');
  assert.deepEqual(options.map((node) => attribute(node, 'value')), ids);
});

test('only the scholarship check sends answers, to the same-origin API', () => {
  for (const [page, { nodes }] of Object.entries(compiled)) {
    const forms = nodes.filter((node) => node.tagName === 'form');
    assert.equal(forms.length, page === 'assistant' ? 1 : 0, page);
    if (page === 'assistant') {
      assert.equal(attribute(forms[0], 'method'), 'post');
      assert.equal(attribute(forms[0], 'action'), '/api/scholarship');
      const fields = select(nodes, 'data-pilot-fields');
      assert.equal(fields.length, 1);
      assert.notEqual(attribute(fields[0], 'disabled'), undefined, 'Keep the form disabled until the API loads');
    }
  }
});

test('pages offer no uploads, fake verification or backend key', () => {
  for (const { html, nodes } of Object.values(compiled)) {
    assert.equal(nodes.filter((node) => attribute(node, 'type') === 'file').length, 0);
    assert.doesNotMatch(html, /TINYFISH_API_KEY|sk-tinyfish-[a-z0-9]|yojnaagent\.gov\.in|STQC|Aadhaar Verified|98% Match/i);
  }
  for (const node of compiled.profile.nodes.filter((node) => node.tagName === 'input' && attribute(node, 'type') === 'text')) {
    assert.notEqual(attribute(node, 'readonly'), undefined);
  }
});
