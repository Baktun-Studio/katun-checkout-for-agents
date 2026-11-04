# Reproduction scripts

Scripts a third party runs to reproduce the demonstration against the Katun sandbox, and the state of each one.

| Script | What it does | Status |
|---|---|---|
| `check-env.mjs` | Checks Node 22+, `curl`, and that the sandbox documentation, public keys and verifier are reachable | ready; run against the sandbox on November 3, 2026 |
| `catalog/generate-catalog.mjs` | Generates the synthetic catalog, its PNG placeholder photos and the photos .zip for the sandbox | ready |
| `tap-agent/keygen.mjs`, `sign.mjs`, `request.mjs`, `demo-buy.mjs` | Key generation, TAP signer, signed requests, MCP purchase | ready; signer self-test passes locally; run against the demonstration store pending live run |
| `verify/verify-receipt.sh` | Offline verification of a receipt | ready; downloads checked against the sandbox; run on a receipt of this demonstration pending live run |
| `walkthrough.md` | The reproduction, step by step | ready; its commands checked from a clean clone on November 3, 2026; the panel steps and the purchases run in the live runs, pending |

```
node scripts/check-env.mjs
```
