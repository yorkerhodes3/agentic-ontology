// Every style guide must derive to a legible page. Ported from Neocloud Supply OS (Apache-2.0).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BRANDS, derive, DEFAULT_BRAND } from '../docs/assets/js/themes.js';
import { contrast, over } from '../docs/assets/js/lib/color.js';

const REQUIRED = ['--bg', '--surface', '--card', '--fg', '--muted', '--border', '--border-strong', '--accent', '--accent-ink',
  '--primary', '--primary-ink', '--display-color',
  '--glow', '--glow-2', '--ok', '--warn', '--risk', '--info', '--s1', '--s2', '--s3', '--s4', '--s5', '--s6',
  '--font-display', '--font-body', '--font-mono',
  '--display-case', '--display-tracking', '--display-weight', '--display-leading', '--radius-sm', '--radius', '--radius-lg', '--radius-pill'];

test('the default style guide is the CoLab theme, as in Neocloud Supply OS', () => {
  assert.equal(DEFAULT_BRAND, 'colab');
  assert.ok(BRANDS[DEFAULT_BRAND]);
});

test('the MetaMask style guide is present, light, and uses plum headings with black primary buttons', () => {
  const m = BRANDS.metamask;
  assert.ok(m);
  assert.equal(m.ground, 'light');
  const v = derive(m);
  assert.equal(v['--bg'], '#fff1eb');
  assert.equal(v['--display-color'], '#3d065f');
  assert.equal(v['--primary'], '#0a0a0a');
});

test('the Neocloud presets are all carried over', () => {
  for (const id of ['colab', 'colab-daylight', 'coreweave', 'nebius', 'openai', 'lambda', 'crusoe', 'together', 'nscale', 'fluidstack', 'vultr', 'voltage-park']) assert.ok(BRANDS[id], id);
});

for (const [id, b] of Object.entries(BRANDS)) {
  test(`${id}: derives every variable and meets contrast targets`, () => {
    const v = derive(b);
    for (const k of REQUIRED) assert.ok(v[k] != null && v[k] !== '', `${id} missing ${k}`);
    const bg = v['--bg'];
    const ratios = {
      'fg on bg': [contrast(v['--fg'], bg), 7],
      'fg on card': [contrast(v['--fg'], over(v['--card'], bg)), 7],
      'muted on bg': [contrast(v['--muted'], bg), 4.5],
      'muted on card': [contrast(v['--muted'], over(v['--card'], bg)), 4.5],
      'accent on bg': [contrast(v['--accent'], bg), 3],
      'accent-ink on accent': [contrast(v['--accent-ink'], v['--accent']), 4.5],
      'primary on bg': [contrast(v['--primary'], bg), 3],
      'primary-ink on primary': [contrast(v['--primary-ink'], v['--primary']), 4.5],
      'headings on bg': [contrast(v['--display-color'], bg), 4.5],
    };
    for (const [what, [r, min]] of Object.entries(ratios)) assert.ok(r >= min, `${id}: ${what} is ${r.toFixed(2)}, needs ${min}`);
  });

  test(`${id}: carries provenance`, () => {
    for (const k of ['name', 'short', 'ground', 'style', 'confidence']) assert.ok(b[k], `${id} missing ${k}`);
    assert.ok(['high', 'medium', 'low'].includes(b.confidence));
    assert.ok(Array.isArray(b.sources) && b.sources.length > 0 && b.sources.every(s => /^https:\/\//.test(s)), `${id} needs https sources`);
  });
}

test('every font family a style guide names is self-hosted', () => {
  const css = readFileSync(new URL('../docs/assets/fonts/fonts.css', import.meta.url), 'utf8');
  const hosted = new Set([...css.matchAll(/font-family:"([^"]+)"/g)].map(m => m[1]));
  for (const [id, b] of Object.entries(BRANDS)) {
    for (const stack of [b.fontDisplay, b.fontBody, b.fontMono].filter(Boolean)) {
      const first = /^"([^"]+)"/.exec(stack)?.[1];
      assert.ok(first && hosted.has(first), `${id}: "${first}" is not in fonts.css`);
    }
  }
});

test('every font file referenced by fonts.css exists', () => {
  const css = readFileSync(new URL('../docs/assets/fonts/fonts.css', import.meta.url), 'utf8');
  for (const [, f] of css.matchAll(/url\("([^"]+)"\)/g)) readFileSync(new URL(`../docs/assets/fonts/${f}`, import.meta.url));
});
