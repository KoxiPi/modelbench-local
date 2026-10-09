import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatCost } from '../app/lib/format-cost.ts';
import { POST } from '../app/api/chat/route.ts';

test('cost distinguishes absent, zero, and small nonzero usage', () => {
  assert.equal(formatCost(), 'Not reported');
  assert.equal(formatCost(null), 'Not reported');
  assert.equal(formatCost(NaN), 'Not reported');
  assert.equal(formatCost(0), '$0.00');
  assert.equal(formatCost(0.00001), '$0.00001');
  assert.equal(formatCost(0.0000001), '<$0.000001');
  assert.equal(formatCost(1.25), '$1.25');
});

test('Markdown renders structure without executing raw HTML or unsafe links', () => {
  const html = renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm], skipHtml: true },
    '# Heading\n\n- **Bold**\n\n```js\nconst x = 1;\n```\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n<script>alert(1)</script>\n\n[link](javascript:alert%281%29)'));
  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<pre><code/);
  assert.match(html, /<table>/);
  assert.doesNotMatch(html, /<script|href="javascript:/);
});

test('chat proxy preserves reported cost and truncation without inventing absent usage', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const usage of [undefined, { cost: 0 }, { cost: 0.00001 }]) {
      globalThis.fetch = async () => Response.json({
        model: 'example/free', choices: [{ message: { content: '**Answer**' }, finish_reason: 'length' }], usage,
      });
      const response = await POST(new Request('http://localhost/api/chat', {
        method: 'POST', body: JSON.stringify({ apiKey: 'test-key', model: 'openrouter/free', prompt: 'Test' }),
      }));
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.usage.cost, usage?.cost);
      assert.equal(body.finishReason, 'length');
      assert.equal(body.text, '**Answer**');
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
