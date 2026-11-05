# Katun Checkout for Agents

Merchant-side agentic checkout for the Airwallex Agentic Banking Hackathon 2026, track 10 (Merchant-Enabled Agentic Checkout).

A buyer in Claude finds a merchant's products, confirms the terms, pays with a test card and gets the merchant's order number.
Behind the merchant sits Katun: it owns the catalog, the stock, the price, the order limit, the named human approval and a signed
receipt that anyone can verify offline. Payment runs in the Airwallex sandbox.

This repository holds what a third party needs to reproduce the demonstration against the public Katun sandbox
(`https://sandbox.katunpay.com`): the synthetic catalog, a demonstration buying agent that signs its requests with the Visa
Trusted Agent Protocol, the offline receipt verifier, and the step-by-step walkthrough. It does not contain Katun itself.
Everything runs in sandboxes, with synthetic data and test cards: no money moves.

**Demo video:** <VIDEO_URL>

> **Status on November 5, 2026.** The demonstration ran live in the sandboxes on November 4 and 5, 2026: the purchase in Claude
> through the Airwallex merchant MCP endpoint, the order above the limit approved by a named person and paid once, the declined
> card, the signed receipt verified offline and the Trusted Agent Protocol scene. The same purchase also runs through the store's
> own Katun connector, paid with Airwallex Payment Intents; that route does not depend on the Airwallex merchant MCP endpoint.
> The [status table](#status) says, step by step, what has run live and when. Nothing in this README describes as done a step
> that has not run.

## Try it in five minutes

No account needed: the demonstration store is public in the sandbox.

1. **Buy from the store in Claude.** Add the store's Katun connector,
   `https://sandbox.katunpay.com/t/sbx-tvzsuq4hi6/m/mer_caprock-trail-supply/mcp`, to Claude as a custom connector (or to
   Claude Code with `claude mcp add --transport http caprock <address>`). Ask for "a headlamp under 60 dollars", confirm the terms,
   open the payment link Claude returns, press Pay with Airwallex (sandbox) and pay with test card `4035 5010 0000 0008` (any
   future date, any CVC). Claude gives you the Katun order number.
2. **Verify a receipt offline.** With Node.js 22 and `curl`:
   `bash verify/verify-receipt.sh sbx-tvzsuq4hi6 KP-TKKVD` (the order above the limit in the video), or your own order number
   once it is paid. Change one letter in `verify/out/<order>/record.json` and run the verifier again: `INVALID`.
3. **Check the agent's signature locally.** `node tap-agent/sign.mjs --self-test` signs a request with the Trusted Agent Protocol
   (with a throwaway key if you have not run `keygen.mjs`) and verifies it: it passes for the right host and fails for another. The live scene against the store needs a key directory
   registered with the platform; see [`tap-agent/README.md`](tap-agent/README.md).

`node scripts/smoke-test.mjs` runs every check above that needs no account (no order is placed), and GitHub Actions runs it
every day.

The full route, with your own partner sandbox, store, catalog and Airwallex account, is in [Run it](#run-it).

## What the demonstration shows

1. **Buy in Claude through the Airwallex commerce MCP.** A synthetic outdoor-equipment store publishes its 100 products to
   Airwallex from the Katun panel. Claude Desktop connects to the merchant MCP endpoint that Airwallex hosts for that store, and
   the buyer continues as a guest on the store's sign-in page, served by Katun (no personal data asked). Claude searches the
   catalog and confirms store, product, quantity, delivery and total. Airwallex asks Katun's checkout for the order; Katun checks
   stock, price and limit and answers with its order number. The buyer types a test card in the Airwallex payment component,
   never in the chat. Airwallex charges it, and Katun records the payment once, from Airwallex's signed notification, and signs
   the receipt.

   **The same purchase through the store's Katun connector.** Claude can also connect directly to the store's own Katun
   connector (`https://sandbox.katunpay.com/t/{institution-id}/m/{store-id}/mcp`). Claude searches, confirms the terms and
   creates the order; Katun answers with its order number and a payment link. The link opens the store's public order page,
   whose "Pay with Airwallex (sandbox)" button creates an Airwallex Payment Intent and opens Airwallex's hosted payment page,
   where the buyer types the test card. Airwallex's signed notification, or a status check when the buyer comes back, confirms
   the payment. The order limit, the named approval and the signed receipt are the same.
2. **An exception without a duplicate payment.** An order above the store's limit is not charged: it waits in Exceptions until a
   named person approves it, and then the buyer pays it once on the store's order page; a rejection cancels it with no charge. A
   changed price, an unavailable product or a declined test card stops the purchase without a second payment.
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
                 +----------------------------------------+
 Buyer in Claude | merchant MCP endpoint (per store)      |
 --------------->|   mcp.sandbox.airwallex.com            |
   search,       |   /pa/ai/{merchantId}/acp/mcp          |
   confirm, pay  | payment component, test card           |
       |         | Payment Intent in the store account    |
       |         +----+--------------+-------------+------+
       |              |              |             ^
       | guest        | checkout     | payment     | merchant onboarding API:
       | sign-in      | call (HMAC,  | notification| onboard (with the store's
       | (OAuth,      | per store)   | (signed)    | sign-in server), config,
       |  PKCE)       v              v             | products (GMC)
       +-------->+----+--------------+-------------+------+
                 | Katun sandbox (sandbox.katunpay.com)   |
                 |  catalog, photos, stock, price, limit  |
                 |  store sign-in server (OAuth, guest)   |
                 |  Exceptions: named human approval      |
                 |  paid once, signed receipt             |
                 |  store connector (MCP) + checkout      |
                 |  TAP signature verification            |
                 |  partner panel: stores, approvals,     |
                 |  consolidated, receipts                |
                 +---------+---------------------+--------+
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
  table. The product photos are served by the Katun sandbox from its own address, which the onboarding declares to Airwallex as
  the store's image domain.
- The buyer signs in to the store as a guest through an OAuth server inside Katun (OpenID discovery, dynamic client
  registration, PKCE S256, ES256 tokens), as Airwallex's merchant contract requires. The token carries a new pseudonym, never an
  email or a phone number.
- Airwallex calls Katun's checkout URL for that store, signed with a per-store HMAC secret that Katun generates and stores
  encrypted. Katun verifies the signature before reading the body. The order is born in Katun with channel `airwallex-mcp`.
- Below the store's limit, Airwallex charges the test card and Katun records the payment once, from Airwallex's signed
  `payment_intent.succeeded` notification or a status check. Above the limit, Katun does not let Airwallex open the checkout: it
  answers `409 requires_merchant_approval` with its order number and the order page. After a named person approves, the buyer
  pays once on that page through an Airwallex Payment Intent and hosted payment page; a rejection cancels the order with no
  charge.
- Airwallex's merchant contract leaves two details open: the shape of the message the buyer sees for that `409`, and where
  Katun's order number travels inside the Payment Intent. Each lives in one module on the Katun side and is confirmed in the live
  run.

## The demonstration store

Caprock Trail Supply, a synthetic outdoor-equipment store with the 100 products of `catalog/`, in a partner sandbox of the
public Katun sandbox. Orders placed there are real test orders in a shared store; no money moves.

| What | Address |
|---|---|
| The store's Katun connector (MCP over HTTP, no sign-in) | `https://sandbox.katunpay.com/t/sbx-tvzsuq4hi6/m/mer_caprock-trail-supply/mcp` |
| The partner's network connector (all its stores) | `https://sandbox.katunpay.com/t/sbx-tvzsuq4hi6/mcp` |
| The store's merchant MCP endpoint hosted by Airwallex | `https://mcp.sandbox.airwallex.com/pa/ai/01b57d8a-2213-4822-98df-be6e37fb465d/acp/mcp` |
| The store's sign-in server (OAuth issuer) for that endpoint | `https://sandbox.katunpay.com/oauth/sbx-tvzsuq4hi6/mer_caprock-trail-supply` |
| The demonstration agent's key directory (JWKS) | `https://baktun-studio.github.io/katun-checkout-for-agents/tap-agent/keys/jwks.json` |
| A receipt, verified offline | `bash verify/verify-receipt.sh sbx-tvzsuq4hi6 <order-number>` |

The store normally accepts assistants that do not identify themselves, so Claude can buy through its Katun connector. For the
Trusted Agent Protocol scene, the Katun platform operator switches its agent policy to registered agents only, and back
afterwards.

## Repository layout

```
catalog/     the 100-product synthetic catalog (products.csv), its generator, and PNG placeholder photos
tap-agent/   demonstration buying agent: Ed25519 key generation, Trusted Agent Protocol signer, MCP purchase, its JWKS
verify/      offline verification of a receipt
scripts/     environment check, fresh-clone smoke test and the step-by-step walkthrough (walkthrough.md)
docs/        TAP notes (what we verified in the public specification and when), the demo video script
```

## Requirements

- Node.js 22 or newer and `curl`. No package installation: the scripts use only Node's standard library.
- An email address or WhatsApp number to sign in to the Katun sandbox (no password, no card).
- An authenticator app for the second factor of the sandbox panel.
- An Airwallex sandbox account (`https://www.sandbox.airwallex.com`), with Payments enabled, a Client ID and an API key.
- For the route through the Airwallex merchant MCP: Airwallex merchant-side Agentic Commerce access, requested from
  `devhelp@airwallex.com` as the hackathon builder guide says (it enables the merchant onboarding API and the merchant MCP
  endpoint), and Claude Desktop, which reaches the endpoint through `mcp-remote` (run with `npx`, so it is fetched from npm).
- For the route through the store's Katun connector: Claude with custom connectors, or Claude Code.

```
node scripts/check-env.mjs
```

## Run it

The full walkthrough, with every screen and command, is in [`scripts/walkthrough.md`](scripts/walkthrough.md). In short:

1. **Create a partner sandbox.** At `https://sandbox.katunpay.com`, Create a sandbox, choose "Processor, PSP or partner", type an
   organization name and your name, and enter the six-digit code you receive. Set up the second factor with an authenticator app.
2. **Add the store.** In Your stores, Add store: a store name, the owner (in the sandbox it can be you), Payments "Airwallex
   (sandbox)", sample catalog unchecked.
3. **Load the catalog.** `node catalog/generate-catalog.mjs`, then import `catalog/products.csv` in the store's Catalog (100 rows
   saved) and upload `catalog/photos.zip` with Upload photos or a .zip; the sandbox serves the photos over `https` from its own
   address. Set the store's order limit to US$ 150.00 in Your business.
4. **Set up the payment method.** In the store's Payment method screen, under Airwallex (sandbox), type the Client ID and the
   Secret key of your Airwallex sandbox account (they are stored encrypted and never shown again). Copy the Notification URL into
   a webhook in the Airwallex sandbox dashboard and type its secret into Notification secret.
5. **Connect to Airwallex.** In the same screen, under Airwallex merchant connector (sandbox), press Connect to Airwallex
   (sandbox), then Publish the catalog to Airwallex (sandbox). The screen shows the Airwallex merchant ID, the Store connector
   address (`https://mcp.sandbox.airwallex.com/pa/ai/{merchantId}/acp/mcp`) and the Claude Desktop configuration.
6. **Connect Claude.** Add that configuration to `claude_desktop_config.json` and reopen Claude Desktop. It runs
   `npx -y mcp-remote <Store connector address>` and carries no token: when Claude connects, the store's sign-in page opens in
   the browser; press Continue as guest.
7. **Buy.** Ask Claude for a product, confirm the terms, pay in the Airwallex payment component with test card
   `4035 5010 0000 0008` (any future date, any CVC), and read the Katun order number. Repeat with an order above US$ 150.00:
   Katun answers with its order number and the store's order page instead of opening Airwallex's checkout. Approve it in
   Exceptions, then pay it once on that page.
   Through the store's Katun connector instead: add `https://sandbox.katunpay.com/t/{institution-id}/m/{store-id}/mcp` (Channels,
   with the store chosen) to Claude as a connector, ask for a product, confirm the terms, open the payment link Claude returns,
   press Pay with Airwallex (sandbox) and pay on Airwallex's page with the same test card. Steps 5 and 6 are not needed for this
   route.
8. **Verify the receipt offline.** `bash verify/verify-receipt.sh <institution-id> <order-number>`.
9. **Second scene, TAP.** `node tap-agent/demo-buy.mjs --mcp <the store's Katun connector> --query "headlamp" --sku LGT-01`,
   with `--unsigned`, signed, and with `--replay` to resend the signed order request with its used `nonce`. The store's agent
   policy and the platform registry are set by the Katun platform operator, and the demonstration agent's private key is not in
   this repository; with your own key, ask for your key directory to be registered (see
   [`tap-agent/README.md`](tap-agent/README.md) and step 10 of the walkthrough).
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
| Partner sandbox, store, catalog import, order limit, network view | Verified live on November 5, 2026 |
| Airwallex (sandbox) payment method and its credentials | Verified live on November 5, 2026 |
| Airwallex notification URL (webhook) for the demonstration store | Implemented in the sandbox, pending live run |
| Merchant onboarding to Airwallex (with the store's sign-in server) and catalog publication from the panel | Verified live on November 5, 2026 |
| Purchase in Claude through the Airwallex merchant MCP endpoint, order number back | Verified live on November 5, 2026 (KP-6HP6F) |
| Purchase in Claude through the store's Katun connector, paid on Airwallex's hosted payment page (Payment Intents), order number back | Verified live on November 4, 2026 |
| Order above the limit, named approval, paid once | Verified live on November 5, 2026 (KP-TKKVD) |
| Declined test card without a charge | Verified live on November 5, 2026 (KP-MCB5A) |
| Changed price or unavailable product without a duplicate payment | Implemented in the sandbox, pending live run |
| Signed receipt with the Airwallex sandbox Payment Intent, verified offline | Verified live on November 5, 2026 (KP-TKKVD) |
| TAP-signed agent accepted, unsigned agent refused, repeated nonce refused | Verified live on November 5, 2026 (KP-8BE7N) |
| `scripts/check-env.mjs` against the sandbox (docs, public keys, verifier reachable) | Verified on November 3, 2026 |
| `scripts/smoke-test.mjs` on a fresh clone (everything above that needs no account) | Verified on November 5, 2026; runs daily in GitHub Actions |
| `tap-agent/sign.mjs --self-test` (signature verifies on the right host, fails on another) | Verified locally on November 3, 2026 |
| Catalog generator (100 products, deterministic output) | Verified locally on November 3, 2026 |
| The demonstration agent's key directory served over https and identical to `tap-agent/keys/jwks.json` | Verified on November 3, 2026 |

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
