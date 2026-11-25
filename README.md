# agentic-ontology — Wayfinder

**Wayfinder** is a concept for a personal AI agent that acts for its person from a small,
typed model of their world (an *ontology*) and writes every step it takes to a personal
ledger, so the person can see what it believed, what it shared, what it did and why.

> **Status: concept approved (v0.4); planning in review.** Nothing is built yet.
>
> **Site:** https://yorkerhodes3.github.io/agentic-ontology/

The project follows the
[Ethical Tech CoLab project startup guide](https://github.com/Ethical-Tech-CoLab/project-startup-guide):
*think in documents, review with a human, then build.*

## Documents

| Document | Answers | Status |
| --- | --- | --- |
| [`CONCEPT-IDEA.md`](CONCEPT-IDEA.md) | Why should this exist, and for whom? | **Approved** (v0.4, 2026-11-25) |
| [`SPECIFICATION.md`](SPECIFICATION.md) | What exactly does it do? | Draft, in review |
| [`PLAN.md`](PLAN.md) | How is it built, in what order? | Draft, in review |
| [`BACKLOG.md`](BACKLOG.md) | What is the very next task? | Draft, in review |

Blank templates for every stage, plus the reviewer's checklist, are in
[`templates/`](templates/). They are copied unchanged from the startup guide.

## Relationship to TrustGraph

Wayfinder is designed to run on [TrustGraph](https://github.com/trustgraph-ai/trustgraph)
(Apache-2.0), the open-source ontology runtime for AI agents. It uses TrustGraph
unmodified, as deployed containers. This repository is **not** a fork and contains no
TrustGraph code. The concept's references to TrustGraph are pinned to commit
[`17e5d74`](https://github.com/trustgraph-ai/trustgraph/tree/17e5d7423ac080b0162f7242694c520551b9df0c)
(release v2.11).

## Related work by the same author

- [Sovereign Agent Trust Mesh](https://github.com/yorkerhodes3/sovereign-agent-trust-mesh): agent identity, reputation and scoped mandates across organisations
- [Agentic Language Development](https://github.com/Ethical-Tech-CoLab/agentic-language-development): grounded, auditable language between isolated agents, with tamper-evident ledgers
- [Diplomacy Table](https://github.com/Ethical-Tech-CoLab/diplomacy-table-live) and [Diplomatic Simulator](https://github.com/Ethical-Tech-CoLab/diplomatic-simulator): multi-party AI negotiation
- [Neocloud Supply OS negotiation room](https://github.com/yorkerhodes3/neocloud-supply-os): agent-to-agent negotiation inside a signed mandate

## Licence

Apache License 2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
