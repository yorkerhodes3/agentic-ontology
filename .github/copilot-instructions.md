# Copilot instructions for this project

> Adapted from the [project startup guide](https://github.com/Ethical-Tech-CoLab/project-startup-guide/blob/main/examples/copilot-instructions.md).
> Every Copilot Chat session in this repository follows it.

## About this project

Wayfinder: a personal AI agent that acts from a small ontology of its person's world, under
consent rules and mandates the person sets, and writes every step to a personal ledger.
It is designed to run on TrustGraph, used unmodified.

Authoritative documents, in order of precedence:

1. `CONCEPT-IDEA.md`: why this exists and for whom
2. `SPECIFICATION.md`: what the system does (the source of truth for behaviour)
3. `PLAN.md`: architecture, milestones, and recorded technical decisions
4. `BACKLOG.md`: the ordered task list

If a request conflicts with an approved document, say so and stop rather than
silently doing something else.

## How to work with me

- Explain your reasoning in plain language and define jargon the first time you use it.
- Ask clarifying questions when a request is ambiguous rather than guessing.
- Do the mechanical work (Git, installs, builds, deployments), but show each command
  before you run it and explain what it does in one plain sentence.
- Do not invent facts, statistics, APIs, package names, or citations. If something needs
  verification, give the source URL, or say you don't know.
- Prefer the simplest solution that satisfies `SPECIFICATION.md`.
- Change only what the current task requires; no unrelated refactoring.
- Follow the technical decisions recorded in `PLAN.md`. If you disagree with one, argue
  for it explicitly; don't quietly pick something else.
- After any change, say exactly how to verify it against the task's acceptance criteria.
- Flag anything I should double-check before merging.

## Documents

- Keep documents in the existing template structure; don't reorganise sections.
- Mark anything you inferred rather than were told with "(inferred)".
- Never edit an approved document silently; propose the diff and let me decide.
- Keep `BACKLOG.md` current: finished items move to `Done` with the date and PR number.

## Code

- Language and framework: not decided yet. `PLAN.md` will record the decision.
- No secrets, API keys, or tokens in the repository. Use environment variables.
- No real personal data anywhere in the repository, including tests and fixtures.
  Use synthetic personas only.
- Prefer clear names over clever code; comment only where intent isn't obvious.

## Git

- Conventional commit messages: `docs:`, `feat:`, `fix:`, `chore:`.
- One branch and one pull request per backlog item, referencing its ID (e.g. `T-014`).
