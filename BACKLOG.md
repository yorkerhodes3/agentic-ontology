# BACKLOG: Wayfinder v0.4

> **Purpose of this document:** the living, ordered list of work. One line per item,
> small enough to finish in a sitting, traceable back to the specification.
> **Input:** [`SPECIFICATION.md`](./SPECIFICATION.md) (what) + [`PLAN.md`](./PLAN.md) (order).
> **Rule:** the top of `Now` is always the next thing you pick up.

| Field | Value |
| --- | --- |
| Last groomed | 2026-11-25 |
| Current milestone | M1: local stack go/no-go (due 2026-12-04) |

---

## How to read this file

- **ID:** stable identifier, e.g. `T-014`. Never reuse an ID.
- **Ref:** the spec requirement, story or acceptance ID this serves (`FR-03`, `US-01`,
  `A-15`), or `infra`.
- **Size:** `S` (< 1 h), `M` (a few hours), `L` (a day or more; usually should be split).
- **Status:** `todo` / `doing` / `blocked` / `review` / `done`.
- Items in `Now` have acceptance criteria. Items in `Later` may be one-liners.

---

## 🔥 Now: M1, local stack go/no-go (week of 2026-11-30)

| ID | Task | Ref | Size | Status | Acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| T-001 | Generate a TrustGraph v2.11 Docker Compose config with `npx @trustgraph/config` (Ollama provider; decision-scoring and Cloze services if offered). Start it, and record machine specs, image tags and digests, and start-up time in `research/m1-go-no-go.md`. | OQ-01, infra | M | todo | Given the generated config, when `docker compose up -d` runs, then every TrustGraph container reports healthy within 10 min and the `tg-*` CLI lists at least one flow. The note records CPU, RAM, GPU (if any), free disk and the image digests. |
| T-002 | Pull 2 candidate open-weight instruct models into Ollama. Smoke-test TrustGraph text completion with each, and record tag, digest, size and tokens per second. | OQ-02, D-09 | S | todo | Given each model, when a fixed 200-token prompt runs through TrustGraph, then a completion returns and the note records its speed. |
| T-003 | Write `ontology/wayfinder.ttl`: the 15 classes and their properties from SPEC §7.1, with *critical* properties marked and subclass links (BankStatement and IncomeLetter under FinancialRecord). | FR-01, FR-02, FR-03, FR-08 | M | todo | Given the file, when parsed as Turtle (for example by the TrustGraph import in T-004), then it reports 0 errors and exactly 15 classes, and both subclass links resolve. |
| T-004 | Load the ontology into TrustGraph (JSON ontology config or Turtle import; resolve OQ-03) and write down the exact steps. | OQ-03, FR-01 | M | todo | Given the loaded ontology, when TrustGraph's ontology list is queried, then `wayfinder` appears with 15 classes. The steps are in `research/m1-go-no-go.md`. |
| T-005 | Create fixture F-P: 12 synthetic persona documents, a gold set of 50 labelled facts (10 critical), and the planted traps listed in CONCEPT §5 (health canary, stale address, passport-validity conflict, 3 malformed facts). | A-01–A-03, A-06 | M | todo | Given `fixtures/persona/`, then 12 documents and `gold.jsonl` with 50 rows exist, 10 marked `critical: true`, each trap tagged. A scan finds no real names, addresses or identifiers (a checklist in the README of the folder). |
| T-006 | Run OntologyRAG extraction on F-P with each candidate model. Score precision and recall against the gold set with a small script. **Decide go / no-go** for live extraction and record it. | A-01, OQ-01, OQ-02 | M | todo | Given extraction output, when `node test/score-extraction.mjs` runs, then it prints precision, recall and per-class counts. The decision (live or fixture, and which model) is recorded with the numbers. |
| T-007 | Smoke-test the decision models through TrustGraph: one choice, one score and one yes/no call. Record latency. | FR-18, D-10 | S | todo | Given 20 calls of each kind, then p95 latency is recorded, and a stopped service produces an error the gate can map to `unknown`. |
| T-008 | Timeboxed 4-hour spike: what do TrustGraph's SHACL-AF policies and user context (Purpose) cover on GraphRAG, SPARQL, agent and MCP paths? | OQ-04 | M | todo | A one-page finding in `research/policy-coverage.md` lists each path as covered / not covered / unknown, with the command used to test it. Nothing else depends on it. |
| T-009 | Code scaffolding: `package.json` (no dependencies, `"license": "Apache-2.0"`), `node:test` setup, and a CI workflow that runs `npm test` on pull requests. | infra, D-02, D-14 | S | todo | Given a pull request, when CI runs, then `npm test` passes with one placeholder test, and `npm ls --omit=dev` lists no packages. |

## ⏭️ Next: M2, gate and ledger (weeks of 2026-12-07 and 2026-12-14)

| ID | Task | Ref | Size | Notes |
| --- | --- | --- | --- | --- |
| T-010 | Canonical JSON, entry hashing with domain separator, Ed25519 signing (test keys + local key generation) | FR-22, D-06, D-07 | M | Unit tests with fixed vectors |
| T-011 | Ledger append, seal, head commitment stored outside the run directory | FR-23 | M | |
| T-012 | `wf ledger verify` with failure kinds; tamper-trial generator (5 × 7 kinds = 35) | FR-24, A-15 | M | |
| T-013 | Gate MCP server (minimal JSON-RPC subset over HTTP); tool registry with action classes | FR-11, FR-13, D-05 | M | OQ-05 |
| T-014 | Rule engine: precedence, consent rules with subclass coverage, hard bans, approvals with 24 h expiry | FR-08–FR-12, FR-15 | M | |
| T-015 | Write-before-dispatch, fail closed, idempotency keys, resume re-validation, retries | FR-14, FR-16, FR-17, A-16 | M | Fault-injection tests |
| T-016 | Dispatch log + `wf ledger reconcile` | FR-25, A-14 | S | |
| T-017 | Compose: `wf-sandbox` (internal) and `wf-backend` networks; agent and gate containers; egress tests | FR-13, D-04 | M | |
| T-018 | Quarantined reader with typed message schemas; free text display-only | FR-19 | M | |
| T-019 | Local trusted list; trust check at first contact and before each disclosure | FR-20, A-13 | S | |
| T-020 | Decision-model adapter; `signal.scored`; `unknown` → ask | FR-18 | S | |
| T-021 | S4 fixtures: 10 attacks, 3 inside valid fields; attack outcomes and the person's summary; harness checks A-12 and A-13 | FR-21, A-12, A-13 | M | |
| T-022 | Scenario agent with adversarial mode | D-15 | M | |
| T-023 | `wf status` | FR-27, US-18 | S | |

## 🧊 Later: M3–M5, Should items, and after v0.4

| ID | Task | Ref | Why not now |
| --- | --- | --- | --- |
| T-030 | Vendor the Neocloud engine (`nego/*.js`, `lib/rng.js`) at `96a6161` with LICENSE and NOTICE | D-11 | M3 |
| T-031 | Lease scenarios F-L1 (feasible) and F-L2 (infeasible); calibrate with the engine's `analyse` | FR-32, R-05 | M3 |
| T-032 | Mandate form, rank-order centroid weights, sanity check, signing; replacement mandates; hard-ban rejection | FR-28, FR-30 | M3 |
| T-033 | Route every offer through the gate; AI and mandate disclosure in messages; `decision.made` per concession | FR-29, FR-31 | M3 |
| T-034 | Clause state machine | FR-33 | M3 |
| T-035 | Readout (HTML + plain text) and `wf why` | FR-34, FR-35 | M3 |
| T-036 | Seat view with allow-list and canary test | FR-36, A-11 | M3 |
| T-037 | S3 harness: 160 runs, A-07–A-11 | A-07–A-11 | M3 |
| T-040 | Gate reads from TrustGraph with purpose filtering; confirm and retract facts | FR-03, FR-09, FR-10 | M4 |
| T-041 | S1: hotel fixture, draft-not-pay, approvals, "why this hotel?" | A-01–A-05 | M4 |
| T-042 | Fixture mode for beliefs | FR-04 | M4 (needed only if M1 says no-go) |
| T-043 | S2: claims, expiry, conflicts, plan-invalidation stop | FR-05–FR-07, A-06 | Should |
| T-044 | A-18 baseline: structured profile with JSON Schema | FR-39, A-18 | Should |
| T-045 | PROV-O Turtle export of the ledger | FR-26 | M4 |
| T-046 | Determinism check in CI | FR-38 | M2/M3 |
| T-050 | Harness report (JSON + Markdown) covering every A-ID | FR-37 | M5 |
| T-051 | Publish report, recorded runs and readouts on the site | FR-40 | M5 |
| T-052 | README run guide; tag `v0.4.0` | DoD | M5 |
| T-053 | A-17 usability check with 3 people | A-17 | After M5 (2027-02-12) |
| T-054 | Five interviews and one written incident | CONCEPT Q2 | Runs alongside; by 2027-01-08 |
| T-060 | TrustGraph agent orchestrator through the gate | US-19, FR-41 | Could |
| T-061 | Hosted LLM adapter, network counterparty transport, SATM / ERC-8004 identity, public hash anchoring | D-16 | After v0.4 (hosted services excluded) |
| T-062 | LLM-written negotiation messages, compared with the deterministic engine | CONCEPT §8 | After v0.4 |
| T-063 | Delegation (a second person acting for the first) | CONCEPT §6 | After v0.4 |

## ⛔ Blocked

| ID | Task | Blocked by | Since | Who can unblock |
| --- | --- | --- | --- | --- |
| | | | | |

## ✅ Done

| ID | Task | Ref | Completed | PR |
| --- | --- | --- | --- | --- |
| T-000 | Repository created; concept approved (v0.4) | CONCEPT | 2026-11-25 | [#1](https://github.com/yorkerhodes3/agentic-ontology/pull/1) |
| T-090 | Apache-2.0 licence; project site deployed to GitHub Pages | M0 | 2026-11-25 | [#2](https://github.com/yorkerhodes3/agentic-ontology/pull/2) |
| T-091 | Neocloud Supply OS and DTSF licensed Apache-2.0 (enables D-11 reuse) | CONCEPT Q14 | 2026-11-25 | Direct commits `96a6161` (Neocloud) and `725db57` (DTSF) |

---

## 🐞 Bugs

| ID | Symptom | Steps to reproduce | Severity | Status |
| --- | --- | --- | --- | --- |
| | | | | |

## ❓ Questions for the reviewer

| ID | Question | Asked | Answered |
| --- | --- | --- | --- |
| Q-01 | What machine will run the stack (CPU, RAM, GPU, free disk)? T-001 records it, but knowing now helps pick T-002's candidate models. | 2026-11-25 | |
| Q-02 | Is ~12 h/week until 2027-01-29 right? If not, PLAN §11's cut list applies. | 2026-11-25 | |
| Q-03 | Push-triggered Pages deploys made by an automation token show **action required**. Approve them in the Actions tab, or keep using **Run workflow**? | 2026-11-25 | |

---

## Grooming checklist (run this weekly)

- [ ] Everything in `Now` is sized `S` or `M` and has acceptance criteria
- [ ] Every item in `Now` traces to a spec requirement, or has been justified
- [ ] Finished work moved to `Done` with its PR number
- [ ] Blocked items have a named person and a date
- [ ] New ideas from the week are in `Later`, not silently in `Now`
- [ ] The top item in `Now` is genuinely the most valuable next thing
