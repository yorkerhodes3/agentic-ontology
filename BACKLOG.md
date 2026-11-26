# BACKLOG: Wayfinder v0.4

> **Purpose of this document:** the living, ordered list of work. One line per item,
> small enough to finish in a sitting, traceable back to the specification.
> **Input:** [`SPECIFICATION.md`](./SPECIFICATION.md) (what) + [`PLAN.md`](./PLAN.md) (order).
> **Rule:** the top of `Now` is always the next thing you pick up.

| Field | Value |
| --- | --- |
| Last groomed | 2026-11-26 |
| Current milestone | M1: local stack go/no-go (due 2026-12-18) |

---

## How to read this file

- **ID:** stable identifier, e.g. `T-014`. Never reuse an ID.
- **Ref:** the spec requirement, story or acceptance ID this serves (`FR-03`, `US-01`,
  `A-15`), or `infra`.
- **Size:** `S` (< 1 h), `M` (a few hours), `L` (a day or more; usually should be split).
  The number in brackets is the base estimate used in PLAN §10, before the 1.5× buffer.
- **Status:** `todo` / `doing` / `blocked` / `review` / `done`.
- Items in `Now` have acceptance criteria. Items in `Later` may be one-liners.

---

## 🔥 Now: M1, local stack go/no-go (2026-11-30 → 2026-12-18)

| ID | Task | Ref | Size | Status | Acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| T-027 | Platform profiles and `wf doctor` (prerequisite checks only; sandbox tests join in T-017): `deploy/platforms/{macos,mac-studio-m5-ultra,windows,b3iq,linux}.{yml,env}` per SPEC §9.1, and a zero-dependency `wf doctor` that detects OS, architecture, runtime and version, memory, disk, GPU, local models and port availability, then recommends a profile and model tier. | FR-42, FR-43, D-17 | M (3 h) | todo | Given recorded probe outputs for each of the five platforms (fixtures in `test/platforms/`), when `node --test` runs, then `wf doctor` recommends the matching profile and tier for each. Given the primary machine, when `wf doctor` runs, then it prints the profile, the tier and every failed prerequisite, with a fix for each. |
| T-001 | Generate a TrustGraph v2.11 Docker Compose config with `npx @trustgraph/config` (Ollama provider; decision-scoring and Cloze services if offered). Start it, and record machine specs, image tags and digests, and start-up time in `research/m1-go-no-go.md`. | OQ-01, infra | M (3 h) | todo | Given the generated config, when `docker compose up -d` runs, then every TrustGraph container reports healthy within 10 min and the `tg-*` CLI lists at least one flow. The note records CPU, RAM, GPU (if any), free disk and the image digests. |
| T-002 | Pull 2 candidate open-weight instruct models into Ollama. Smoke-test TrustGraph text completion with each, and record tag, digest, size and tokens per second. | OQ-02, D-09 | S (1 h) | todo | Given each model, when a fixed 200-token prompt runs through TrustGraph, then a completion returns and the note records its speed. |
| T-003 | Write `ontology/wayfinder.ttl`: the 15 classes and **every property in SPEC §7.1's property table**, with domain, range or datatype, *critical* and *single* markers, and subclass links (BankStatement and IncomeLetter under FinancialRecord). | FR-01, FR-02, FR-03, FR-08 | M (3 h) | todo | Given the file, when parsed as Turtle, then it reports 0 errors and exactly 15 classes. When `node test/check-ontology.mjs` compares it with the SPEC table, then every property, domain, range, critical and single marker matches. |
| T-004 | Load the ontology into TrustGraph (JSON ontology config or Turtle import; resolve OQ-03) and write down the exact steps. | OQ-03, FR-01 | M (2 h) | todo | Given the loaded ontology, when TrustGraph's ontology list is queried, then `wayfinder` appears with 15 classes. The steps are in `research/m1-go-no-go.md`. |
| T-005 | Create the 12 synthetic persona documents for fixture F-P, including the planted traps (health canary, stale address, passport-validity conflict, and the 3 malformed facts in SPEC §7.1). | A-01–A-03, A-06 | M (2 h) | todo | Given `fixtures/persona/`, then 12 documents exist, each trap is tagged in `fixtures/persona/TRAPS.md`, and a checklist in that folder confirms no real names, addresses or identifiers. |
| T-025 | Write the gold set for F-P: 50 labelled facts in `gold.jsonl`, 10 marked critical, each with its source document. | A-01, A-02 | M (2 h) | todo | Given `gold.jsonl`, then it has 50 rows, 10 with `critical: true`, and every row names a document that exists in `fixtures/persona/`. |
| T-006 | Run OntologyRAG extraction on F-P with each candidate model. Score precision and recall against the gold set with a small script, and check whether the 3 malformed facts were rejected. **Decide go / no-go** for live extraction and record it. | A-01, A-03, OQ-01, OQ-02 | M (3 h) | todo | Given extraction output, when `node test/score-extraction.mjs` runs, then it prints precision, recall, per-class counts and which malformed facts were rejected. The decision (live or fixture, and which model) is recorded with the numbers. Any malformed fact TrustGraph did not reject is noted for the gate's own validator (T-026). |

## ⏭️ Next: M2, gate and ledger (2026-12-21 → 2027-01-29, no work 12-28 → 01-01)

| ID | Task | Ref | Size | Notes |
| --- | --- | --- | --- | --- |
| T-010 | Canonical JSON, entry hashing with domain separator, Ed25519 signing (test keys + local key generation) | FR-22, D-06, D-07 | M (2 h) | Unit tests with fixed vectors |
| T-011 | Ledger append, seal, head commitment stored outside the run directory | FR-23 | M (2 h) | |
| T-012 | `wf ledger verify` with failure kinds; tamper-trial generator (5 × 7 kinds = 35) | FR-24, A-15 | M (3 h) | |
| T-013 | Gate MCP server (minimal JSON-RPC subset over HTTP); tool registry with action classes | FR-11, FR-13, D-05 | M (3 h) | OQ-05 |
| T-014 | Rule engine: precedence, consent rules with subclass coverage, hard bans, approvals with 24 h expiry | FR-08–FR-12, FR-15 | M (4 h) | |
| T-015 | Write-before-dispatch, fail closed, `actionId` / `attemptId` with persisted action states, adapter deduplication, resume re-validation, retries | FR-14, FR-16, FR-17, A-16 | M (4 h) | Fault-injection tests: crash before dispatch; crash after effect before acknowledgement |
| T-016 | Gate audit log with an `eventId` for every A-14 event (including denied calls) + `wf ledger reconcile` | FR-25, A-14 | M (2 h) | |
| T-017 | Compose: `wf-sandbox` (internal) and `wf-backend` networks; no published backend ports during runs (`admin` profile on 127.0.0.1); `DOCKER-USER` allow-only-gate rule where Docker Engine runs; FR-13 negative tests (host gateway, published ports, `host.docker.internal`) built into `wf doctor`, with fail-closed `wf run` | FR-13, FR-43, D-04 | M (4 h) | |
| T-018 | Quarantined reader with typed message schemas; free text display-only | FR-19 | M (3 h) | |
| T-019 | Local trusted list; trust check at first contact and before each disclosure | FR-20, A-13 | S (1 h) | |
| T-020 | Decision-model adapter; `signal.scored`; `unknown` → ask | FR-18 | S (1 h) | |
| T-021 | S4 fixtures: 10 attacks (3 inside valid fields), permitted Quote disclosures, a trusted-list change mid-run; attack outcomes and the person's summary; harness checks A-12 and A-13 | FR-21, A-12, A-13 | M (3 h) | |
| T-022 | Scenario agent with adversarial mode | D-15 | M (3 h) | |
| T-023 | `wf status` | FR-27, US-18 | S (1 h) | |
| T-007 | Decision-model smoke test through TrustGraph (choice, score, yes/no); p95 latency; stopped service maps to `unknown` | FR-18, D-10 | S (1 h) | Moved from M1 |
| T-026 | Gate-side ontology validator (datatype, domain, range) as a second check after TrustGraph's | FR-02, A-03 | M (2 h) | |

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
| T-028 | Platform matrix: `macos` (Apple silicon, Docker Desktop, native Ollama): `wf doctor` clean, test-mode S3/S4 ledgers byte-identical to CI | FR-42, US-20 | M5 (2 h) |
| T-029 | Platform matrix: `windows` (WSL 2 Docker Engine; also note Docker Desktop results) | FR-42, US-20 | M5 (3 h) |
| T-038 | Platform matrix: `b3iq` over SSH, loopback-only ports, containerised Ollama with GPU if the node has one; needs OQ-09 | FR-42, US-20, OQ-09 | M5 (2 h) |
| T-039 | Platform matrix: `mac-studio-m5-ultra` model tier `xl` (both models loaded; record the GPU memory setting); `not validated` if OQ-10 says no hardware | FR-42, US-20, OQ-10 | M5 (1 h) |
| T-040 | Gate reads from TrustGraph with purpose filtering; confirm and retract facts | FR-03, FR-09, FR-10 | M4 |
| T-041 | S1: hotel fixture, draft-not-pay, approvals, "why this hotel?" | A-01–A-05 | M4 |
| T-042 | Fixture mode for beliefs | FR-04 | M4 (needed only if M1 says no-go) |
| T-008 | Timeboxed 4-hour spike on TrustGraph SHACL-AF policy and user-context coverage (GraphRAG, SPARQL, agent, MCP) | OQ-04 | Should; nothing depends on it |
| T-043 | S2: claims, expiry, conflicts, plan-invalidation stop | FR-05–FR-07, A-06 | Should |
| T-044 | A-18 baseline: structured profile with JSON Schema | FR-39, A-18 | Should |
| T-045 | PROV-O Turtle export of the ledger | FR-26 | Should |
| T-046 | Determinism check in CI | FR-38 | M2/M3 |
| T-050 | Harness report (JSON + Markdown) covering every A-ID | FR-37 | M5 |
| T-051 | Publish report, recorded runs and readouts on the site | FR-40 | M5 |
| T-052 | README run guide; tag `v0.4.0` | DoD | M5 |
| T-053 | A-17 usability check with 3 people | A-17 | After M5 (by 2027-04-02) |
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
| T-092 | SPECIFICATION, PLAN and BACKLOG approved (with platform adapters) | Planning | 2026-11-26 | [#3](https://github.com/yorkerhodes3/agentic-ontology/pull/3) |
| T-009 | Code scaffolding: `package.json` (no dependencies, Apache-2.0), `node:test`, CI on pull requests (done early with the site redesign) | infra | 2026-11-26 | [#4](https://github.com/yorkerhodes3/agentic-ontology/pull/4) |
| T-093 | Site redesign: Neocloud design system with selectable style guides (CoLab default, MetaMask added), Neocloud-style top menu with platform switcher, title "Wayfinder - Agentic Ontology", favicon, social preview | US-17 | 2026-11-26 | [#4](https://github.com/yorkerhodes3/agentic-ontology/pull/4) |

---

## 🐞 Bugs

| ID | Symptom | Steps to reproduce | Severity | Status |
| --- | --- | --- | --- | --- |
| | | | | |

## ❓ Questions for the reviewer

| ID | Question | Asked | Answered |
| --- | --- | --- | --- |
| Q-01 | Which of the five profiles is the **primary** machine for M1 (and its CPU, memory, GPU, free disk)? All five ship; M1 is run on one first. | 2026-11-25 | Partly: all of macOS, Windows, B3IQ and Mac Studio M5 Ultra are targets (2026-11-26); primary still to choose |
| Q-02 | Is ~12 h/week right? At that rate v0.4 lands on 2027-03-19 (PLAN §10). More hours bring the date forward; fewer trigger PLAN §11. | 2026-11-25 | |
| Q-03 | Push-triggered Pages deploys made by an automation token show **action required**. Approve them in the Actions tab, or keep using **Run workflow**? | 2026-11-25 | |

---

## Grooming checklist (run this weekly)

- [ ] Everything in `Now` is sized `S` or `M` and has acceptance criteria
- [ ] Every item in `Now` traces to a spec requirement, or has been justified
- [ ] Finished work moved to `Done` with its PR number
- [ ] Blocked items have a named person and a date
- [ ] New ideas from the week are in `Later`, not silently in `Now`
- [ ] The top item in `Now` is genuinely the most valuable next thing
