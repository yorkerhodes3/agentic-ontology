# SPECIFICATION: Wayfinder v0.4

> **Purpose of this document:** define *what the system does* precisely enough that two
> different people (or two different AI agents) would build roughly the same thing.
> **Input:** the approved [`CONCEPT-IDEA.md`](./CONCEPT-IDEA.md) (v0.4).
> **Output:** the source of truth for `PLAN.md` and `BACKLOG.md`.
> **Rule:** describe behaviour, data and rules, not implementation details not yet decided.
> Technology choices live in `PLAN.md`.

| Field | Value |
| --- | --- |
| Status | `In review` |
| Concept doc | [CONCEPT-IDEA.md](./CONCEPT-IDEA.md) (v0.4, approved 2026-11-25) |
| Author | @yorkerhodes3 (drafted with an AI assistant, guide prompt #2) |
| Reviewer(s) | Not yet assigned |
| Version | 0.1.0 (targets release v0.4) |
| Last updated | 2026-11-25 |

> **Acceptance IDs.** `A-xx` refers to the acceptance matrix in CONCEPT-IDEA §5, which is
> the single source of truth for pass rules. Every functional requirement below names
> the `A-xx` it serves, or gives its own Given/When/Then.

---

## 1. Summary

Wayfinder is a personal AI agent that acts from a small ontology of its person's world
(what it may believe), under consent rules (what it may reveal) and signed mandates
(what it may do). It records every step in a tamper-evident personal ledger (why it did
it).

v0.4 runs entirely on one machine, in containers, with local LLMs and local decision
models. It is tested by four synthetic scenarios:

- **S1:** travel booking;
- **S2:** stale or conflicting outside information;
- **S3:** an agent-to-agent lease negotiation inside a mandate;
- **S4:** a hostile counterparty.

**The agent in v0.4.** The agent is a small **scenario agent** that runs in a
sandboxed container. It follows each scenario's script and can act **only** through
the gate's tools. It also has an **adversarial mode** that attempts every forbidden
action, to test that the gate holds whatever the agent proposes. Connecting
TrustGraph's own agent orchestrator to the gate is a stretch goal (US-19).

## 2. Goals and non-goals

**Goals (v0.4 must achieve):**

1. Every `Must` row of the acceptance matrix passes (A-01–A-05, A-07–A-16). A-01 may
   instead be reported as "not measured" with a recorded reason, if the M1 go/no-go
   forces the fixture fallback.
2. The person can see, for any run, what the agent believed, revealed and did, and why,
   from the ledger alone.
3. After S3, the person can see clause by clause what their agent negotiated and how
   close each term came to their limits.
4. The whole system starts on one machine from the README with local models only, and
   no hosted services are required.
5. A scenario report and recorded synthetic runs are published on the project site.

**Non-goals (explicitly not in v0.4):** everything in CONCEPT-IDEA §6. In particular:

- no real-world actions, real data or real counterparties;
- no hosted services;
- no arbitrary MCP agents;
- no contract editor;
- no live web;
- no LLM-written offers;
- no on-chain anything.

## 3. Users and permissions

| Role | Can do | Cannot do |
| --- | --- | --- |
| **Site visitor** (not signed in) | Read the project site, recorded runs and readouts | Anything else; the site is static |
| **Person** (the owner; also runs the scenarios in v0.4) | Add documents; confirm or retract facts; write consent rules; sign, replace or revoke mandates; approve or decline actions; mark clauses `agreed`; read, verify and export the ledger; seal runs | Lift a hard ban with a mandate; edit or delete individual ledger entries (corrections are new entries); deleting a whole run is allowed and is recorded in the run index |
| **Agent** (non-human principal, sandboxed) | Call the gate's tools; receive only what the gate returns; propose drafts, offers and clause text | Reach any service except the gate; see denied facts; use commit-class tools without a valid approval; mark a clause `agreed`; read the ledger keys or the person's private negotiation brief |
| **Gate** (system) | Evaluate rules; filter reads; dispatch allowed actions; write and seal the ledger; request approvals; call decision models | Act without first writing a ledger entry; override a hard ban; treat a signal as permission |
| **Counterparty agent** (synthetic, external to the person) | Send offers and messages; receive what the person's rules allow and its seat view | Reach the agent directly; see the person's limits, ranking, walk-away alternative or private evidence |

## 4. User stories

| ID | Story | Priority |
| --- | --- | --- |
| US-01 | As the **person**, I want to add my documents and see what the agent now believes, with the source of each fact, so that I know what it is working from. | Must |
| US-02 | As the **person**, I want critical facts (dates, amounts, identifiers) confirmed by me before use, so that a wrong extraction cannot drive an action. | Must |
| US-03 | As the **person**, I want consent rules written against kinds of information and purposes, so that new documents are covered without new rules. | Must |
| US-04 | As the **person**, I want the agent to draft and propose but never pay, submit or agree without my approval, so that I stay in control. | Must |
| US-05 | As the **person**, I want to ask "why?" about any decision and see the options, the rule that narrowed them and the sources, so that I can judge it. | Must |
| US-06 | As the **person**, I want to set a negotiation mandate by choosing best / acceptable / never levels and ranking issues, so that I don't have to do arithmetic. | Must |
| US-07 | As the **person**, I want my agent to negotiate only inside my mandate and to escalate rather than exceed it, so that it never agrees to what I wouldn't. | Must |
| US-08 | As the **person**, I want a clause-by-clause readout of what my agent negotiated and how close it came to my limits, so that I understand the deal before agreeing. | Must |
| US-09 | As the **person**, I want to be the only one who can mark a clause as agreed, so that agreement is always my act. | Must |
| US-10 | As the **person**, I want to share a redacted record with the counterparty that never reveals my limits or private evidence, so that transparency does not cost me leverage. | Must |
| US-11 | As the **person**, I want hostile agents to be unable to trick my agent into disclosing blocked information, and to be told when they try, so that I can deal with unknown parties safely. | Must |
| US-12 | As the **person**, I want to verify that the ledger has not been altered since it was sealed, so that I can rely on it. | Must |
| US-13 | As the **person**, I want to be told when outside information conflicts, is stale or breaks my plan, so that the agent doesn't act on bad information. | Should |
| US-14 | As the **person**, I want to correct or retract a fact the agent believes, so that its beliefs stay right. | Must |
| US-15 | As the **researcher** (the author), I want one command that runs every scenario and reports each acceptance ID with its denominator, so that success is judged on evidence. | Must |
| US-16 | As the **researcher**, I want to compare the ontology against a structured-profile baseline with the same gate and ledger, so that we know whether the ontology earns its keep. | Should |
| US-17 | As a **site visitor**, I want to read the concept, the scenario report and recorded readouts, so that I can understand and assess the project. | Must |
| US-18 | As the **person**, I want to see what the agent is doing now, including failures, retries and approvals waiting for me, so that nothing happens out of sight. | Must |
| US-19 | As the **researcher**, I want TrustGraph's agent orchestrator to run S1 through the gate as its only tool server, so that the gate is shown to work with a general agent. | Could |

## 5. Functional requirements

Grouped by area. "Ledger entry" means an entry of the named type written by the gate
**before** the effect it describes.

### 5.1 Belief (ontology and facts)

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-01 | The system shall load one ontology of at most 15 classes (§7.1) and extract facts from the person's documents with TrustGraph OntologyRAG. Each accepted fact shall be stored with its source document and that document's SHA-256 content hash, and recorded as `fact.accepted`. | US-01 | A-01. Given F-P is loaded, when extraction completes, then every stored fact has a source and content hash, and the number of `fact.accepted` entries equals the number of stored facts. |
| FR-02 | A candidate fact that violates the ontology (unknown class or property, domain, range or datatype) shall be rejected and recorded as `fact.rejected` with the violated constraint. | US-01 | A-03 |
| FR-03 | Properties marked *critical* in the ontology (dates, amounts, identifiers) shall make a fact unusable until the person confirms it (`fact.confirmed`). The person may retract any fact (`fact.retracted`); a retracted fact is never returned again. | US-02, US-14 | A-02. Given an unconfirmed critical fact, when the agent requests it, then the gate returns "needs confirmation", not the value. |
| FR-04 | If live extraction is unavailable, the system shall load pre-extracted facts marked `origin: fixture`, and the harness shall report A-01 as "not measured" with the reason. | US-15 | Given fixture mode, when the harness runs, then A-01 reads "not measured: fixture mode" and no fixture fact is labelled as extracted. |

### 5.2 The world (claims)

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-05 | Information from outside the person's own documents shall be stored as a claim. A claim records its source, retrieval time, content hash, trust level (`unverified` by default) and expiry (7 days for web snapshots), and is recorded as `claim.observed`. A claim becomes a fact only through `fact.confirmed`. | US-13 | Given a saved web snapshot, when it is loaded, then its statements are claims with `trust = unverified` and an expiry. |
| FR-06 | When two unexpired claims give different values for a single-valued property, the newer claim is preferred and the conflict is raised to the person with both sources and dates. An expired claim used in any output is flagged. | US-13 | A-06 |
| FR-07 | When a confirmed fact and an unexpired claim show that a plan cannot work (e.g. passport validity versus trip date under a destination rule), the agent shall stop, raise the problem, and draft nothing for that plan until the person replies. | US-13 | A-06 |

### 5.3 Consent and disclosure

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-08 | Consent rules shall be stated as (class, purpose, recipient kind) → allow or deny. A rule on a class also covers its subclasses. Some rules are **hard bans** that no mandate or approval can lift. | US-03 | A-04. Given a deny rule on `wf:FinancialRecord`, when a `wf:BankStatement` fact exists, then it is denied without a separate rule. |
| FR-09 | Every knowledge read by the agent shall carry a purpose. The gate returns only facts and claims allowed for that purpose; denied items are not revealed to exist. | US-03 | A-04 |
| FR-10 | Every outbound action shall list the facts it would disclose. Each is checked against consent for the action's purpose and recipient, and the action is recorded as `disclosure.made` naming each fact and the rule that allowed it. | US-03 | A-04, A-14 |

### 5.4 Actions and approvals

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-11 | Each tool shall have one action class: `read`, `draft`, `propose` or `commit`. `commit` tools (pay, submit, agree, send to a real party) need a valid approval. In v0.4, `commit` tools are stubs that record the attempt and never perform a real-world effect. | US-04 | A-05 |
| FR-12 | Approval requests shall be shown to the person with the action, the disclosures and the rule involved. Approvals expire after 24 hours and then count as declined. Requests and decisions are recorded as `approval.requested` and `approval.decided`. | US-04 | A-05. Given an approval older than 24 hours, when the agent calls the tool, then it is denied as "approval expired". |

### 5.5 Gate and sandbox

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-13 | The agent shall run where the only reachable destination is the gate's MCP port. That includes the host: backend services must not be reachable through the host's gateway address or any host-published port. The gate shall expose its tools over MCP. | US-11 | Given the running stack, when the agent container tries each of: backend container addresses (TrustGraph, Ollama, decision models), the sandbox gateway / host address on every host-published port, `host.docker.internal`, a DNS lookup of a public name, and a public IP address, then every attempt fails, and only the gate's MCP port answers. |
| FR-14 | The gate shall write the ledger entry for an action before dispatching it. If the ledger write or a rule evaluation fails, the action is not dispatched, the agent gets an error, and `step.failed` is recorded once the writer is available again. | US-12, US-18 | A-16 |
| FR-15 | Rule precedence: hard ban → consent deny → mandate → trust → approval → decision-model signal. A signal can only make an outcome more cautious (allow → ask the person); it can never turn deny or ask into allow. | US-11 | A-04, A-12. Given a signal that says "safe" on a denied disclosure, then the disclosure is still denied. |
| FR-16 | Each **logical action** has a stable `actionId`; each try has its own `attemptId`. The gate persists each action's state (`prepared → dispatched → succeeded \| failed \| unknown`) in the ledger before and after each step. Adapters deduplicate by `actionId`, so a retried or resumed `actionId` can cause its effect at most once. When a run resumes, the gate first resolves any `unknown` action by asking the adapter for that `actionId`, then re-checks consent, mandate expiry and trust before the next action (`run.resumed`). | US-18 | Given a crash **before** dispatch, when the run resumes, then the action is dispatched exactly once. Given a crash **after** the effect but before acknowledgement, when the run resumes, then the adapter reports the effect and no second effect occurs. Given an expired mandate on resume, then no further offers are sent. |
| FR-17 | A logical action that fails shall be retried at most twice, with the same `actionId` and new `attemptId`s, then recorded as `step.failed`, and the person is told. A step that needs a missing or unconfirmed fact is withheld, and the person is asked. | US-18 | Given a tool that always fails, then there are exactly 3 attempts sharing one `actionId` and one `step.failed`. Given a tool that fails once then succeeds, then the effect occurs exactly once. |

### 5.6 Decision-model signals

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-18 | The gate may request local decision-model signals: purpose classification (choice), "reads like an instruction" (yes/no) and relevance (score). Each is recorded as `signal.scored` with model identity, inputs hash, output and latency. If a model is unavailable, the signal is `unknown` and treated as "ask the person", never as "allow". | US-11 | Given the decision-model service is stopped, when a counterparty message arrives, then the result is "ask the person" and a `signal.scored` entry with `unknown` exists. |

### 5.7 Counterparties

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-19 | Counterparty content (messages, documents) shall be parsed by a quarantined reader that has no tools, into typed fields defined per message kind. Free text is kept only as display text for the person, labelled as counterparty text, and is never passed to the agent or a tool. | US-11 | A-12, including the 3 attacks inside valid fields. |
| FR-20 | Counterparties not on the person's local trusted list are `unverified`. Trust is checked at first contact and again before every disclosure (`policy.evaluated` with the trust level). | US-11 | A-13. The S4 fixtures include **permitted** *Quote* disclosures (move-date window, postcodes, inventory size), so that A-13's denominator has real disclosures. They also change the trusted list between first contact and a later disclosure, and that disclosure is then decided on the new trust level. |
| FR-21 | Each detected attack shall be recorded with one outcome (`ignored`, `denied` or `escalated`), and the person receives one plain-language summary per run. | US-11 | A-12 |

### 5.8 Ledger

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-22 | Each ledger entry shall contain the fields in §7.3. `entryHash` is SHA-256 over the canonical JSON of the unsigned entry, with a domain separator. `signature` is an Ed25519 signature over `entryHash` by the gate's ledger key. | US-12 | A-14, A-15 |
| FR-23 | Sealing a run shall append `run.sealed` and produce a **head commitment** (run id, entry count, final hash, signature). It is stored outside the run's directory and printed on the readout. | US-12 | A-15 |
| FR-24 | `verify` shall check the chain, the signatures and the evidence hashes against a head commitment. It reports the first failing sequence number and the **observable** failure: signature mismatch, hash-chain or sequence break, evidence-hash mismatch, or head mismatch (count or final hash). It does not claim to identify which tampering was done (truncation and rollback can look identical). The tamper-trial harness records which attack it applied. | US-12 | A-15. Given each of the 35 trials, then `verify` fails and names an observable failure. |
| FR-25 | The gate shall keep a separate audit log with a stable `eventId` for every event in A-14's categories: each tool call (including denied calls), each disclosure, each decision, and each approval request and decision. `reconcile` shall show exactly one ledger entry per `eventId`, and none without one. One action may produce several events. | US-12 | A-14. Given a run with a denied call, a disclosure and an approval, then each has its own `eventId` and exactly one matching ledger entry. |
| FR-26 | (Should) The ledger shall be exportable as PROV-O Turtle. | US-12 | Given a sealed run, when exported, then the Turtle parses and contains one `prov:Activity` per action entry. |
| FR-27 | `status` shall show the current step, pending approvals (with expiry), recent failures and retries, and per-step timings. | US-18 | Given a pending approval, when `status` runs, then it shows the approval and its expiry time. |

### 5.9 Negotiation (S3)

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-28 | The mandate form shall collect, for each issue, *best*, *acceptable limit* and optional *never* levels, plus a ranking of issues. It turns these into rank-order centroid weights and mandate checks, shows three example packages for a yes/no sanity check, then asks the person to sign. The signed mandate has an expiry and is recorded as `mandate.signed`. | US-06 | Given rankings 1–6, then weights equal the rank-order centroid values and sum to 1. Given the person rejects all three examples, then the mandate is not signed and the form asks them to revise. |
| FR-29 | Negotiation shall use the vendored Neocloud engine with lease scenarios. Every offer sent or received passes the gate and is recorded as `offer.sent` or `offer.received`. Every outbound message says it comes from an AI agent and names the mandate. | US-07 | A-10 |
| FR-30 | Settlement proposals shall fall inside the active mandate. At the deadline, a package that is acceptable to both sides but outside the mandate is escalated and nothing is sent. Going past a negotiable cap requires a replacement mandate signed by the person. An attempt to lift a hard ban is rejected and recorded. | US-07 | A-07, A-08, A-09 |
| FR-31 | Every concession shall have a `decision.made` entry recording the options, the target utility, the concession style and the opponent-model estimate. | US-07, US-05 | A-10 |
| FR-32 | Two lease fixtures shall exist: F-L1, where both sides' acceptable outcomes overlap inside the mandate, and F-L2, where they overlap only outside it. Each fixture documents its overlap set as computed by the engine. | US-15 | A-07, A-08 |

### 5.10 Contract clauses

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-33 | A settlement proposal shall become a list of clauses, one per issue. Each clause has the state `draft`, `contested` or `agreed`. Allowed changes: `draft ↔ contested`; `draft → agreed` and `contested → agreed` **by the person only**, with a signature; `agreed → contested` by either side. Every change is recorded as `clause.changed`, with full history. | US-09 | Given the agent tries to set `agreed`, then it is denied and recorded. Given the person agrees all clauses, then the addendum is complete and each clause has a history. |

### 5.11 Outputs

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-34 | For each S3 run, the system shall produce a **readout** as an HTML page and as plain text. Per clause it shows: both opening asks, the final term, the mandate limit, the margin to that limit, and each concession linked to its ledger entry. For the whole deal it shows: disclosures and their rules, detected tactics (labelled heuristic), escalations and decisions, the walk-away alternative, and the head commitment. | US-08 | A-17. Given a run with no settlement, then the readout says so and lists the escalation. |
| FR-35 | "Why?" for any decision id shall show the options, the narrowing rule or mandate check, the selecting signal or utility, and the sources, each linked to ledger entries. | US-05 | Given the chosen hotel in S1, when "why?" is asked, then every rejected candidate names the rule that removed it. |
| FR-36 | A **seat view** export for a counterparty shall contain only allow-listed fields (§7.3), keep sequence numbers unchanged so that gaps show, and contain no link to the person's private evidence. | US-10 | A-11 |

### 5.12 Harness, baseline and site

| ID | Requirement | Story | Acceptance criteria |
| --- | --- | --- | --- |
| FR-37 | One harness command shall run S1–S4 and the ledger trials and write a report (JSON and Markdown). For each `A-xx` the report gives `pass`, `fail` or `not measured`, with the denominator and links to the runs. | US-15 | Given all fixtures, when the harness runs, then every A-ID in the matrix appears exactly once in the report. |
| FR-38 | A deterministic test mode (fixed clock, seeded randomness, fixed test keys) shall produce byte-identical ledgers for identical inputs. | US-15 | Given two test-mode runs of S3 with the same seed, then the ledger files are identical. |
| FR-39 | A baseline mode shall replace the ontology with a structured profile (JSON Schema), keeping the same gate and ledger, for A-18. | US-16 | A-18 |
| FR-40 | The project site shall present the concept and, from M5, the scenario report and recorded synthetic runs with their readouts and instructions for verifying them. | US-17 | Given the site at M5, then each recorded run links its readout, ledger and head commitment. |
| FR-41 | (Could) TrustGraph's agent orchestrator shall be configurable with the gate as its only MCP tool server and run S1. | US-19 | Given that configuration, when S1 runs, then every action appears in the ledger and A-04 still passes. |

## 6. Screens / interface

v0.4 has no app. The person uses a command-line tool (called `wf` here; the final name
is set in PLAN), generated readout pages, and the project site.

### 6.1 Command line (`wf`)

| Command | Does |
| --- | --- |
| `wf up` / `wf down` | Start and stop the local stack |
| `wf docs add <path>` | Add documents for extraction (FR-01) |
| `wf facts [list\|confirm\|retract]` | See, confirm or retract beliefs (FR-03) |
| `wf rules [list\|check]` | Show consent rules; dry-run a disclosure (FR-08) |
| `wf mandate new` | Mandate form (FR-28; §6.3) |
| `wf run <scenario> [--seed --style --adversarial]` | Run a scenario |
| `wf approve` | Review pending approvals (§6.2) |
| `wf clauses [list\|agree\|contest]` | Manage clause states (FR-33) |
| `wf status` | What is happening now (FR-27) |
| `wf why <decision-id>` | Explain a decision (FR-35) |
| `wf ledger [verify\|seal\|export\|reconcile]` | Ledger operations (FR-22–FR-26) |
| `wf readout <run>` / `wf seat-view <run> --for <party>` | Outputs (FR-34, FR-36) |
| `wf harness` | Run everything and write the report (FR-37) |

- **Empty state:** with no documents, `wf facts list` prints "No facts yet. Add documents
  with `wf docs add`."
- **Error state:** if the stack is down, every command that needs it says which service
  is unreachable and how to start it, and changes nothing.

### 6.2 Approval prompt

- **Purpose:** let the person approve or decline one action.
- **Key elements:** the action in plain words; recipient; each disclosure and the rule
  allowing it; mandate (if any); expiry time; ledger entry id.
- **Actions:** approve, decline, show "why?".
- **Empty state:** "Nothing is waiting for you."
- **Error state:** an expired approval cannot be approved. It shows "expired; ask the
  agent to retry".

### 6.3 Mandate form

- **Purpose:** turn the person's preferences into a signed mandate without arithmetic.
- **Key elements:** per issue, the available levels with best / acceptable / never
  choices; a ranking step; the generated limits; three example packages with yes/no.
- **Actions:** sign, revise, cancel.
- **Empty state:** a scenario with no issues cannot open the form; it reports "no
  negotiable issues".
- **Error state:** contradictions (e.g. *acceptable* worse than *never*) are explained,
  and signing is blocked until they are fixed.

### 6.4 Readout page

- **Purpose:** answer "what did my agent negotiate?" (FR-34).
- **Key elements:** clause table with margins; concession timeline; disclosures; tactics
  (heuristic); escalations; walk-away comparison; head commitment; plain-text download.
- **Actions:** follow any link to the ledger entry; open "why?".
- **Empty state:** no settlement. It shows the escalation or walk-away and what was on
  the table.
- **Error state:** if `verify` fails, the page shows a prominent "this record failed
  verification at entry N" banner, and no clause table.
- **Accessibility:** usable by keyboard alone; WCAG 2.1 AA contrast; the plain-text
  version contains the same facts.

### 6.5 Ledger verification output

- **Purpose:** tell the person, in one line, whether a run's record is intact.
- **Key elements:** pass/fail; entries checked; first failure (sequence number and the
  observable failure, FR-24); the head commitment used.
- **Empty state:** an unsealed run says "not sealed: integrity cannot be claimed".
- **Error state:** a missing head commitment says that truncation and rollback cannot be
  checked.

### 6.6 Project site

- **Purpose:** explain the project (M0); publish the report and recorded runs (M5).
- **Empty state:** before M5, a "no recorded runs yet" note.
- **Error state:** not applicable (static).

## 7. Data model

### 7.1 Ontology (beliefs), at most 15 classes

| Class | From | Notes |
| --- | --- | --- |
| Person | schema.org | The persona; dietary and seating preferences as properties |
| Event | schema.org | Conference; start and end dates are *critical* |
| Place | schema.org | Venue, addresses |
| LodgingBusiness | schema.org | Hotel candidates (fixture list) |
| Organization | schema.org | Landlord company, moving company |
| IdentityDocument | `wf:` | Passport; expiry date and number are *critical* |
| FinancialRecord | `wf:` | Parent of the two below; consent rules target it |
| BankStatement | `wf:` | Subclass of FinancialRecord; hard ban |
| IncomeLetter | `wf:` | Subclass of FinancialRecord; may be shared for a lease |
| HealthRecord | `wf:` | Fictional canary only |
| Lease | `wf:` | Current lease terms; rent and dates are *critical* |
| Claim | `wf:` | Outside statement with source, retrieval time, trust and expiry |
| Purpose | `wf:` | TravelBooking, LeaseRenewal, Quote… |
| ConsentRule | `wf:` | (class, purpose, recipient kind) → allow, deny or hard ban |
| Mandate | `wf:` | Signed limits, expiry, issuer |

**Properties.** *Critical* properties make a fact unusable until the person confirms it
(FR-03). *Single* means at most one value; two different values are a conflict (FR-06).

| Property | Domain | Range | Critical | Single |
| --- | --- | --- | --- | --- |
| `schema:name` | any class | `xsd:string` | | |
| `schema:startDate`, `schema:endDate` | Event | `xsd:date` | yes | yes |
| `schema:location` | Event | Place | | yes |
| `schema:address` | Place, LodgingBusiness, Organization | `xsd:string` | | yes |
| `wf:attends` | Person | Event | | |
| `wf:dietaryPreference`, `wf:seatPreference` | Person | `xsd:string` (fixed list) | | yes |
| `wf:nightlyBudget` | Person | `xsd:decimal` | yes | yes |
| `wf:holds` | Person | IdentityDocument | | |
| `wf:documentNumber` | IdentityDocument | `xsd:string` | yes | yes |
| `wf:expiryDate` | IdentityDocument | `xsd:date` | yes | yes |
| `wf:issuingCountry` | IdentityDocument | `xsd:string` | | yes |
| `wf:hasRecord` | Person | FinancialRecord, HealthRecord | | |
| `wf:annualIncome` | IncomeLetter | `xsd:decimal` | yes | yes |
| `wf:condition` | HealthRecord | `xsd:string` (fictional canary) | | |
| `wf:tenantOf` | Person | Lease | | |
| `wf:landlord` | Lease | Organization | | yes |
| `wf:premises` | Lease | Place | | yes |
| `wf:monthlyRent` | Lease | `xsd:decimal` | yes | yes |
| `wf:leaseStart`, `wf:leaseEnd` | Lease | `xsd:date` | yes | yes |
| `wf:nightlyRate` | LodgingBusiness | `xsd:decimal` | | yes |
| `wf:walkMinutesToVenue` | LodgingBusiness | `xsd:integer` | | yes |
| `wf:about`, `wf:statesProperty`, `wf:statesValue`, `wf:source`, `wf:retrievedAt`, `wf:trust`, `wf:expires` | Claim | resource, `xsd:anyURI`, `xsd:string`, `xsd:anyURI`, `xsd:dateTime`, `xsd:string` (fixed list), `xsd:dateTime` | | yes |
| `wf:targetsClass`, `wf:forPurpose`, `wf:recipientKind`, `wf:effect` | ConsentRule | `xsd:anyURI`, Purpose, `xsd:string`, `xsd:string` (`allow`, `deny` or `hard-ban`) | | yes |
| `wf:mandateDocument`, `wf:documentHash`, `wf:expires` | Mandate | `xsd:anyURI`, `xsd:string`, `xsd:dateTime` | | yes |

**The three planted malformed facts in F-P (A-03)** are:

1. a passport `wf:expiryDate` of "next spring" (datatype violation);
2. `wf:monthlyRent` stated about an Event (domain violation);
3. an Event's `schema:location` pointing to a Person (range violation).

**Relationships:**

- A Person has IdentityDocuments, FinancialRecords and a Lease, and attends an Event.
- An Event is located at a Place.
- A Claim is about any subject and comes from a source.
- A ConsentRule targets a class and a Purpose.
- A Mandate governs one negotiation.

### 7.2 Working records

| Entity | Key fields | Notes |
| --- | --- | --- |
| **Run** | id, scenario, seed, styles, mode (`live`, `fixture` or `test`), started, sealed | One ledger per run |
| **Approval** | id, action id, disclosures[], rule ids[], requested, expires, decision | Expires after 24 h |
| **Mandate** | id, version, issues[{best, limit, never}], ranking[], weights[], checks[], hardBans[], expires, signature | Replaced, never edited |
| **Clause** | id, issue, text, state, history[{at, by, from, to, entry}] | FR-33 |
| **Signal** | id, kind (`choice`, `score` or `yes/no`), model, inputHash, output, latencyMs | FR-18 |
| **HeadCommitment** | runId, count, finalHash, signature, createdAt | Stored outside the run's directory |

### 7.3 Ledger entry

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| v | integer | yes | Format version (1) |
| runId | string | yes | |
| seq | integer | yes | Starts at 1; no gaps in the full ledger |
| type | string | yes | One of the entry types in CONCEPT-IDEA §4.2 |
| at | string (RFC 3339) | yes | Gate clock; not claimed to be exact |
| actor | string | yes | `agent`, `person`, `gate` or `counterparty:<id>` |
| purpose | string | when relevant | |
| ruleRefs | string[] | when relevant | Consent rules and mandate checks applied |
| mandateRef | string | when relevant | id and version |
| evidence | [{ref, sha256}] | when relevant | Content hashes of sources relied on |
| body | object | yes | Type-specific content |
| eventId | string | yes | Matches the gate's audit log (FR-25) |
| actionId, attemptId | string | for actions | FR-16, FR-17 |
| prevHash | string | yes | All zeros for seq 1 |
| entryHash | string | yes | FR-22 |
| signature | string | yes | FR-22 |

**Seat-view allow-list (FR-36):** `v`, `runId`, `seq`, `type`, `at`, and `actor` for
offer, message and clause entries. From `body`, only the offer package, the message
text and the clause text and state. **Never:** mandate limits, weights, ranking,
walk-away, evidence references, rule references, decisions, signals or private briefs.

**Retention and deletion:**

- Everything is stored locally, under the person's control. Nothing is uploaded.
- The person may delete a whole run. The deletion is recorded in the run index;
  individual entries cannot be deleted.
- Keys live outside the repository and outside the agent's container.
- Recorded runs published on the site use synthetic data only.

## 8. Business rules and edge cases

- **Rule precedence:** FR-15. When rules conflict, the more restrictive outcome wins.
- **Duplicate facts:** the same fact from two documents is stored once, with both
  sources as provenance.
- **Conflicting facts** from the person's own documents are both kept and raised to the
  person; neither is used until resolved.
- **TrustGraph unavailable:** reads fail closed (nothing returned), and `step.failed` is
  recorded.
- **LLM unavailable:** extraction or drafting steps fail after retries; nothing is
  invented.
- **Decision model unavailable:** FR-18.
- **Ledger writer unavailable:** FR-14; nothing is dispatched.
- **Limits:**
  - documents ≤ 10 MB each and ≤ 50 per persona;
  - negotiation rounds 2–12 (engine limit);
  - ≤ 200 offers per run;
  - approvals expire after 24 h;
  - mandates expire after at most 30 days (S3 uses 14).
- **Expired mandate during a negotiation:** no further offers; the run ends as
  "mandate expired" and the person is told.
- **A counterparty disappears mid-negotiation:** time-out after the round deadline; the
  run ends with no settlement.
- **Replacement mandate:** it supersedes the old one from its signature time; offers
  already sent are unaffected.

## 9. Non-functional requirements

Targets are inferred, for review.

| Category | Requirement |
| --- | --- |
| Performance | Gate decision overhead ≤ 50 ms p95, excluding model calls. Ledger append and sign ≤ 10 ms p95. The 160-run S3 batch completes in ≤ 5 min on the author's machine. Decision-model signals ≤ 250 ms p95. |
| Accessibility | Readout and site meet WCAG 2.1 AA contrast, are keyboard navigable, and have a plain-text equivalent of every readout. |
| Devices / browsers | Site and readouts work in current Chrome, Edge, Firefox and Safari, including phone widths (≥ 360 px) without sideways scrolling. |
| Privacy | Synthetic data only. No telemetry, cookies or third-party resources anywhere. All processing is local. |
| Security | The agent container cannot reach anything but the gate. Keys never enter the repository or the agent container. Fail closed (FR-14). No secrets in the repository. |
| Cost | $0. Local containers and local models only. |
| Availability | Best effort on one machine. The site is static on GitHub Pages. |
| Reproducibility | Test mode is byte-for-byte reproducible (FR-38). Every model is pinned by tag and digest in the run record. |
| Portability | Ledger as JSONL and PROV-O Turtle; knowledge exportable as Turtle (TrustGraph). Adapters allow hosted models, network counterparties, external identity and public anchoring later. |

## 10. External dependencies

All are local or used at install time. No hosted runtime services.

| Service | Used for | Account needed | Cost | Fallback if unavailable |
| --- | --- | --- | --- | --- |
| GitHub (repo, Actions, Pages) | Source, CI, project site | yes | free | Run everything locally; publish later |
| Docker (Compose) | Running the stack | no | free | Podman (supported by TrustGraph) |
| TrustGraph v2.11 containers | Knowledge store, OntologyRAG, policies, traces, decision-model services | no | free (Apache-2.0) | Fixture mode (FR-04) for beliefs; gate works without it for S3 and S4 |
| Ollama + an open-weight model | Extraction and draft wording | no | free | A smaller model; then fixture mode |
| Laya decision scoring and Cloze (via TrustGraph) | Fast signals | no | free | Signals are `unknown`, so the agent asks the person (FR-18) |
| Node.js runtime | Gate, harness, CLI, readouts | no | free | — |
| Neocloud negotiation engine (vendored, Apache-2.0) | S3 bargaining | no | free | — |

## 11. Definition of done (for the whole v0.4)

- [ ] Every `Must` acceptance ID passes in the harness report (A-01 may be "not measured"
      only with the fixture-mode reason recorded)
- [ ] The report, recorded runs and readouts are published on the project site
- [ ] The README explains how to start the stack, run each scenario, verify a ledger and
      contribute
- [ ] No secrets or real personal data in the repository
- [ ] The author can run S3 from the README on a fresh checkout without help

## 12. Open questions carried forward

| ID | Question | Owner | Needed by |
| --- | --- | --- | --- |
| OQ-01 | Does the full stack (TrustGraph, Ollama, decision models, Wayfinder) run on the author's hardware? Go/no-go for live extraction. | @yorkerhodes3 | 2026-12-11 (M1) |
| OQ-02 | Which open-weight model gives the best A-01 within that hardware? | @yorkerhodes3 | 2026-12-11 (M1) |
| OQ-03 | How is our ontology loaded into TrustGraph: its JSON ontology config, or a Turtle import? (Its spec describes both; unverified.) | @yorkerhodes3 | 2026-12-11 (M1) |
| OQ-04 | What do TrustGraph's SHACL-AF policies and user context cover on the paths we use? (4-hour spike, a Should item; nothing depends on the answer.) | @yorkerhodes3 | 2027-02-26 (by M4) |
| OQ-05 | Does a minimal MCP-over-HTTP subset in the gate work with the scenario agent and, for US-19, with TrustGraph's agent? | @yorkerhodes3 | 2027-01-22 (M2) |
| OQ-06 | Interview findings (CONCEPT Q2). | @yorkerhodes3 | 2027-01-08 |

---

## Reviewer sign-off

- [ ] Every `Must` story has at least one functional requirement
- [ ] Every functional requirement has testable acceptance criteria
- [ ] The data model covers everything the screens display
- [ ] Empty states, error states, and edge cases are specified
- [ ] Non-functional requirements are realistic for the time and budget available
- [ ] Nothing here contradicts the approved `CONCEPT-IDEA.md`
- [ ] Scope still fits the stated constraints; if not, say what gets cut

**Verdict:** `Approved` / `Approved with changes` / `Needs rework`

**Reviewer notes:**

>
