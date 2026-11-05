#!/usr/bin/env node
// Second scene of the demo: an autonomous agent buys from a Katun merchant connector over MCP (streamable HTTP, JSON-RPC 2.0),
// signing every request with its Trusted Agent Protocol signature. With --unsigned it sends the same calls without a signature,
// to show what the merchant answers to an agent it cannot identify.
//
//   node tap-agent/demo-buy.mjs --mcp https://sandbox.katunpay.com/t/{pub}/m/{store}/mcp --query "headlamp" --sku LGT-01 --quantity 1
//   node tap-agent/demo-buy.mjs --mcp ... --query "headlamp" --unsigned
//   node tap-agent/demo-buy.mjs --mcp ... --query "headlamp" --replay   # then resends the signed session request as is
//
// Tool and argument names (buscar_productos, disponibilidad, crear_pedido, cantidad, comprador, idioma) are the Katun sandbox
// connector's own, as its tools/list publishes them; see https://sandbox.katunpay.com/docs/referencia-del-conector?lang=en.
// --sku picks the product to order; without it, the first search result is ordered.
// Browsing calls (search, product) are tagged agent-browser-auth; the order is tagged agent-payer-auth. The buyer pseudonym is
// fixed and synthetic. No card data is ever sent: the order's payment happens on the merchant's public order page.
// With --replay, after the order is placed the signed request that opened the session (same headers, same nonce, same body)
// is sent again, the way an eavesdropper would replay it; a merchant that enforces single-use nonces answers 401. The Katun
// connector checks the agent's signature when the session opens (initialize), so that is the request replayed here.
import { loadAgentKeys, signRequest } from "./sign.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const MCP = opt("--mcp");
if (!MCP || !MCP.startsWith("https://")) {
  console.error("--mcp https://sandbox.katunpay.com/t/{institution-id}/m/{store-id}/mcp is required");
  process.exit(2);
}
const QUERY = opt("--query", "headlamp");
const QUANTITY = Number(opt("--quantity", "1"));
const LANG = opt("--lang", "en");
const UNSIGNED = args.includes("--unsigned");
const REPLAY = args.includes("--replay");
if (UNSIGNED && REPLAY) {
  console.error("--replay needs a signed request; drop --unsigned");
  process.exit(2);
}
const SIGNATURE_AGENT = opt("--signature-agent", undefined);
const keys = UNSIGNED ? null : loadAgentKeys();

let sessionId = null;
let nextId = 1;
let lastRequest = null;

async function rpc(method, params, tag) {
  const payload = { jsonrpc: "2.0", id: nextId++, method, params };
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  if (keys) Object.assign(headers, signRequest({ method: "POST", url: MCP, keyid: keys.keyid, privateKeyPem: keys.privateKeyPem, tag, signatureAgent: SIGNATURE_AGENT }).headers);
  const body = JSON.stringify(payload);
  lastRequest = { headers: { ...headers }, body };
  const res = await fetch(MCP, { method: "POST", headers, body });
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;
  const text = await res.text();
  if (!res.ok) {
    console.log(`${method}: HTTP ${res.status}`);
    console.log(text.slice(0, 600));
    process.exit(1);
  }
  // Streamable HTTP may answer as JSON or as an SSE stream of "data:" lines; take the message with our id.
  const ct = res.headers.get("content-type") ?? "";
  let messages = [];
  if (ct.includes("text/event-stream")) {
    for (const line of text.split("\n")) if (line.startsWith("data:")) messages.push(JSON.parse(line.slice(5).trim()));
  } else if (text.trim()) {
    const j = JSON.parse(text);
    messages = Array.isArray(j) ? j : [j];
  }
  const reply = messages.find((m) => m.id === payload.id);
  if (!reply) return null;
  if (reply.error) throw new Error(`${method}: ${JSON.stringify(reply.error)}`);
  return reply.result;
}

async function notify(method, params) {
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  if (keys) Object.assign(headers, signRequest({ method: "POST", url: MCP, keyid: keys.keyid, privateKeyPem: keys.privateKeyPem, tag: "agent-browser-auth", signatureAgent: SIGNATURE_AGENT }).headers);
  await fetch(MCP, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", method, params }) });
}

function textOf(result) {
  return (result?.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
}

console.log(UNSIGNED ? "mode: unsigned agent" : `mode: TAP-signed agent, kid ${keys.keyid}`);
await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "katun-checkout-for-agents demo", version: "0.1.0" } }, "agent-browser-auth");
const sessionRequest = lastRequest;
await notify("notifications/initialized", {});
console.log(`session: ${sessionId ?? "(none)"}`);

const search = await rpc("tools/call", { name: "buscar_productos", arguments: { q: QUERY, limite: 3, idioma: LANG } }, "agent-browser-auth");
console.log("search:", textOf(search).slice(0, 500));
// The Katun sandbox connector returns its search results in structuredContent.resultados.
const items = search?.structuredContent?.resultados ?? search?.structuredContent?.productos ?? search?.structuredContent?.items ?? [];
const sku = opt("--sku") ?? items[0]?.sku;
if (!sku) {
  console.error("no product found and no --sku given; stop");
  process.exit(1);
}

const availability = await rpc("tools/call", { name: "disponibilidad", arguments: { sku, cantidad: QUANTITY, idioma: LANG } }, "agent-browser-auth");
console.log("availability:", textOf(availability).slice(0, 300));

const order = await rpc("tools/call", { name: "crear_pedido", arguments: { items: [{ sku, cantidad: QUANTITY }], comprador: "tap-demo-agent", idioma: LANG } }, "agent-payer-auth");
console.log("order:", textOf(order).slice(0, 800));
const o = order?.structuredContent ?? {};
if (o.pedido_id) console.log(JSON.stringify({ pedido_id: o.pedido_id, estado: o.estado, total: o.total, requiere_aprobacion: o.requiere_aprobacion, enlace_pago: o.enlace_pago }, null, 2));

if (REPLAY) {
  const res = await fetch(MCP, { method: "POST", headers: sessionRequest.headers, body: sessionRequest.body });
  const text = await res.text();
  console.log(`replay of the signed session request (same signature, same nonce): HTTP ${res.status}`);
  console.log(text.slice(0, 300));
  if (res.status !== 401) {
    console.error("expected 401 for a replayed nonce");
    process.exit(1);
  }
}
