#!/usr/bin/env node
// Generates the demonstration agent's Ed25519 key pair.
//   private key -> tap-agent/keys/private/agent.pem   (PKCS#8 PEM, mode 600, ignored by git)
//   public key  -> tap-agent/keys/jwks.json           (JWKS with kty OKP, crv Ed25519, x, kid = RFC 7638 thumbprint)
// Refuses to overwrite an existing private key unless --force is given. Never prints the private key.
import { createHash, generateKeyPairSync } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PRIVATE_DIR = join(HERE, "keys", "private");
const PRIVATE_PATH = join(PRIVATE_DIR, "agent.pem");
const JWKS_PATH = join(HERE, "keys", "jwks.json");
const force = process.argv.includes("--force");

if (existsSync(PRIVATE_PATH) && !force) {
  console.error(`a private key already exists at ${PRIVATE_PATH}; pass --force to replace it (the published kid will change)`);
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const jwk = publicKey.export({ format: "jwk" }); // { kty: "OKP", crv: "Ed25519", x }
// RFC 7638: SHA-256 over the JSON of the required members in lexicographic order, base64url.
const thumbprintInput = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x });
const kid = createHash("sha256").update(thumbprintInput).digest("base64url");

mkdirSync(PRIVATE_DIR, { recursive: true });
writeFileSync(PRIVATE_PATH, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
chmodSync(PRIVATE_PATH, 0o600);
writeFileSync(JWKS_PATH, JSON.stringify({ keys: [{ kty: jwk.kty, crv: jwk.crv, x: jwk.x, kid, use: "sig", alg: "Ed25519" }] }, null, 2) + "\n");

console.log(`private key written to ${PRIVATE_PATH} (not shown, not committed)`);
console.log(`public JWKS written to ${JWKS_PATH}`);
console.log(`kid: ${kid}`);
