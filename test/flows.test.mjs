// The simulation dashboard's flows: deterministic, write-before-dispatch, every gate decision
// recorded, decisions only change what comes after them, and two agents never talk directly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRun, stateAt, SCENARIOS, SCENARIO_ORDER, BOARD } from '../docs/assets/js/wayfinder/flows.js';
import { verify } from '../docs/assets/js/wayfinder/ledger.js';
import { instantiate, mandateCheck } from '../docs/assets/js/vendor/neocloud-nego/nego/engine.js';
import { LEASE_SCENARIOS } from '../docs/assets/js/wayfinder/lease.js';

// Every run the dashboard can show by default, plus every non-default choice at each approval.
function variants() {
  const out = [];
  for (const id of SCENARIO_ORDER) {
    const base = buildRun(id, { seed: 42 });
    out.push([`${id} default`, base]);
    for (const e of base.events.filter((x) => x.kind === 'approval')) {
      for (const o of e.approval.options.filter((x) => x !== e.approval.dflt)) out.push([`${id} ${e.approval.id}=${o}`, buildRun(id, { seed: 42, decisions: { [e.approval.id]: o } }), e.i]);
    }
  }
  for (const b of BOARD) out.push([`board ${b.scenario}/${b.seed}`, buildRun(b.scenario, b)]);
  return out;
}
const RUNS = variants();

test('runs are deterministic for the same scenario, seed and decisions', () => {
  for (const id of SCENARIO_ORDER) assert.equal(JSON.stringify(buildRun(id, { seed: 7 })), JSON.stringify(buildRun(id, { seed: 7 })), id);
});

test('every run ends sealed, and its ledger verifies against its head', () => {
  for (const [name, run] of RUNS) {
    assert.ok(verify(run.entries, run.head).ok, name);
    assert.equal(run.entries.at(-1).type, 'run.sealed', name);
    assert.ok(stateAt(run, run.events.length).sealed, name);
  }
});

test('the gate writes the ledger before every dispatch, and records every decision', () => {
  for (const [name, run] of RUNS) {
    const ev = run.events;
    let wroteSinceDispatch = false;
    for (const e of ev) {
      if (e.kind === 'ledger') wroteSinceDispatch = true;
      if (e.kind === 'dispatch') { assert.ok(wroteSinceDispatch, `${name}: dispatch #${e.i} "${e.label}" without a ledger write`); wroteSinceDispatch = false; }
    }
    ev.forEach((e, k) => {
      if (e.kind !== 'policy' && e.kind !== 'decision') return;
      const next = ev.slice(k + 1).find((x) => ['ledger', 'policy', 'dispatch'].includes(x.kind));
      assert.equal(next?.kind, 'ledger', `${name}: ${e.kind} #${e.i} "${e.label}" is not recorded before the next action`);
    });
  }
});

test('events only use the scenario\'s lanes, and agents never message each other directly', () => {
  for (const [name, run] of RUNS) {
    const lanes = new Set(run.lanes);
    for (const e of run.events) {
      assert.ok(lanes.has(e.from) && lanes.has(e.to), `${name}: ${e.from} → ${e.to}`);
      assert.ok(!(e.from.startsWith('agent:') && e.to.startsWith('agent:')), `${name}: direct agent-to-agent event #${e.i}`);
    }
  }
});

test('a decision changes only what happens after it', () => {
  for (const [name, run, at] of RUNS) {
    if (at == null) continue;
    const base = buildRun(run.scenario.id, { seed: 42 });
    assert.deepEqual(run.events.slice(0, at + 1), base.events.slice(0, at + 1), name);
    const before = base.events.slice(0, at + 1).filter((e) => e.kind === 'ledger').length;
    assert.deepEqual(run.entries.slice(0, before), base.entries.slice(0, before), name);
  }
});

test('S5: two agents share one ledger and the hand-off goes through the gate', () => {
  const run = buildRun('s5', { seed: 42 });
  assert.equal(run.agents.length, 2);
  const tagged = new Set(run.events.filter((e) => e.kind === 'ledger').map((e) => e.agent));
  assert.ok(tagged.has('travel') && tagged.has('calendar'));
  assert.ok(run.events.some((e) => e.kind === 'handoff' && e.from === 'agent:travel' && e.to === 'gate'));
  assert.ok(run.events.some((e) => e.kind === 'handoff' && e.from === 'gate' && e.to === 'agent:calendar'));
  assert.ok(run.events.some((e) => e.kind === 'policy' && e.outcome === 'denied' && /Stale plan/.test(e.label)));
  assert.match(SCENARIOS.s5.scope, /beyond v0\.4/);
});

test('S3: everything the agent sends or decides stays inside mandate v1 and never includes bank statements', () => {
  const inst = instantiate(LEASE_SCENARIOS['lease-f-l1'], { seed: 42 });
  for (const [name, run] of RUNS.filter(([, r]) => r.scenario.id === 's3')) {
    const byAgent = run.entries.filter((x) => x.type === 'offer.sent' || (x.type === 'decision.made' && x.actor === 'agent:tenant' && x.body.package));
    for (const en of byAgent) {
      const d = inst.issues.map((is) => is.levels.indexOf(en.body.package[is.id]));
      assert.ok(mandateCheck(inst, d).ok, `${name}: offer outside the mandate`);
      assert.notEqual(en.body.package.data, 'bank statements');
    }
    for (const en of run.entries.filter((x) => x.type === 'disclosure.made')) assert.ok(!en.body.facts.some((f) => /Bank/.test(f)), name);
  }
});

test('S3: an out-of-mandate package is escalated, and only a signed replacement lets it through', () => {
  const opts = { seed: 3, fixture: 'lease-f-l1', style: 'boulware' };
  const kept = buildRun('s3', opts);
  const esc = kept.events.find((e) => e.kind === 'approval' && e.approval.id.startsWith('mandate'));
  assert.ok(esc, 'seed 3 should escalate');
  assert.equal(kept.result.status, 'walked');
  const signed = buildRun('s3', { ...opts, decisions: { [esc.approval.id]: 'sign a replacement mandate' } });
  assert.equal(signed.result.status, 'approved');
  const v2 = signed.entries.findIndex((e) => e.type === 'mandate.signed' && e.body.mandate === 'MND-LEASE-001 v2');
  assert.ok(v2 >= 0);
  // The out-of-v1 settlement is Alex's, under v2, and the gate asked only once.
  const settle = signed.entries.find((e) => e.type === 'decision.made' && /settlement/.test(e.body.decision));
  assert.equal(settle.actor, 'person');
  assert.equal(settle.mandateRef, 'MND-LEASE-001 v2');
  assert.ok(settle.seq > v2 + 1);
  assert.equal(stateAt(signed, signed.events.length).counts.escalated, 1);
});

test('S3: a hard ban cannot be lifted, even by a decisions map that asks for it', () => {
  const opts = { seed: 5, fixture: 'lease-f-l1', style: 'boulware', ours: 'boulware' };
  const run = buildRun('s3', opts);
  const esc = run.events.find((e) => e.kind === 'approval' && e.approval.id.startsWith('mandate'));
  assert.ok(esc, 'seed 5 (boulware vs boulware) should escalate on a hard ban');
  assert.deepEqual(esc.approval.options, ['keep the mandate']);
  const forced = buildRun('s3', { ...opts, decisions: { [esc.approval.id]: 'sign a replacement mandate' } });
  assert.equal(forced.result.status, 'walked');
  assert.ok(!forced.entries.some((e) => e.type === 'mandate.signed' && e.body.mandate.endsWith('v2')));
  assert.equal(JSON.stringify(forced.entries), JSON.stringify(run.entries));
});

test('unknown or prototype-named scenarios and fixtures are rejected or ignored', () => {
  for (const id of ['constructor', '__proto__', 'toString', 's9']) assert.throws(() => buildRun(id), /Unknown scenario/);
  assert.equal(buildRun('s3', { seed: 42, fixture: 'toString' }).meta.fixture, 'lease-f-l1');
});
