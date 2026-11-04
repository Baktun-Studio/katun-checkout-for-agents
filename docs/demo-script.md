# Demo video script

Target length 4:30 (hard limit under 5:00). English narration with an AI-generated voice over a prepared screen recording. Only scenes that
have run live are recorded; a scene that has not run is cut, not simulated. Every order on screen is a real test order made in the
sandbox; none is seeded.

Scenes 2 to 4 have two versions with the same timing:

- **Version A, Airwallex merchant MCP.** Claude buys through the merchant MCP endpoint that Airwallex hosts for the store. Recorded
  only if that purchase has run live.
- **Version B, the store's Katun connector.** Claude buys through the store's own Katun connector and pays on Airwallex's hosted
  payment page (Payment Intents). Recorded if version A has not run live by the recording day.

Exactly one version goes into the video. Scenes 1 and 5 to 8 are the same for both, with the small differences marked in each scene.

Judging criteria and where each one is served:

| Criterion | Scenes |
|---|---|
| Relevance | 2, 3, 4 |
| Impact | 1, 7, 8 |
| Innovation | 4, 5, 6 |
| Complexity and implementation | 3, 5, 6, 7 |
| Product integration | 2, 3, 4, 6 |

Recording rules:

- No credentials, tokens or card data on screen, except the test card typed inside Airwallex's payment component or hosted page.
- No real person's name or contact on screen: the panel is used as the sandbox person "Demo Operator"; blur any contact field.
- The browser address bar shows only `sandbox.katunpay.com`, Airwallex sandbox pages and the public repository.

## Scene 1. The problem (0:00 to 0:20) · Impact

On screen: title card "Katun Checkout for Agents", then the Katun sandbox home page.

Narration: "When an AI agent buys from a store, the store has three questions: is this agent who it says it is, is it allowed to
spend this much, and what exactly did we agree to? Katun answers them for the merchant, and here it sits behind an Airwallex
merchant."

## Version A: Airwallex merchant MCP

### Scene 2A. Setup: the store, its catalog and its Airwallex connection (0:20 to 0:55) · Relevance, Product integration

On screen: the partner panel, Your stores with Caprock Trail Supply; its Catalog with 100 products; the Payment method screen with
Airwallex (sandbox) In use (credentials shown only as loaded, never their values); the Airwallex merchant connector (sandbox)
section after Connect to Airwallex (sandbox) and Publish the catalog to Airwallex (sandbox): merchant ID, Store connector
address, Last publication with its counts.

Narration: "This is a synthetic store in a partner's sandbox. Its catalog lives in Katun. One button onboards the store to
Airwallex through the merchant onboarding API, and another publishes its hundred products in the Merchant Center format. Airwallex
now hosts an MCP endpoint for this store."

### Scene 3A. The Claude configuration and the purchase (0:55 to 2:00) · Relevance, Product integration, Complexity

On screen: the Claude connector configuration with the Store connector address (token hidden); a Claude chat: "I need a headlamp
for a weekend trip, under 60 dollars"; results from the catalog; Claude confirms store, product, quantity, delivery and total; the
Airwallex payment component; test card 4035 5010 0000 0008 typed in the component; Claude reports the payment outcome and the
Katun order number; the Katun panel, Orders, the same order with channel Airwallex (sandbox).

Narration: "Claude searches through the Airwallex endpoint, confirms the terms, and the card goes only into Airwallex's payment
component, never into the chat. Before anything is charged, Airwallex asks Katun's checkout, signed with a secret only this store
and Airwallex share. Katun checks stock, price and limit and answers with its own order number, which is what the buyer gets back."

### Scene 4A. The exception: over the limit, approved by a person (2:00 to 2:45) · Relevance, Innovation, Product integration

On screen: Claude asks for a tent above the store's US$ 150.00 limit; the order is pending approval; the panel's Exceptions with
the order; the store chosen above the menu; Approve; the order captured once; the receipt shows who approved it. If recorded: the
declined test card, the order unpaid and no second payment.

Narration: "This order is over the store's limit, so nothing is captured. It waits for a named person, who approves it, and the
authorized payment is captured exactly once. A declined card leaves the order unpaid, with no second attempt."

## Version B: the store's Katun connector, paid with Airwallex Payment Intents

### Scene 2B. Setup: the store, its catalog and its Airwallex payment method (0:20 to 0:55) · Relevance, Product integration

On screen: the partner panel, Your stores with Caprock Trail Supply; its Catalog with 100 products; the Payment method screen with
Airwallex (sandbox) In use (credentials shown only as loaded, never their values) and its Notification URL; Channels with the
store chosen, showing the store's connector address.

Narration: "This is a synthetic store in a partner's sandbox. Its catalog lives in Katun, and it takes payments through the
Airwallex sandbox: the store's own Airwallex credentials, stored encrypted, and Airwallex's signed notifications. Any AI assistant
can shop here through the store's connector."

Narration line to add only if, on the recording day, Airwallex's merchant MCP endpoint still has not run live for this store
(adapt the words to the facts of that day): "Airwallex's merchant endpoint for agents was still being rolled out to our sandbox
account, so in this video Claude talks to the store's own connector, and the payment runs on Airwallex."

### Scene 3B. The purchase in Claude, paid on Airwallex (0:55 to 2:00) · Relevance, Product integration, Complexity

On screen: Claude with the store's connector added; a Claude chat: "I need a headlamp for a weekend trip, under 60 dollars";
results from the catalog; Claude confirms store, product, quantity, delivery and total; Claude returns the Katun order number and
the payment link; the store's public order page; Pay with Airwallex (sandbox); Airwallex's hosted payment page; test card 4035 5010
0000 0008 typed there; back on the order page, paid; the Katun panel, Orders, the same order with its receipt.

Narration: "Claude searches the store's catalog, confirms the terms, and Katun answers with its own order number and a payment
link. The card goes only into Airwallex's hosted payment page, never into the chat. Katun created an Airwallex Payment Intent for
this order, and Airwallex's signed notification confirms it. Stock, price and the order limit were checked by Katun before
anything was charged."

### Scene 4B. The exception: over the limit, approved by a person (2:00 to 2:45) · Relevance, Innovation, Product integration

On screen: Claude asks for a tent above the store's US$ 150.00 limit; the order is pending approval; the panel's Exceptions with
the order; the store chosen above the menu; Approve; the order captured once; the receipt shows who approved it. If recorded: an
order paid with the declined test card 4646 4646 4646 4644, the order unpaid and no second payment.

Narration: "This order is over the store's limit, so nothing is captured. It waits for a named person, who approves it, and the
authorized payment is captured exactly once. A declined card leaves the order unpaid, and paying again does not create a second
payment."

## Scene 5. The receipt, verified offline (2:45 to 3:20) · Innovation, Complexity

On screen: terminal, `bash verify/verify-receipt.sh <institution-id> <order-number>`; output `VALID ... format=katun-evidence/1`
and `Test record: no money moved`; one letter changed in the record; `INVALID`.

Narration: "Every paid order has a signed record: channel, limit, approver and the Airwallex sandbox payment identifiers. Anyone
can verify it offline with a single file and our public keys. Change one letter, and it fails. This was a test charge in the
Airwallex sandbox; no money moved."

## Scene 6. A buying agent that identifies itself (3:20 to 3:55) · Innovation, Complexity, Product integration

On screen: terminal, `node tap-agent/demo-buy.mjs --mcp <store connector> --query "headlamp" --unsigned` answered with 401; the
same command signed with `--replay`: the order placed, then the replayed signed request answered with 401; the request headers
(`Signature-Input` with `tag="agent-payer-auth"`, `nonce`, `alg="Ed25519"`); the panel's Buying agents with the attempts.

Narration: "Some agents buy on their own. This store accepts registered agents only. Without a signature, 401. With a Trusted
Agent Protocol signature, the order goes through, and the same signed request sent again is refused for its repeated nonce. Agent
identity verified with Visa's Trusted Agent Protocol signatures, tested against our own TAP-conformant agent."

## Scene 7. The network view (3:55 to 4:20) · Impact, Complexity

On screen: All stores: Home with Your stores, sales and orders to approve; Exceptions with "The store decides"; Consolidated by
store, channel and currency (version A shows the channel Airwallex (sandbox); version B shows AI assistant); Channels with the
network connector.

Narration: "A bank, a processor or a partner switches this on for every store in its network. The operator sees the stores, the
approvals waiting across the network, and the sales by store and channel, with every receipt verifiable."

## Scene 8. Close (4:20 to 4:30) · Impact

On screen: repository URL and the sandbox URL.

Narration: "Katun Checkout for Agents. Merchant rules, human approval and proof, behind any agentic checkout. Everything you saw
runs in public sandboxes, and the repository shows how to reproduce it."

## Conditional scenes, excluded unless they ran live

- **Airwallex's buyer agent (Airi CLI) as the buyer.** Only if Airwallex releases Airi's test mode with a test card, the store is
  connected to the Airwallex merchant MCP endpoint, and the scene runs live before the recording. Otherwise it is not recorded and
  the README lists it under Next steps.
- **Visa Intelligent Commerce on the agent side.** Only if Visa grants sandbox access and the scene runs live. Otherwise it is not
  recorded and the README lists it under Next steps.
