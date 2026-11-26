# Vendored: Neocloud Supply OS negotiation engine

Copied **unmodified** from [yorkerhodes3/neocloud-supply-os](https://github.com/yorkerhodes3/neocloud-supply-os)
at commit [`96a6161`](https://github.com/yorkerhodes3/neocloud-supply-os/tree/96a6161c6d2b5e70b86c354cf1f164e67d74fec2/docs/assets/js),
licensed under the Apache License, Version 2.0 (the same licence as this repository's `LICENSE`).
The upstream `NOTICE` is reproduced unchanged in [`NOTICE`](NOTICE) in this folder.

| File | Source path |
| --- | --- |
| `nego/engine.js` | `docs/assets/js/nego/engine.js` |
| `nego/scenarios.js` | `docs/assets/js/nego/scenarios.js` |
| `nego/detector.js` | `docs/assets/js/nego/detector.js` |
| `lib/rng.js` | `docs/assets/js/lib/rng.js` |

Wayfinder's lease scenarios live in `../../wayfinder/lease.js` and are passed to the engine as
scenario objects, so these files stay identical to upstream (PLAN D-11). The engine's built-in
message text is procurement wording; Wayfinder's screens render their own lease wording from the
structured offers instead.
