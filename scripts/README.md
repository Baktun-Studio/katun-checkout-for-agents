# Reproduction scripts

Scripts a third party runs to reproduce the demonstration against the Katun sandbox. They are being written during the build
phase; this file lists what exists and what is still to come.

| Script | What it does | Status |
|---|---|---|
| `check-env.mjs` | Checks Node 22+, `curl`, and that the sandbox documentation, public keys and verifier are reachable | ready; run against the sandbox on 2 November 2026 |
| `catalog/generate-catalog.mjs` | Generates the synthetic catalog, its PNG placeholder photos and the photos .zip for the sandbox | ready |
| `tap-agent/keygen.mjs`, `sign.mjs`, `request.mjs`, `demo-buy.mjs` | Key generation, TAP signer, signed requests, MCP purchase | ready; signer self-test passes locally; run against the demonstration store pending |
| `verify/verify-receipt.sh` | Offline verification of a receipt | ready; run on a receipt of this demonstration pending |
| `walkthrough.md` | The reproduction, step by step | ready; live run pending |

```
node scripts/check-env.mjs
```
