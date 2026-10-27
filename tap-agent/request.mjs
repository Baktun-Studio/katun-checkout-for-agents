#!/usr/bin/env node
// Sends one HTTP request to the Katun sandbox, signed with the agent's TAP signature (or unsigned with --unsigned), and prints
// the status, the identity-related response headers and the body. For trying the merchant's answer by hand.
//
//   node tap-agent/request.mjs --url https://sandbox.katunpay.com/t/{pub}/m/{store}/mcp --tag agent-payer-auth --method POST --body '{...}'
//   node tap-agent/request.mjs --url ... --unsigned
//   node tap-agent/request.mjs --url ... --signature-agent https://baktun-studio.github.io/katun-checkout-for-agents/tap-agent/keys/jwks.json
import { readFileSync } from "node:fs";
import { loadAgentKeys, signRequest } from "./sign.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const url = opt("--url");
if (!url || !url.startsWith("https://")) {
  console.error("--url https://... is required");
  process.exit(2);
}
const method = opt("--method", "GET").toUpperCase();
const tag = opt("--tag", "agent-browser-auth");
let body = opt("--body", undefined);
if (body && body.startsWith("@")) body = readFileSync(body.slice(1), "utf8");
const unsigned = args.includes("--unsigned");
const signatureAgent = opt("--signature-agent", undefined);

const headers = { accept: "application/json, text/event-stream" };
if (body) headers["content-type"] = "application/json";
if (!unsigned) {
  const { privateKeyPem, keyid } = loadAgentKeys();
  Object.assign(headers, signRequest({ method, url, keyid, privateKeyPem, tag, signatureAgent }).headers);
}

const res = await fetch(url, { method, headers, body });
console.log(`${res.status} ${res.statusText}`);
for (const h of ["www-authenticate", "mcp-session-id", "content-type", "x-katun-agent", "server-timing"]) {
  const v = res.headers.get(h);
  if (v) console.log(`${h}: ${v}`);
}
console.log(await res.text());
