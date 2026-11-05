# Demo video script

Length 4:45 (hard limit under 5:00). English narration with an AI-generated voice over screen recordings of live runs in the
sandboxes. Every order on screen is a real test order made in the sandbox on November 5, 2026; none is seeded. No money moved.

The video follows the Airwallex merchant MCP route: Claude buys through the merchant MCP endpoint that Airwallex hosts for the
demonstration store, Caprock Trail Supply. Each sentence of the narration plays while the moment it names is on screen.

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
- The panel is used as the sandbox person "Demo Operator".
- The browser address bar shows only `sandbox.katunpay.com`, Airwallex sandbox pages and the public repository.

## Scene 1. The problem (0:00 to 0:23) · Impact

On screen: title card "Katun Checkout for Agents"; the three questions, one at a time; where Katun sits (Claude, Airwallex,
Katun, the store).

Narration: "When an AI agent buys from a store, the store has three questions. Is this agent who it says it is? Is it allowed to
spend this much? And what exactly did we agree to? Katun answers all three for the merchant, right behind Airwallex."

## Scene 2. Setup: the store, its catalog and its Airwallex connection (0:23 to 0:48) · Relevance, Product integration

On screen: the partner panel, Your stores with Caprock Trail Supply; its Catalog with 100 products; the Airwallex merchant
connector (sandbox) section with Connect to Airwallex (sandbox) and Publish the catalog to Airwallex (sandbox) highlighted; the
Store connector address highlighted.

Narration: "Here is a test store in a partner's sandbox: Caprock Trail Supply. Katun keeps its catalog, a hundred products, and
its rules. One button onboards the store to Airwallex, and another publishes the catalog in Merchant Center format. Airwallex now
hosts an MCP endpoint for this store. That's where Claude shops."

## Scene 3. The purchase in Claude (0:48 to 1:45) · Relevance, Product integration, Complexity

On screen: a Claude chat, "I need a headlamp for a weekend trip, under 60 dollars"; Claude searches the store through the
Airwallex endpoint; the product card (Headlamp, 400 lumen, US$ 45.00) and Checkout; the review with the buyer's details;
Airwallex's payment component with test card 4035 5010 0000 0008; Order confirmed with the Katun order number KP-6HP6F.

Narration: "I ask Claude for a headlamp under sixty dollars. Claude searches the store's catalog through the Airwallex endpoint.
It finds a forty-five dollar headlamp from Caprock Trail Supply, and I check out. Before anything is charged, Airwallex asks
Katun's checkout, with a secret only the two of them share. Katun checks stock, price and the store's limit. The card goes only
into Airwallex's payment component, never into the chat. Paid, and the buyer gets Katun's own order number back."

## Scene 4. The exception and the declined card (1:45 to 3:00) · Relevance, Innovation, Product integration

On screen: in Claude, a Basin 3-person tent at US$ 249.00, above the store's US$ 150.00 limit; Continue to payment stays
disabled; the order page waiting; the panel's Exceptions, Approve; the order page, Pay with Airwallex (sandbox), Airwallex's
hosted page with the test card; the order record with "Approved by Demo Operator" highlighted (order KP-TKKVD, paid once). Then,
in Claude, test card 4646 4646 4646 4644 refused inside Airwallex's component: "The transaction is blocked because of risk
concern."

Narration: "Now I ask Claude for a tent. It costs two hundred forty-nine dollars, over the store's hundred and fifty dollar limit.
So the payment button stays off, and nothing is charged. The order waits in the store's exceptions for a named person, who
approves it. Only then can it be paid, on Airwallex's own page, exactly once. And the record shows who approved it. Next, a test
card that Airwallex declines. Airwallex's component refuses it, and nothing is charged."

## Scene 5. The receipt, verified offline (3:00 to 3:30) · Innovation, Complexity

On screen: the transaction evidence certificate of KP-TKKVD; a terminal, `bash verify/verify-receipt.sh sbx-tvzsuq4hi6 KP-TKKVD`,
output `VALID ... format=katun-evidence/1` and `Test record: no money moved`; one letter changed in the record with `sed`;
`INVALID`.

Narration: "Every paid order gets a signed record: channel, limit, approver and the Airwallex payment IDs. Anyone can verify it
offline, with one file and our public keys. Change one letter in the record. And the check fails. This was a test charge in the
Airwallex sandbox. No money moved."

## Scene 6. A buying agent that identifies itself (3:30 to 4:07) · Innovation, Complexity, Product integration

On screen: split screen. Left, a terminal: `node tap-agent/demo-buy.mjs --mcp "$STORE" --query "headlamp" --unsigned` answered
with 401; the same command signed, the order placed (KP-8BE7N), and the replayed signed request answered with 401; the request
headers (`Signature-Input` with `tag="agent-payer-auth"`, `nonce`, `alg="Ed25519"`). Right, the panel's Buying agents; then the
panel with the three attempts: rejected, accepted, replay refused.

Narration: "Some agents buy on their own. This store only accepts registered agents. Without a signature: 401. With a Trusted
Agent Protocol signature, the order goes through. Send the same signed request again, and it's refused for its repeated nonce.
The signature follows Visa's Trusted Agent Protocol, tested against our own conformant agent. And the store's panel logs every
attempt: rejected, accepted, and the replay refused."

## Scene 7. The network view (4:07 to 4:31) · Impact, Complexity

On screen: All stores: Home with Your stores; Exceptions; Consolidated by store, channel and currency with the channel Airwallex
(sandbox); Channels with the network connector.

Narration: "A bank, a processor or a partner turns this on for every store in its network. The operator sees the approvals
waiting across the network. Sales by store and by channel. And one connector that reaches all its stores."

## Scene 8. Close (4:31 to 4:45) · Impact

On screen: repository URL and the sandbox URL.

Narration: "Katun Checkout for Agents. Merchant rules, human approval and proof, behind any agentic checkout. Everything you saw
runs in public sandboxes, and the repository shows how to reproduce it."
