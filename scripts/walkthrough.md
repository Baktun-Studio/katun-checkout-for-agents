# Walkthrough: reproduce the demonstration step by step

Everything here runs against the public Katun sandbox (`https://sandbox.katunpay.com`) and the Airwallex sandbox
(`https://api.sandbox.airwallex.com`), with synthetic data and test cards. No money moves. Screen names are the English texts of
the Katun panel; the panel also runs in Spanish.

Status on November 3, 2026: every step is implemented in the sandbox; the live runs are pending (see the status table in the
README). Steps 6 to 8 need Airwallex merchant-side Agentic Commerce access and Claude Desktop; step 8b is the same purchase
through the store's own Katun connector and needs neither.

To look before building your own, the README lists the addresses of the demonstration store (Caprock Trail Supply).

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
   says. It enables the merchant onboarding API that step 6 uses, and with it the merchant MCP endpoint of each onboarded store.

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

   It writes `catalog/products.csv` (100 products, image column empty) and `catalog/photos.zip` (one PNG photo per product,
   named by SKU). The sandbox and the Airwallex catalog only publish products that have a photo; the photos are uploaded to the
   sandbox itself in step 3, so no outside image host is needed.
2. Sign out and sign in again with your contact; choose the store to see it as its owner.
3. In Catalog, download the CSV template once to confirm the columns have not changed, then import `catalog/products.csv`. The
   report must say 100 rows saved and none with problems. Then, in the same screen, use Upload photos or a .zip with
   `catalog/photos.zip`: each photo is matched to its product by the SKU in the file name, and the sandbox serves it from its own
   address.
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
   with the merchant onboarding API, using the credentials above, its own checkout URL for this store, a checkout secret it
   generates and keeps encrypted, the store's sign-in server (an OAuth issuer inside Katun,
   `https://sandbox.katunpay.com/oauth/{institution-id}/{store-id}`) and the sandbox's address as the store's image domain.
2. The screen shows the Onboarding status, the Airwallex merchant ID, the Store connector address
   (`https://mcp.sandbox.airwallex.com/pa/ai/{merchantId}/acp/mcp`) and the Claude Desktop configuration.
3. Press Publish the catalog to Airwallex (sandbox). Last publication shows how many products were sent, added, updated and failed.
   Download the catalog (TSV) gives the same rows for Airwallex's file upload.

## 7. Connect Claude

Copy the Claude Desktop configuration from the screen into `claude_desktop_config.json` and reopen Claude Desktop. It has this
form and carries no token:

```
{
  "mcpServers": {
    "agentic-commerce": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.sandbox.airwallex.com/pa/ai/{merchantId}/acp/mcp"]
    }
  }
}
```

When Claude Desktop connects, the store's sign-in page opens in the browser ("Sign in to" the store, "Test store: no real money
is charged."). Press Continue as guest: no personal data is asked, and the token carries a new pseudonym.

Do not use Airwallex's docs or developer MCP servers as the store endpoint.

## 8. Buy

1. Ask Claude for something in the catalog ("a headlamp for a weekend trip"). Refine, choose, and ask to buy.
2. Claude confirms store, product, quantity, delivery and total before paying. Behind it, Airwallex calls Katun's checkout for
   this store, which checks stock, price and the order limit and answers with the Katun order number.
3. Pay in the payment component Airwallex presents, with test card `4035 5010 0000 0008`, any future date and any CVC. The card goes
   only into that component, never into the chat.
4. Claude reports the payment outcome and the Katun order number (`KP-` followed by five characters).
5. In the Katun panel, the order is in Orders with channel Airwallex (sandbox) and its receipt. Katun recorded the payment once,
   from Airwallex's signed `payment_intent.succeeded` notification.

### The exception path

- **Over the limit:** buy something above US$ 150.00 (a tent, for example). Katun does not let Airwallex open the checkout for it:
  it answers with its order number and the store's order page, and nothing is charged. The order waits in Exceptions. Choose the
  store above the menu, open Exceptions and approve it. Then open the order page, press Pay with Airwallex (sandbox) and pay on
  Airwallex's hosted payment page with the test card: the order is paid once, and the receipt records who approved it.
  Rejecting it instead cancels it with no charge.
- **Declined card:** pay with `4646 4646 4646 4644` (declined by the Airwallex risk engine, any total). The payment is declined,
  the order stays unpaid and no second payment is created.
- **Changed price or unavailable product:** change a product's price or set its stock to 0 in Catalog after Claude showed it.
  Katun's checkout answers with the current price or the unavailability, and nothing is charged until the buyer confirms again.

## 8b. The same purchase through the store's Katun connector

This route needs steps 2 to 5 only (no Airwallex merchant-side access).

1. In the panel, choose the store above the menu and open Channels. Copy the store's connector address
   (`https://sandbox.katunpay.com/t/{institution-id}/m/{store-id}/mcp`).
2. Add it to Claude as a custom connector (in Claude Code:
   `claude mcp add --transport http outdoor-store "<store connector address>"`). It needs no token and no sign-in.
3. Ask Claude for something in the catalog ("a headlamp for a weekend trip"). Claude confirms store, product, quantity,
   delivery and total, creates the order and returns the Katun order number (`KP-` followed by five characters) with a payment
   link.
4. Open the link. The store's public order page shows the order and Pay with Airwallex (sandbox). Press it: Airwallex's hosted
   payment page opens. Pay with test card `4035 5010 0000 0008`, any future date and any CVC.
5. Back on the order page, the order is paid. In the panel, it is in Orders with channel AI assistant and its receipt, whose
   rail is `airwallex-sandbox` with the Payment Intent identifiers.
6. The exception path: an order above US$ 150.00 waits in Exceptions, and its order page has no payment button until a person
   approves it; then it is paid once on that page. A declined test card (`4646 4646 4646 4644`, declined by the risk engine, any
   total) leaves the order unpaid, with no capture, and trying to pay it again does not create a second Payment Intent.

## 9. Verify the receipt offline

```
bash verify/verify-receipt.sh <institution-id> <order-number>
```

`<institution-id>` is the identifier in your network connector's address under Channels
(`https://sandbox.katunpay.com/t/{institution-id}/mcp`); for the demonstration store it is `sbx-tvzsuq4hi6`. Only a paid order has
a signed record. The script downloads the key index, the public keys, the single-file verifier and the signed record into
`verify/out/<order-number>/`, then verifies with no network. Expected first lines:

```
VALID (12 ms, offline) key=... format=katun-evidence/1
Test record: no money moved
```

Change one letter in `verify/out/<order-number>/record.json` and run the verifier again, with no network:

```
node verify/out/<order-number>/katun-verify.mjs verify/out/<order-number>/record.json --keys-dir verify/out/<order-number>/keys --lang en
```

The output starts with `INVALID`.

## 10. Second scene: a buying agent with a Trusted Agent Protocol signature

This scene uses the store's own Katun connector (Channels, with the store chosen:
`https://sandbox.katunpay.com/t/{institution-id}/m/{store-id}/mcp`). Each `demo-buy.mjs` run that gets past the first request
places a real test order; `--sku LGT-01` orders the 400-lumen headlamp instead of the first search result.

```
node tap-agent/keygen.mjs            # once; the private key stays in tap-agent/keys/private/, ignored by git
node tap-agent/sign.mjs --self-test  # the signature verifies on the right host and fails on another
node tap-agent/demo-buy.mjs --mcp <store connector> --query "headlamp" --sku LGT-01 --unsigned
node tap-agent/demo-buy.mjs --mcp <store connector> --query "headlamp" --sku LGT-01
node tap-agent/demo-buy.mjs --mcp <store connector> --query "headlamp" --sku LGT-01 --replay
```

A store recognizes a signing agent only when the Katun platform operator has added the agent's key directory to the platform
registry, and refuses unidentified agents only when its agent policy is Registered agents only. In the demonstration store the
registered directory is the demonstration agent's
(`https://baktun-studio.github.io/katun-checkout-for-agents/tap-agent/keys/jwks.json`), whose private key is not in this
repository, and the store normally accepts unidentified assistants so Claude can buy through its connector. For the scene, the
operator switches the policy to Registered agents only: the unsigned run gets `401` with `agent_not_verified`; the signed run
places the order; with `--replay`, the signed order request is sent a second time exactly as it was (same signature, same
`nonce`) and gets `401`. Then the operator switches the policy back. Buying agents in the panel lists the agents the platform
recognizes, and every attempt is recorded with the protocol the agent identified itself with.

`keygen.mjs` replaces `tap-agent/keys/jwks.json` with your own public key. To run the signed scene with it, serve that file over
`https` and ask the platform operator to register it; in your own sandbox the policy and the registry are not yours to change.

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
