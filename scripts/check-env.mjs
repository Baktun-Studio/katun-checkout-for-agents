#!/usr/bin/env node
// Checks what the reproduction needs: Node 22 or newer, curl, and the Katun sandbox reachable (docs and public keys).
import { execSync } from "node:child_process";

const BASE = process.argv[2] ?? "https://sandbox.katunpay.com";
let ok = true;
const say = (good, text) => {
  ok = ok && good;
  console.log(`${good ? "ok " : "NO "} ${text}`);
};

const major = Number(process.versions.node.split(".")[0]);
say(major >= 22, `node ${process.versions.node} (22 or newer required)`);
try {
  execSync("curl --version", { stdio: "ignore" });
  say(true, "curl present");
} catch {
  say(false, "curl missing");
}
for (const path of ["/docs?lang=en", "/keys/", "/keys/katun-verify.mjs"]) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    say(res.ok, `${BASE}${path} -> ${res.status}`);
  } catch (err) {
    say(false, `${BASE}${path} -> ${err instanceof Error ? err.message : String(err)}`);
  }
}
process.exit(ok ? 0 : 1);
