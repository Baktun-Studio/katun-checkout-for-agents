#!/usr/bin/env node
// RFC 9421 HTTP Message Signatures, Ed25519, with the parameters and tags of Visa's Trusted Agent Protocol as read from the
// public merchant specification on 2026-10-26 (see docs/tap-notes.md). No dependencies.
//
//   Signature-Input: sig2=("@authority" "@path");created=...;keyid="...";alg="Ed25519";expires=...;nonce="...";tag="agent-payer-auth"
//   Signature:       sig2=:<base64 of the Ed25519 signature over the signature base>:
//
// The signature base (RFC 9421, section 2.5) is one line per covered component plus the "@signature-params" line:
//   "@authority": sandbox.example
//   "@path": /t/pub/m/store/mcp
//   "@signature-params": ("@authority" "@path");created=...;keyid="...";alg="Ed25519";expires=...;nonce="...";tag="..."
import { createPrivateKey, createPublicKey, randomBytes, sign as edSign, verify as edVerify } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const TAGS = ["agent-browser-auth", "agent-payer-auth"];
export const MAX_WINDOW_SECONDS = 8 * 60; // the specification's rule; its sample (60 minutes) is not followed
const LABEL = "sig2";

function componentValue(name, url) {
  const u = new URL(url);
  if (name === "@authority") return u.host.toLowerCase();
  if (name === "@path") return u.pathname;
  throw new Error(`unsupported component ${name}`);
}

export function signatureParams({ components, created, expires, keyid, alg, nonce, tag }) {
  const list = components.map((c) => `"${c}"`).join(" ");
  return `(${list});created=${created};keyid="${keyid}";alg="${alg}";expires=${expires};nonce="${nonce}";tag="${tag}"`;
}

export function signatureBase(url, params) {
  const lines = params.components.map((c) => `"${c}": ${componentValue(c, url)}`);
  lines.push(`"@signature-params": ${signatureParams(params)}`);
  return lines.join("\n");
}

/**
 * Returns the headers to add to the request. `ttlSeconds` defaults to 5 minutes and is capped at 8.
 * `signatureAgent` (optional) adds a Signature-Agent header with the directory URL, for merchants that resolve keys that way;
 * TAP itself does not define that header.
 */
export function signRequest({ method = "GET", url, keyid, privateKeyPem, tag = "agent-browser-auth", ttlSeconds = 300, nonce, signatureAgent, now = () => Math.floor(Date.now() / 1000) }) {
  if (!TAGS.includes(tag)) throw new Error(`tag must be one of ${TAGS.join(", ")}`);
  if (ttlSeconds <= 0 || ttlSeconds > MAX_WINDOW_SECONDS) throw new Error(`ttlSeconds must be between 1 and ${MAX_WINDOW_SECONDS}`);
  const created = now();
  const params = {
    components: ["@authority", "@path"],
    created,
    expires: created + ttlSeconds,
    keyid,
    alg: "Ed25519",
    nonce: nonce ?? randomBytes(16).toString("base64url"),
    tag,
  };
  const base = signatureBase(url, params);
  const sig = edSign(null, Buffer.from(base, "utf8"), createPrivateKey(privateKeyPem));
  const headers = {
    "Signature-Input": `${LABEL}=${signatureParams(params)}`,
    Signature: `${LABEL}=:${sig.toString("base64")}:`,
  };
  if (signatureAgent) headers["Signature-Agent"] = `"${signatureAgent}"`;
  void method; // the covered components do not include @method; kept in the input for callers that log it
  return { headers, params, base };
}

/** Local self-check: parses the two headers back and verifies against a JWK (kty OKP, crv Ed25519, x). */
export function verifyRequest({ url, headers, jwk, now = () => Math.floor(Date.now() / 1000) }) {
  const input = headers["Signature-Input"] ?? headers["signature-input"];
  const signature = headers["Signature"] ?? headers["signature"];
  const m = /^([A-Za-z][A-Za-z0-9_-]*)=\((.*?)\)((?:;[^;]+)*)$/.exec(input.trim());
  if (!m) return { ok: false, reason: "Signature-Input malformed" };
  const components = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  const raw = Object.fromEntries(m[3].split(";").slice(1).map((p) => {
    const i = p.indexOf("=");
    return [p.slice(0, i), p.slice(i + 1).replace(/^"|"$/g, "")];
  }));
  for (const k of ["created", "expires", "keyid", "alg", "tag", "nonce"]) if (!(k in raw)) return { ok: false, reason: `missing parameter ${k}` };
  const created = Number(raw.created);
  const expires = Number(raw.expires);
  if (raw.alg.toLowerCase() !== "ed25519") return { ok: false, reason: `unsupported alg ${raw.alg}` };
  if (!TAGS.includes(raw.tag)) return { ok: false, reason: `unknown tag ${raw.tag}` };
  if (expires - created > MAX_WINDOW_SECONDS) return { ok: false, reason: "window longer than 8 minutes" };
  const t = now();
  if (created > t + 300) return { ok: false, reason: "created in the future" };
  if (expires < t - 300) return { ok: false, reason: "expired" };
  if (!components.includes("@authority") || !components.includes("@path")) return { ok: false, reason: "must cover @authority and @path" };
  if (raw.keyid !== jwk.kid) return { ok: false, reason: "keyid does not match the key" };
  const params = { components, created, expires, keyid: raw.keyid, alg: raw.alg, nonce: raw.nonce, tag: raw.tag };
  const base = signatureBase(url, params);
  const sm = new RegExp(`^${m[1]}=:([A-Za-z0-9+/=]+):$`).exec(signature.trim());
  if (!sm) return { ok: false, reason: "Signature malformed" };
  const pub = createPublicKey({ key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x }, format: "jwk" });
  const ok = edVerify(null, Buffer.from(base, "utf8"), pub, Buffer.from(sm[1], "base64"));
  return ok ? { ok: true, params } : { ok: false, reason: "signature does not verify" };
}

/** Loads the agent's key material from tap-agent/keys: the private key and the JWKS keygen.mjs wrote next to it
 *  (tap-agent/keys/private/jwks.json), or the tracked tap-agent/keys/jwks.json when there is no JWKS next to the key. */
export function loadAgentKeys() {
  const here = dirname(fileURLToPath(import.meta.url));
  const privatePath = join(here, "keys", "private", "agent.pem");
  const ownJwksPath = join(here, "keys", "private", "jwks.json");
  if (!existsSync(privatePath)) {
    console.error(`no private key at ${privatePath}: run "node tap-agent/keygen.mjs" first (it writes your own key pair; the`);
    console.error("demonstration agent's private key is not in this repository)");
    process.exit(2);
  }
  const privateKeyPem = readFileSync(privatePath, "utf8");
  const jwksPath = existsSync(ownJwksPath) ? ownJwksPath : join(here, "keys", "jwks.json");
  const jwks = JSON.parse(readFileSync(jwksPath, "utf8"));
  const jwk = jwks.keys[0];
  return { privateKeyPem, jwk, keyid: jwk.kid };
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes("--self-test")) {
  // Uses your key when keygen.mjs has written one; otherwise a throwaway key made in memory, so the test runs on a fresh clone.
  const here = dirname(fileURLToPath(import.meta.url));
  let privateKeyPem, jwk, keyid;
  if (existsSync(join(here, "keys", "private", "agent.pem"))) {
    ({ privateKeyPem, jwk, keyid } = loadAgentKeys());
  } else {
    const { generateKeyPairSync } = await import("node:crypto");
    const pair = generateKeyPairSync("ed25519");
    privateKeyPem = pair.privateKey.export({ type: "pkcs8", format: "pem" });
    jwk = { ...pair.publicKey.export({ format: "jwk" }), kid: "self-test" };
    keyid = "self-test";
    console.log("no key of yours yet: testing with a throwaway key made in memory");
  }
  const url = "https://sandbox.katunpay.com/t/demo/m/store/mcp";
  const signed = signRequest({ method: "POST", url, keyid, privateKeyPem, tag: "agent-payer-auth" });
  console.log(signed.headers["Signature-Input"]);
  console.log(signed.headers["Signature"]);
  const good = verifyRequest({ url, headers: signed.headers, jwk });
  const otherHost = verifyRequest({ url: "https://other.example/t/demo/m/store/mcp", headers: signed.headers, jwk });
  console.log("verifies on the right host:", good.ok, good.reason ?? "");
  console.log("rejected on another host:", !otherHost.ok, otherHost.reason ?? "");
  process.exit(good.ok && !otherHost.ok ? 0 : 1);
}
