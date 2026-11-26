// Simulated personal ledger: canonical JSON, SHA-256 hash chain, head commitment and verify
// (SPEC FR-22 to FR-24, PLAN D-06). Signatures are part of the real ledger (Ed25519); this
// simulation shows the hash chain and head commitment only, and says so on screen.
import { sha256 } from './sha256.js';

export const DOMAIN = 'wayfinder-ledger-v1';
export const ZERO = '0'.repeat(64);

/** Canonical JSON: sorted keys, no whitespace, undefined dropped. */
export function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
}

export function hashEntry(entry) {
  const { entryHash, ...unsigned } = entry;
  return sha256(`${DOMAIN}\u0000${canonical(unsigned)}`);
}

/** Turn ordered drafts into a hash-chained ledger. `atOf(i)` gives each entry's timestamp. */
export function buildChain(runId, drafts, atOf) {
  const out = [];
  let prev = ZERO;
  drafts.forEach((d, i) => {
    const e = { v: 1, runId, seq: i + 1, at: atOf(i), ...d, prevHash: prev };
    e.entryHash = hashEntry(e);
    prev = e.entryHash;
    out.push(e);
  });
  return out;
}

export function headOf(runId, entries) {
  const last = entries[entries.length - 1];
  return { runId, count: entries.length, finalHash: last ? last.entryHash : ZERO };
}

/**
 * Check sequence, chain links and entry hashes, then the head commitment. Reports the first
 * observable failure only (FR-24): it does not claim to know which tampering was done.
 */
export function verify(entries, head) {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.seq !== i + 1) return { ok: false, checked: i, failure: { seq: e.seq, at: i, kind: 'sequence break', detail: `expected entry ${i + 1}, found ${e.seq}` } };
    const prev = i ? entries[i - 1].entryHash : ZERO;
    if (e.prevHash !== prev) return { ok: false, checked: i, failure: { seq: e.seq, at: i, kind: 'chain break', detail: 'prevHash does not match the entry before it' } };
    if (hashEntry(e) !== e.entryHash) return { ok: false, checked: i, failure: { seq: e.seq, at: i, kind: 'hash mismatch', detail: 'the entry’s content no longer matches its hash' } };
  }
  if (head) {
    const last = entries[entries.length - 1];
    if (head.count !== entries.length || head.finalHash !== (last ? last.entryHash : ZERO)) {
      return { ok: false, checked: entries.length, failure: { seq: Math.min(entries.length, head.count) || 0, at: entries.length - 1, kind: 'head mismatch', detail: `head commitment says ${head.count} entries ending ${head.finalHash.slice(0, 10)}…; the file has ${entries.length}` } };
    }
  }
  return { ok: true, checked: entries.length, failure: null };
}

/** Tampering for the demo: returns a modified copy, leaving the original untouched. */
export function tamper(entries, how, index) {
  const copy = entries.map((e) => ({ ...e, body: e.body && typeof e.body === 'object' ? { ...e.body } : e.body }));
  const i = Math.max(0, Math.min(copy.length - 1, index));
  if (how === 'edit') copy[i].body = { ...copy[i].body, edited: 'quietly changed after the fact' };
  else if (how === 'delete') copy.splice(i, 1);
  else if (how === 'truncate') copy.splice(Math.max(1, copy.length - 3));
  else if (how === 'reorder' && i > 0) [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
  return copy;
}
