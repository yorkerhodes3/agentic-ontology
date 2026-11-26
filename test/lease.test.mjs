// Lease fixtures for the vendored engine: acceptance A-07 (F-L1 usually settles, always inside the
// mandate) and A-08 (F-L2 never settles), and the mandate form's rank-order centroid weights.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runNegotiation, mandateCheck, instantiate, STYLE_ORDER } from '../docs/assets/js/vendor/neocloud-nego/nego/engine.js';
import { hashSeed } from '../docs/assets/js/vendor/neocloud-nego/lib/rng.js';
import { LEASE_SCENARIOS, rocWeights, TENANT_RANKING } from '../docs/assets/js/wayfinder/lease.js';

const SEEDS = Array.from({ length: 20 }, (_, i) => hashSeed(`A07:${i}`) % 100000);
function sweep(fixture) {
  const scn = LEASE_SCENARIOS[fixture];
  const out = [];
  for (const seed of SEEDS) for (const style of STYLE_ORDER) out.push({ seed, style, r: runNegotiation(scn, { seed, style, ours: 'linear', rounds: 8 }).result });
  return out;
}

test('rank-order centroid weights sum to 1 and follow the ranking', () => {
  const w = rocWeights(6);
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  for (let i = 1; i < w.length; i++) assert.ok(w[i] < w[i - 1]);
  assert.equal(+w[0].toFixed(4), 0.4083);
  const inst = instantiate(LEASE_SCENARIOS['lease-f-l1'], { seed: 1 });
  const order = inst.issues.map((is, q) => [is.id, inst.w.us[q]]).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  assert.deepEqual(order, TENANT_RANKING);
});

test('A-07: F-L1 settles in at least 60 of 80 runs, never outside the mandate or with bank statements', () => {
  const runs = sweep('lease-f-l1');
  const inst = instantiate(LEASE_SCENARIOS['lease-f-l1'], { seed: 1 });
  const settled = runs.filter(({ r }) => r.status === 'settled');
  assert.ok(settled.length >= 60, `settled ${settled.length}/80`);
  for (const { r } of settled) {
    const d = inst.issues.map((is) => is.levels.indexOf(r.agreement.offer[is.id]));
    assert.ok(mandateCheck(inst, d).ok);
    assert.notEqual(r.agreement.offer.data, 'bank statements');
  }
  assert.ok(runs.every(({ r }) => ['settled', 'escalated', 'walked'].includes(r.status)));
});

test('A-08: F-L2 never settles', () => {
  const runs = sweep('lease-f-l2');
  assert.equal(runs.filter(({ r }) => r.agreement).length, 0);
});
