# Demonstration buying agent with a Trusted Agent Protocol signer

A minimal agent that signs its HTTP requests the way Visa's Trusted Agent Protocol (TAP) describes for merchants: RFC 9421
HTTP Message Signatures with an Ed25519 key, covering `@authority` and `@path`, with the parameters `created`, `expires`, `keyid`,
`alg`, `tag` and `nonce`. Written from the public specification; see `docs/tap-notes.md` for what was verified and when.

No dependencies: Node.js 22 or newer.

## Files

- `keygen.mjs`: generates an Ed25519 key pair. The private key goes to `tap-agent/keys/private/agent.pem` (ignored by git, never
  committed). The public key goes to `tap-agent/keys/private/jwks.json` as a JWKS (`kty: OKP`, `crv: Ed25519`, `x`, `kid`), the
  directory the agent publishes; `--out <path>` also writes a copy there. The `kid` is the RFC 7638 thumbprint of the key. The
  tracked `tap-agent/keys/jwks.json` is the demonstration agent's directory and is not touched.
- `sign.mjs`: the signer. Exports `signRequest({ method, url, keyid, privateKeyPem, tag, ttlSeconds, nonce, signatureAgent })`
  returning the `Signature-Input` and `Signature` headers, and `verifyRequest(...)` for a local self-check.
- `request.mjs`: command line. Sends one signed (or unsigned) HTTP request and prints the status and body.
- `demo-buy.mjs`: command line. Talks to a Katun merchant connector over MCP (streamable HTTP, JSON-RPC): initializes a session,
  searches a product and creates an order (`--sku` picks the product; otherwise the first search result), signing every
  request. Every run that gets past the first request places a real test order. Used for the second scene of the demo.

## Use

```
node tap-agent/keygen.mjs
node tap-agent/sign.mjs --self-test
node tap-agent/request.mjs --url https://sandbox.katunpay.com/t/{institution-id}/m/{store-id}/mcp --tag agent-browser-auth --method POST --body '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"tap-demo","version":"0.1"}}}'
node tap-agent/demo-buy.mjs --mcp https://sandbox.katunpay.com/t/{institution-id}/m/{store-id}/mcp --query "headlamp" --sku LGT-01 --quantity 1
node tap-agent/demo-buy.mjs --mcp ... --query "headlamp" --unsigned   # the same, without a signature
node tap-agent/demo-buy.mjs --mcp ... --query "headlamp" --replay     # signed, then resends the order request with its used nonce
```

## Publishing the key directory

The merchant needs to fetch the agent's public key by `kid`. The demonstration agent's directory is `tap-agent/keys/jwks.json`,
served by GitHub Pages at `https://baktun-studio.github.io/katun-checkout-for-agents/tap-agent/keys/jwks.json` (from the
`gh-pages` branch, which holds only that public file), and registered in the Katun sandbox's platform registry. Its private key
is not in this repository.

Katun recognizes an agent when the platform operator adds its key directory to the platform registry; with the Trusted Agent
Protocol, a `keyid` that is in no registered directory is an invalid signature
(`https://sandbox.katunpay.com/docs/referencia-del-conector?lang=en`, Agent identity). To use your own agent, run `keygen.mjs`
(it writes your public key to `tap-agent/keys/private/jwks.json` and prints the path), serve that file from any `https` host and
ask the platform operator to register that address: that is the key directory the platform must be given, not the demonstration
agent's.

## What this is and is not

- It is our own agent with our own keys in our own directory, conformant to the public TAP specification as read on
  October 26, 2026. Visa has not reviewed it.
- The signature proves that whoever holds the private key sent this request to this host and path within this time window. It
  does not identify the human behind the agent.
