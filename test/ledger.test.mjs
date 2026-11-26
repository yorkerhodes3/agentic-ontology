// The simulated ledger: SHA-256 must be standard, and verify() must catch every kind of tampering.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sha256 } from '../docs/assets/js/wayfinder/sha256.js';
import { buildChain, headOf, verify, tamper, ZERO } from '../docs/assets/js/wayfinder/ledger.js';

test('sha256 matches the FIPS 180-2 vectors and node:crypto', () => {
  assert.equal(sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'), '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  for (const s of ['é ü 漢字 🚀', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000)]) {
    assert.equal(sha256(s), createHash('sha256').update(s, 'utf8').digest('hex'));
  }
});

const drafts = Array.from({ length: 6 }, (_, k) => ({ type: k ? 'policy.evaluated' : 'mandate.signed', actor: 'gate', body: { k } }));
const entries = buildChain('run-test', drafts, (k) => new Date(Date.UTC(2027, 0, 1, 9, 0, k)).toISOString());
const head = headOf('run-test', entries);

test('a fresh chain links every entry and matches its head', () => {
  assert.equal(entries[0].prevHash, ZERO);
  for (let i = 1; i < entries.length; i++) assert.equal(entries[i].prevHash, entries[i - 1].entryHash);
  assert.deepEqual(verify(entries, head), { ok: true, checked: 6, failure: null });
});

test('verify catches an edit, a deletion and a swap at the right entry', () => {
  const edit = verify(tamper(entries, 'edit', 2), head);
  assert.equal(edit.ok, false);
  assert.equal(edit.failure.kind, 'hash mismatch');
  assert.equal(edit.failure.seq, 3);
  const del = verify(tamper(entries, 'delete', 2), head);
  assert.equal(del.ok, false);
  assert.equal(del.failure.kind, 'sequence break');
  const swap = verify(tamper(entries, 'reorder', 3), head);
  assert.equal(swap.ok, false);
  assert.equal(swap.failure.kind, 'sequence break');
});

test('a cut-off tail is caught by the head commitment, not by the chain alone', () => {
  const cut = tamper(entries, 'truncate');
  assert.ok(cut.length < entries.length);
  assert.equal(verify(cut).ok, true);
  const v = verify(cut, head);
  assert.equal(v.ok, false);
  assert.equal(v.failure.kind, 'head mismatch');
});
