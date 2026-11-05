#!/usr/bin/env node
// Smoke test of a fresh clone: everything a reader can run without an account, against the public sandboxes.
//   node scripts/smoke-test.mjs
// Runs from the repository root. Writes only to verify/out/ (ignored by git) and regenerates the catalog, which must come out
// byte for byte identical. Places no order and moves no money. Exit code 0 when every check passes.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://sandbox.katunpay.com";
const INSTITUTION = "sbx-tvzsuq4hi6";
const STORE = "mer_caprock-trail-supply";
const CONNECTOR = `${BASE}/t/${INSTITUTION}/m/${STORE}/mcp`;
const AIRWALLEX_MCP = "https://mcp.sandbox.airwallex.com/pa/ai/01b57d8a-2213-4822-98df-be6e37fb465d/acp/mcp";
const SIGN_IN = `${BASE}/oauth/${INSTITUTION}/${STORE}`;
const JWKS_URL = "https://baktun-studio.github.io/katun-checkout-for-agents/tap-agent/keys/jwks.json";
const PAID_ORDER = "KP-TKKVD"; // the order above the limit in the video, approved by a named person and paid once

let failures = 0;
const say = (good, text) => {
  if (!good) failures++;
  console.log(`${good ? "ok " : "NO "} ${text}`);
};
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
async function step(name, fn) {
  try {
    await fn();
  } catch (err) {
    const detail = (err.stdout || "") + (err.stderr || "") || (err instanceof Error ? err.message : String(err));
    say(false, `${name}: ${detail.trim().split("\n").slice(-3).join(" | ")}`);
  }
}

await step("environment", async () => {
  run("node", ["scripts/check-env.mjs"]);
  say(true, "environment: node 22+, curl, sandbox docs and public keys (scripts/check-env.mjs)");
});

await step("TAP signature self-test", async () => {
  const out = run("node", ["tap-agent/sign.mjs", "--self-test"]);
  say(/verifies on the right host: true/.test(out) && /rejected on another host: true/.test(out),
    "TAP signature self-test: verifies on the right host, fails on another (tap-agent/sign.mjs --self-test)");
});

await step("catalog generator", async () => {
  run("node", ["catalog/generate-catalog.mjs"]);
  const changed = run("git", ["status", "--porcelain", "--", "catalog"]).trim();
  const rows = readFileSync(join(ROOT, "catalog", "products.csv"), "utf8").trim().split("\n").length - 1;
  say(changed === "" && rows === 100, `catalog generator: ${rows} products, identical to the repository${changed ? ` (changed: ${changed})` : ""}`);
});

await step("receipt verified offline", async () => {
  const out = run("bash", ["verify/verify-receipt.sh", INSTITUTION, PAID_ORDER]);
  say(/^VALID/m.test(out) && /no money moved/.test(out), `receipt ${PAID_ORDER} verified offline: VALID, test record`);
  const dir = join(ROOT, "verify", "out", PAID_ORDER);
  const record = readFileSync(join(dir, "record.json"), "utf8");
  writeFileSync(join(dir, "altered.json"), record.replace("USD", "USE"));
  let altered = "";
  try {
    altered = run("node", [join(dir, "katun-verify.mjs"), join(dir, "altered.json"), "--keys-dir", join(dir, "keys"), "--lang", "en"]);
  } catch (err) {
    altered = (err.stdout || "") + (err.stderr || "");
  }
  say(/INVALID/.test(altered), "the same receipt with one letter changed: INVALID");
});

async function mcp(url, body, session) {
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  if (session) headers["mcp-session-id"] = session;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  const json = text.trim().startsWith("{") ? JSON.parse(text)
    : JSON.parse(text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5)).pop() || "{}");
  return { res, json };
}

await step("store connector", async () => {
  const init = await mcp(CONNECTOR, { jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke-test", version: "1" } } });
  const session = init.res.headers.get("mcp-session-id") || undefined;
  say(init.res.ok && init.json.result, `store's Katun connector answers initialize (${init.res.status})`);
  if (session) await mcp(CONNECTOR, { jsonrpc: "2.0", method: "notifications/initialized" }, session);
  const list = await mcp(CONNECTOR, { jsonrpc: "2.0", id: 2, method: "tools/list" }, session);
  const tools = (list.json.result?.tools ?? []).map((t) => t.name);
  say(tools.length > 0, `store's Katun connector lists its tools: ${tools.join(", ") || "none"}`);
});

await step("Airwallex merchant MCP endpoint", async () => {
  const res = await fetch(AIRWALLEX_MCP, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke-test", version: "1" } } }) });
  say(res.status < 500, `Airwallex merchant MCP endpoint of the store is up (${res.status}; it asks for the store's sign-in)`);
});

await step("store sign-in server", async () => {
  const res = await fetch(`${SIGN_IN}/.well-known/oauth-authorization-server`);
  say(res.ok, `store's sign-in server publishes its metadata (${res.status})`);
});

await step("agent key directory", async () => {
  const res = await fetch(JWKS_URL);
  const remote = res.ok ? JSON.stringify(await res.json()) : "";
  const local = JSON.stringify(JSON.parse(readFileSync(join(ROOT, "tap-agent", "keys", "jwks.json"), "utf8")));
  say(res.ok && remote === local, `demonstration agent's key directory served over https and identical to tap-agent/keys/jwks.json (${res.status})`);
});

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
