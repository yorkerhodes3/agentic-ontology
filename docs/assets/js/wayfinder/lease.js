// S3 lease-renewal fixtures for the vendored Neocloud negotiation engine (PLAN D-11, SPEC FR-32).
// Pure data, Node-importable. All parties are synthetic.
//
// F-L1 (feasible): both sides' acceptable outcomes overlap inside the tenant's mandate.
// F-L2 (infeasible): the landlord's walk-away is so strong that any overlap lies outside the
// mandate, so the tenant agent must escalate or walk away and never settle (A-08).

const fmtInt = (n) => String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const range = (a, b, step) => { const o = []; for (let v = a; v <= b + 1e-9; v += step) o.push(+v.toFixed(4)); return o; };

export const PERSONA = { name: 'Alex Rivera', note: 'synthetic persona' };

/** Mandate ranking → rank-order centroid weights (SPEC FR-28). */
export function rocWeights(n) {
  return Array.from({ length: n }, (_, i) => { let s = 0; for (let k = i + 1; k <= n; k++) s += 1 / k; return s / n; });
}

const ISSUES = [
  { id: 'rent', label: 'Monthly rent', short: 'rent', unit: '$/month', levels: range(1800, 2100, 25), fmt: (v) => `$${fmtInt(v)}`, us: 'low', them: 'high', money: true },
  { id: 'term', label: 'Term', short: 'term', unit: 'months', levels: [6, 12, 18, 24], fmt: (v) => `${v} months`, us: [0.15, 1, 0.85, 0.35], them: [0, 0.55, 0.85, 1] },
  { id: 'increase', label: 'Next-year increase', short: 'incr', unit: '', levels: ['0%', '3%', '5%', 'uncapped'], fmt: (v) => v, us: [1, 0.65, 0.3, 0], them: [0, 0.5, 0.8, 1] },
  { id: 'repair', label: 'Repair response', short: 'repair', unit: '', levels: ['14 days', '7 days', '72 hours'], fmt: (v) => v, us: [0, 0.6, 1], them: [1, 0.6, 0] },
  { id: 'fee', label: 'Early-termination fee', short: 'fee', unit: 'months of rent', levels: [0, 1, 2], fmt: (v) => `${v} month${v === 1 ? '' : 's'}`, us: [1, 0.55, 0], them: [0, 0.6, 1] },
  { id: 'data', label: 'Tenant data shared', short: 'data', unit: '', levels: ['none', 'income letter', 'bank statements'], fmt: (v) => v, us: [1, 0.75, 0], them: [0, 0.85, 1] },
];

// The person's ranking, most important first; weights are rank-order centroid values.
export const TENANT_RANKING = ['rent', 'increase', 'term', 'repair', 'fee', 'data'];
const ROC = rocWeights(TENANT_RANKING.length);
const TENANT_WEIGHTS = Object.fromEntries(TENANT_RANKING.map((id, i) => [id, +ROC[i].toFixed(4)]));

const MANDATE = {
  id: 'MND-LEASE-001', version: 'v1', issuer: `${PERSONA.name} (the person, signed in the mandate form)`,
  humanOwner: `${PERSONA.name} · the person`,
  scope: 'Lease renewal for the current flat', supplierTier: 'unverified landlord agent',
  shouldCost: { issue: 'rent', value: 1925, band: 0.013, label: 'Comparable flat ≈ $1,925/month plus moving costs' },
  validTo: '14 days from signing',
  rules: [
    { id: 'M1', issue: 'rent', op: 'max', value: 1950, label: 'Rent ≤ $1,950/month', kind: 'cap' },
    { id: 'M2', issue: 'term', op: 'in', value: [12, 18], label: 'Term 12–18 months', kind: 'cap' },
    { id: 'M3', issue: 'increase', op: 'in', value: ['0%', '3%', '5%'], label: 'No uncapped increase', kind: 'cap' },
    { id: 'M4', issue: 'fee', op: 'max', value: 1, label: 'Early-termination fee ≤ 1 month', kind: 'cap' },
    { id: 'M5', issue: 'data', op: 'in', value: ['none', 'income letter'], label: 'Bank statements never (hard ban)', kind: 'hard-ban' },
  ],
};

// The person's walk-away: the comparable flat, with moving costs spread over the first year.
const TENANT_BATNA = { description: 'Comparable flat at $1,925/month plus moving costs (about $2,000/month over the first year)', terms: { rent: 2000, term: 12, increase: '5%', repair: '7 days', fee: 1, data: 'income letter' }, estimatedValue: 2000 };

const SEATS = [
  { key: 'us', id: 'wayfinder-tenant', name: 'Wayfinder (for Alex)', role: 'Tenant agent · acts for Alex Rivera', side: 'tenant', color: '--s1' },
  { key: 'them', id: 'harbor-lettings', name: 'Harbor Lettings agent', role: 'Landlord agent · synthetic counterparty', side: 'landlord', color: '--s3' },
];

const base = {
  subject: 'renewal of the lease on the current flat',
  defaultRounds: 8,
  defaultStyle: 'boulware',
  seats: SEATS,
  issues: ISSUES,
  mandate: MANDATE,
  jitter: { weight: 0.2, reservation: 0.03 },
};

export const LEASE_SCENARIOS = {
  'lease-f-l1': {
    ...base, id: 'lease-f-l1', code: 'F-L1', title: 'Lease renewal · feasible (F-L1)', counterparty: 'Harbor Lettings',
    blurb: 'Both sides can agree inside Alex’s mandate. The tenant agent should usually settle; only Alex agrees.',
    weights: {
      us: TENANT_WEIGHTS,
      them: { rent: 0.40, term: 0.18, increase: 0.17, fee: 0.10, data: 0.10, repair: 0.05 },
    },
    batna: {
      us: TENANT_BATNA,
      them: { description: 'Re-let after a vacancy at about $1,875/month', terms: { rent: 1875, term: 12, increase: '3%', repair: '7 days', fee: 1, data: 'income letter' }, estimatedValue: 1875 },
    },
  },
  'lease-f-l2': {
    ...base, id: 'lease-f-l2', code: 'F-L2', title: 'Lease renewal · infeasible (F-L2)', counterparty: 'Harbor Lettings',
    blurb: 'The landlord can re-let for much more, so any deal lies outside Alex’s mandate. The agent must escalate or walk away, never settle.',
    weights: {
      us: TENANT_WEIGHTS,
      them: { rent: 0.46, term: 0.16, increase: 0.14, fee: 0.08, data: 0.12, repair: 0.04 },
    },
    batna: {
      us: TENANT_BATNA,
      them: { description: 'A waiting tenant at $2,075/month for 24 months', terms: { rent: 2075, term: 24, increase: '5%', repair: '14 days', fee: 2, data: 'bank statements' }, estimatedValue: 2075 },
    },
  },
};

export const LEASE_ORDER = ['lease-f-l1', 'lease-f-l2'];
