# Walkthrough: reproduce the demonstration step by step

Everything here runs against the public Katun sandbox (`https://sandbox.katunpay.com`) and the Airwallex sandbox
(`https://api.sandbox.airwallex.com`), with synthetic data and test cards. No money moves. Screen names are the English texts of
the Katun panel; the panel also runs in Spanish.

Status on 2 November 2026: every step is implemented in the sandbox; the live runs are pending (see the status table in the
README). Steps 6 to 9 need Airwallex merchant-side Agentic Commerce access.

## 0. Before you start

```
node scripts/check-env.mjs
```

All lines must say `ok`. You also need an email address or WhatsApp number for the sandbox sign-in, an authenticator app for the
second factor, and an Airwallex sandbox account.

## 1. Airwallex sandbox account

1. Sign up at `https://www.sandbox.airwallex.com`. Airwallex's developer pages say the entity name has to be "Sandbox Business"
   (or "New Business Sandbox") so the account is not left in review.
2. Enable Payments and at least one card payment method.
3. Create a Client ID and an API key in Account, Developer, API keys. Keep them in a password manager or a local file with
   restricted permissions. Never paste them into a chat with an assistant.
4. Email `devhelp@airwallex.com` to ask for merchant-side Agentic Commerce access for that account, as the hackathon builder guide
   says. With it come the merchant MCP endpoint, the token Claude uses for it, and the test-checkout instructions.

## 2. Partner sandbox in Katun

1. Open `https://sandbox.katunpay.com` and press Create a sandbox.
2. In "What is your organization?", choose Processor, PSP or partner.
3. In Your details: Organization name (a fictional one), Your name, Sandbox language English, Your email or WhatsApp. Accept the
   sandbox terms and press Send me the code.
4. Type the six-digit code and press Create my sandbox.
5. People of an institution always use a second factor: scan the QR code with your authenticator app and type its code.
6. You land in Home, with Getting started and Your stores (empty).

A contact can have up to three sandboxes. A sandbox is deleted after 30 days without use.

## 3. The store

1. In Your stores, press Add store.
2. Store name: a fictional outdoor-equipment store. Owner or manager: a name. Their email or WhatsApp: in the sandbox it can be
   your own contact.
3. Payments: Airwallex (sandbox). Uncheck Start with the sample catalog.
4. Press Add and invite. The store is created in US dollars with an order limit of US$ 1,500.00.
5. Press Set up the payment method, or come back later from the store's Payment method screen.

## 4. The catalog and the order limit

1. Generate the catalog:

   ```
   node catalog/generate-catalog.mjs
   ```

   It writes `catalog/products.csv` (100 products) and a PNG placeholder photo per product in `catalog/images/`. The sandbox and
   the Airwallex catalog only publish products whose photo is reachable over `https`; by default the CSV points to this
   repository's files on `raw.githubusercontent.com`. If you use a fork or a private copy, pass `--image-base <https URL>` with a
   public host where you copied `catalog/images/`.
2. Sign out and sign in again with your contact; choose the store to see it as its owner.
3. In Catalog, download the CSV template once to confirm the columns have not changed, then import `catalog/products.csv`. The
   report must say 100 rows saved and none with problems.
4. In Your business, set the Order limit to US$ 150.00, so an order above it waits for a person's approval.

## 5. The payment method

Sign in again as the institution's operator (a store's payment method is set up by its institution's operator) and open the
store's Payment method screen.

1. Under Test, Airwallex (sandbox): type the Client ID and the Secret key (the API key) of your Airwallex sandbox account and press
   Save. They are stored encrypted; the screen never shows them again.
2. Copy the Notification URL shown there. In the Airwallex sandbox dashboard, create a webhook with that URL for the Payment Intent
   events, and type the secret Airwallex gives you for it into Notification secret. Save.
3. Press Use this payment method if Airwallex (sandbox) is not already In use.

## 6. Connect the store to Airwallex

Needs Airwallex merchant-side access.

1. In the same screen, under Airwallex merchant connector (sandbox), press Connect to Airwallex (sandbox). Katun onboards the store
   with the merchant onboarding API, using the credentials above, its own checkout URL for this store and a checkout secret it
   generates and keeps encrypted.
2. The screen shows the Onboarding status, the Airwallex merchant ID and the Store connector address
   (`https://api.sandbox.airwallex.com/pa/ai/{merchantId}/acp/mcp`).
3. Press Publish the catalog to Airwallex (sandbox). Last publication shows how many products were sent, added, updated and failed.
   Download the catalog (TSV) gives the same rows for Airwallex's file upload.

## 7. Connect Claude

Add the Store connector address as an HTTP MCP server, with the token Airwallex provides for it. With Claude Code, for example:

```
claude mcp add --transport http outdoor-store "<Store connector address>" --header "Authorization: Bearer <token from Airwallex>"
```

Do not use Airwallex's docs or developer MCP servers as the store endpoint.

## 8. Buy

1. Ask Claude for something in the catalog ("a headlamp for a weekend trip"). Refine, choose, and ask to buy.
2. Claude confirms store, product, quantity, delivery and total before paying.
3. Pay in the payment component Airwallex presents, with test card `4035 5010 0000 0008`, any future date and any CVC. The card goes
   only into that component, never into the chat.
4. Claude reports the payment outcome and the Katun order number (`KP-` followed by five characters).
5. In the Katun panel, the order is in Orders with channel Airwallex (sandbox) and its receipt.

### The exception path

- **Over the limit:** buy something above US$ 150.00 (a tent, for example). The order waits in Exceptions. Choose the store above the
  menu, open Exceptions and approve it: the payment is captured once and the receipt records who approved it.
- **Declined card:** make an order of exactly US$ 80.51 and pay with `2223 0000 1018 1375`. The payment is declined, the order stays
  unpaid and no second payment is created.
- **Changed price or unavailable product:** change a product's price or set its stock to 0 in Catalog after Claude showed it.
  Katun's checkout answers with the current price or the unavailability, and nothing is charged until the buyer confirms again.

## 9. Verify the receipt offline

```
bash verify/verify-receipt.sh <institution-id> <order-number>
```

`<institution-id>` is the identifier in your network connector's address under Channels
(`https://sandbox.katunpay.com/t/{institution-id}/mcp`). The script downloads the key index, the public keys, the single-file
verifier and the signed record, then verifies with no network. Expected first lines:

```
VALID (12 ms, offline) key=... format=katun-evidence/1
Test record: no money moved
```

Change one letter in `verify/out/<order-number>/registro.json` and run the last command of the script again: `INVALID`.

## 10. Second scene: a buying agent with a Trusted Agent Protocol signature

This scene uses the store's own Katun connector (Channels, with the store chosen: `https://sandbox.katunpay.com/t/{institution-id}/m/{store-id}/mcp`).

```
node tap-agent/keygen.mjs            # once; the private key stays in tap-agent/keys/private/, ignored by git
node tap-agent/sign.mjs --self-test  # the signature verifies on the right host and fails on another
node tap-agent/demo-buy.mjs --mcp <store connector> --query "headlamp" --unsigned
node tap-agent/demo-buy.mjs --mcp <store connector> --query "headlamp"
```

In the demonstration store, the Katun platform operator has set the agent policy to Registered agents only and has added this
agent's key directory to the platform registry. The unsigned run gets `401` with `agent_not_verified`; the signed run places the
order; Buying agents in the panel lists the agents the platform recognizes, and every attempt is recorded with the protocol the
agent identified itself with. In your own sandbox the policy and
the registry are not yours to change: ask the platform operator to register your agent's key directory, or run the scene against
the demonstration store.

## 11. The network view

Choose All stores above the menu.

- **Home:** Your stores with sales today, orders to approve, orders and each store's status.
- **Exceptions:** the orders waiting for approval across the network, with "The store decides"; choose the store to decide on its
  behalf, recorded under your name.
- **Consolidated:** sales by store, by channel (Airwallex (sandbox) among them) and by currency, from the payments ledger, with its
  CSV export.
- **Channels:** the network connector that searches all your stores.
- **Orders:** each order of the network with its receipt; open one and press Verify to check its signature against the public
  keys.

Do not seed orders. The orders in the demonstration are the real test orders made while rehearsing it.
