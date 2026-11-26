// The site's platform profiles must match SPECIFICATION.md §9.1 (FR-42).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLATFORMS, PLATFORM_ORDER, LAYERS, guessPlatform } from '../docs/assets/js/platforms.js';

const spec = readFileSync(new URL('../SPECIFICATION.md', import.meta.url), 'utf8');
const start = spec.indexOf('### 9.1 Platform profiles');
const section = spec.slice(start, spec.indexOf('**Model tiers**', start));
const specIds = [...section.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map(m => m[1]);

test('the site lists exactly the profiles in SPECIFICATION §9.1, in order', () => {
  assert.ok(specIds.length >= 5, 'could not read the §9.1 table');
  assert.deepEqual(PLATFORM_ORDER, specIds);
  assert.deepEqual(Object.keys(PLATFORMS).sort(), [...specIds].sort());
});

test('the requested platforms are covered: macOS, Windows, B3IQ and Mac Studio M5 Ultra', () => {
  for (const id of ['macos', 'windows', 'b3iq', 'mac-studio-m5-ultra']) assert.ok(PLATFORMS[id], id);
  assert.match(PLATFORMS['mac-studio-m5-ultra'].hardware, /512 GB/);
});

for (const id of PLATFORM_ORDER) {
  test(`${id}: has every field, valid layers, and planned commands`, () => {
    const p = PLATFORMS[id];
    for (const k of ['name', 'short', 'status', 'hardware', 'runtime', 'llm', 'decision', 'gpu', 'tier', 'notes']) assert.ok(p[k], `${id} missing ${k}`);
    assert.ok(['planned', 'validated'].includes(p.status));
    assert.ok(p.layers.length >= 2 && p.layers.every(n => LAYERS[n]), `${id} layers`);
    assert.equal(p.doctorRequired, !p.layers.includes(3), `${id}: doctor checks are mandatory exactly when layer 3 is missing`);
    assert.ok(p.commands.some(c => c.startsWith('wf doctor')), `${id} should start with wf doctor`);
    for (const s of p.sources || []) assert.match(s, /^https:\/\//);
  });
}

test('guessPlatform picks a sensible default from the user agent', () => {
  assert.equal(guessPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'windows');
  assert.equal(guessPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'), 'macos');
  assert.equal(guessPlatform('Mozilla/5.0 (X11; Linux x86_64)'), 'linux');
  assert.equal(guessPlatform('Mozilla/5.0 (Linux; Android 14)'), 'macos');
});
