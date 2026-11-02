# Katun Checkout for Agents

Merchant-side agentic checkout for the Airwallex Agentic Banking Hackathon 2026, track 10 (Merchant-Enabled Agentic Checkout).

A buyer in Claude finds a merchant's products, confirms the terms, pays with a test card and gets the merchant's order number.
Behind the merchant sits Katun: it owns the catalog, the stock, the price, the order limit, the named human approval and a signed
receipt that anyone can verify offline. Payment runs in the Airwallex sandbox.

This repository holds what a third party needs to reproduce the demonstration against the public Katun sandbox
(`https://sandbox.katunpay.com`): the synthetic catalog, a demonstration buying agent that signs its requests with the Visa
Trusted Agent Protocol, the offline receipt verifier, and the step-by-step walkthrough. It does not contain Katun itself.
Everything runs in sandboxes, with synthetic data and test cards: no money moves.

> **Status on 2 November 2026.** The Katun side of every step below is implemented in the public sandbox. The live runs are
> pending. Airwallex's merchant onboarding API answers our sandbox account (the store is not onboarded yet), and Airwallex has
> not yet published the request it sends to the merchant's checkout URL. The [status table](#status) says, step by step, what has run live and when. Nothing in this README
> describes as done a step that has not run.

## What the demonstration shows

1. **Buy in Claude through the Airwallex commerce MCP.** A synthetic outdoor-equipment store publishes its 100 products to
   Airwallex from the Katun panel. Claude, configured with the merchant MCP endpoint that Airwallex hosts for that store, searches
   the catalog, confirms store, product, quantity, delivery and total, and opens the Airwallex payment component. The buyer types a
   test card there, never in the chat. Airwallex asks Katun's checkout for the order; Katun checks stock, price and limit and
   answers with its order number, which comes back to the buyer with the payment outcome.
2. **An exception without a duplicate payment.** An order above the store's limit waits in Exceptions. A named person approves it
   and the payment is captured once; a rejection voids the authorization. A changed price, an unavailable product or a declined
   test card stops the purchase without a second payment.
3. **A signed receipt, verified offline.** Every paid order has an Ed25519-signed record (`katun-evidence/1`) with the channel,
   the limit, who approved, and the Airwallex sandbox Payment Intent identifiers. `verify/verify-receipt.sh` downloads the public
   keys and the single-file verifier and checks it with no network: `VALID` and `Test record: no money moved`.
4. **A buying agent that identifies itself.** In a second scene, an autonomous agent buys through the store's own Katun connector,
   signing every request with the Visa Trusted Agent Protocol (RFC 9421, Ed25519, `agent-payer-auth`, single-use `nonce`, 8-minute
   window). The Katun platform operator sets the demonstration store to accept registered agents only and adds this agent's key
   directory to the platform registry; then the unsigned agent gets `401`, the signed one places the order, and a replayed signed
   request gets `401` for its repeated `nonce`.
   Agent identity verified with Visa's Trusted Agent Protocol signatures (RFC 9421), tested against our own TAP-conformant agent.
5. **The network view.** The store belongs to a partner institution (a processor, PSP or partner sandbox). Its operator sees all
   its stores, their sales, the orders waiting for approval across the network, the consolidated sales by store, channel and
   currency, and each order's signed receipt.

## Architecture

```
                         Airwallex sandbox
                 +--------------------------------------+
 Buyer in Claude | merchant MCP endpoint (per store)    |
 --------------->|   /pa/ai/{merchantId}/acp/mcp        |
   search,       | payment component, test card         |
   confirm, pay  | Payment Intent in the store account  |
                 +---------+-------------------+--------+
                           |                   ^
     signed checkout call  |                   |  merchant onboarding API:
     (HMAC, per store)     v                   |  onboard, config, products (GMC)
                 +---------+-------------------+--------+
                 | Katun sandbox (sandbox.katunpay.com) |
                 |  catalog, stock, price, order limit  |
                 |  Exceptions: named human approval    |
                 |  capture once, signed receipt        |
                 |  store connector (MCP) + checkout    |
                 |  TAP signature verification          |
                 |  partner panel: stores, approvals,   |
                 |  consolidated, receipts              |
                 +---------+---------------------+------+
                           |                     ^
          public keys,     |                     |  TAP-signed requests
          verifier, record v                     |  (second scene)
                 +---------+------+    +---------+-----------+
                 | verify/        |    | tap-agent/           |
                 | offline check  |    | demo buying agent    |
                 +----------------+    +----------------------+
```

- Katun is the source of the catalog and of the order. The copy of the catalog in Airwallex is published from Katun in the Google
  Merchant Center format, with Katun's product ID as the item ID, so the order that comes back is recognized without a mapping
  table.
- Airwallex calls Katun's checkout URL for that store, signed with a per-store HMAC secret that Katun generates and stores
  encrypted. Katun verifies the signature before reading the body. The order is born in Katun with channel `airwallex-mcp`.
- The Payment Intent is authorized and captured once from Katun's order saga: below the limit at once, above it only after a named
  person approves.
- What Airwallex has not published yet (the exact shape of the checkout call and of the managed payment) lives in one translation
  module on the Katun side and is confirmed against Airwallex's contract before the live run.

## Repository layout

```
catalog/     the 100-product synthetic catalog (products.csv), its generator, and PNG placeholder photos
tap-agent/   demonstration buying agent: Ed25519 key generation, Trusted Agent Protocol signer, MCP purchase, its JWKS
verify/      offline verification of a receipt
scripts/     environment check and the step-by-step walkthrough (walkthrough.md)
docs/        TAP notes (what we verified in the public specification and when), the demo video script
```

## Requirements

- Node.js 22 or newer and `curl`. No package installation: the scripts use only Node's standard library.
- An email address or WhatsApp number to sign in to the Katun sandbox (no password, no card).
- An Airwallex sandbox account (`https://www.sandbox.airwallex.com`), with Payments enabled, a Client ID and an API key.
- Airwallex merchant-side Agentic Commerce access, requested from `devhelp@airwallex.com` as the hackathon builder guide says. It
  enables the merchant onboarding API and the merchant MCP endpoint, and comes with the token Claude uses for that endpoint.
- Claude with support for a local HTTP MCP server (for example, Claude Code).

```
node scripts/check-env.mjs
```

## Run it

The full walkthrough, with every screen and command, is in [`scripts/walkthrough.md`](scripts/walkthrough.md). In short:

1. **Create a partner sandbox.** At `https://sandbox.katunpay.com`, Create a sandbox, choose "Processor, PSP or partner", type an
   organization name and your name, and enter the six-digit code you receive. Set up the second factor with an authenticator app.
2. **Add the store.** In Your stores, Add store: a store name, the owner (in the sandbox it can be you), Payments "Airwallex
   (sandbox)", sample catalog unchecked.
3. **Load the catalog.** `node catalog/generate-catalog.mjs`, then import `catalog/products.csv` in the store's Catalog. Set the
   store's order limit to US$ 150.00 in Your business.
4. **Set up the payment method.** In the store's Payment method screen, under Airwallex (sandbox), type the Client ID and the
   Secret key of your Airwallex sandbox account (they are stored encrypted and never shown again). Copy the Notification URL into
   a webhook in the Airwallex sandbox dashboard and type its secret into Notification secret.
5. **Connect to Airwallex.** In the same screen, under Airwallex merchant connector (sandbox), press Connect to Airwallex
   (sandbox), then Publish the catalog to Airwallex (sandbox). The screen shows the Airwallex merchant ID and the Store connector
   address.
6. **Connect Claude.** Add the Store connector address as an HTTP MCP server with the token Airwallex provides, for example:
   `claude mcp add --transport http store "<Store connector address>" --header "Authorization: Bearer <token from Airwallex>"`.
7. **Buy.** Ask Claude for a product, confirm the terms, pay in the Airwallex payment component with test card
   `4035 5010 0000 0008` (any future date, any CVC), and read the Katun order number. Repeat with an order above US$ 150.00 and
   approve it in Exceptions.
8. **Verify the receipt offline.** `bash verify/verify-receipt.sh <institution-id> <order-number>`.
9. **Second scene, TAP.** `node tap-agent/demo-buy.mjs --mcp <Katun connector of the demonstration store> --query "headlamp"`,
   with and without `--unsigned`. The store policy and the platform registry are set by the Katun platform operator, so this scene
   runs against the demonstration store; with your own key, ask for your key directory to be registered (see
   [`tap-agent/README.md`](tap-agent/README.md)).
10. **Network view.** Back in All stores: Home, Exceptions, Consolidated, Channels and Orders.

Test cards for the Airwallex sandbox (source: `https://www.airwallex.com/docs/payments__test-card-numbers`, as listed in
`https://sandbox.katunpay.com/docs/tarjetas-de-prueba?lang=en`):

| Case | Card | Order total |
|---|---|---|
| Approved | 4035 5010 0000 0008 (Visa) | any |
| Approved | 2223 0000 4841 0010 (Mastercard) | any |
| Declined, insufficient funds | 2223 0000 1018 1375 (Mastercard) | exactly US$ 80.51 |
| Declined by the issuer | 2223 0000 1018 1375 (Mastercard) | exactly US$ 80.05 |
| Declined by the risk engine | 4646 4646 4646 4644 (Visa) | any |

## Status

| Step | Status |
|---|---|
| Partner sandbox, store, catalog import, order limit, network view | Implemented in the sandbox, pending live run |
| Airwallex (sandbox) payment method, its credentials and notification URL | Implemented in the sandbox, pending live run |
| Merchant onboarding to Airwallex and catalog publication from the panel | Implemented in the sandbox, pending live run |
| Purchase in Claude through the Airwallex merchant MCP endpoint, order number back | Implemented in the sandbox, pending Airwallex's published checkout contract and live run |
| Order above the limit, named approval, single capture | Implemented in the sandbox, pending live run |
| Changed price, unavailable product or declined card without a duplicate payment | Implemented in the sandbox, pending live run |
| Signed receipt with the Airwallex sandbox Payment Intent, verified offline | Implemented in the sandbox, pending live run |
| TAP-signed agent accepted, unsigned agent refused, repeated nonce refused | Implemented in the sandbox, pending live run |
| `scripts/check-env.mjs` against the sandbox (docs, public keys, verifier reachable) | Verified on 2 November 2026 |
| `tap-agent/sign.mjs --self-test` (signature verifies on the right host, fails on another) | Verified locally on 2 November 2026 |
| Catalog generator (100 products, deterministic output) | Verified locally on 2 November 2026 |

The video walkthrough link goes here once it is recorded.

## Next steps

- Airwallex's buyer agent (Airi CLI) as the buyer of this store, once Airwallex releases its test mode with a test card.
- Visa Intelligent Commerce on the agent side, if Visa grants sandbox access to the demonstration agent.

## What this repository is not

- It is not the Katun source code. Katun is a separate, private codebase; this repository only talks to its public sandbox over
  HTTP.
- It holds no keys, credentials or production URLs. Private keys generated by `tap-agent/keygen.mjs` stay outside the tracked tree
  and are ignored by git. Airwallex credentials are typed by the operator into the sandbox panel, never into a chat or a file here.
- It includes no code from Visa. The signer is written from the public specification; Visa's sample code is under Visa's own terms
  and is not copied here.
- Payments are test charges in the Airwallex sandbox; no money moved. The demonstration agent is our own, with our own keys in
  our own directory; Visa has not reviewed it.

## How it was built

Every change in Katun ships through LineBreak, our spec-to-release gate: approved acceptance criteria are served to the coding
agents and nothing merges without a human signature.

## License

Apache License 2.0. See `LICENSE`.
