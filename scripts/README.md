# Reproduction scripts

Scripts a third party runs to reproduce the demonstration against the Katun sandbox. They are being written during the build
phase; this file lists what exists and what is still to come.

| Script | What it does | Status |
|---|---|---|
| `check-env.mjs` | Checks Node 22+, `curl`, and that the sandbox documentation and public keys are reachable | ready |
| `catalog/generate-catalog.mjs` | Generates the synthetic catalog and its placeholder images | ready |
| `tap-agent/keygen.mjs`, `sign.mjs`, `request.mjs`, `demo-buy.mjs` | Key generation, TAP signer, signed requests, MCP purchase | ready; exercised against the sandbox when its TAP verification is deployed |
| `verify/verify-receipt.sh` | Offline verification of a receipt | ready |
| `walkthrough.md` | The 15-minute reproduction, step by step, with the connector URL of the demo merchant | to come |

```
node scripts/check-env.mjs
```
