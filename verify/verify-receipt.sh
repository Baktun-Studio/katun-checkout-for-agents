#!/usr/bin/env bash
# Verifies a Katun sandbox receipt offline: downloads the public keys, the single-file verifier and the signed record, then runs
# the verifier with no network. Commands as published in https://sandbox.katunpay.com/docs/comprobantes?lang=en (read 2026-10-26).
#
#   bash verify/verify-receipt.sh <publisher> <order-id> [base-url]
#
# Exit code is the verifier's. Output starts with VALID when the signature matches the record and a published key; a sandbox
# record also prints "Test record: no money moved". Nothing here talks to Katun after the downloads.
set -euo pipefail

PUB="${1:-}"; ORDER="${2:-}"; BASE="${3:-https://sandbox.katunpay.com}"
if [ -z "$PUB" ] || [ -z "$ORDER" ]; then
  echo "usage: bash verify/verify-receipt.sh <publisher> <order-id> [base-url]" >&2
  exit 2
fi
case "$BASE" in https://*) ;; *) echo "base-url must be https" >&2; exit 2 ;; esac
command -v node >/dev/null || { echo "node is required" >&2; exit 2; }
command -v curl >/dev/null || { echo "curl is required" >&2; exit 2; }

OUT="$(dirname "$0")/out/$ORDER"
mkdir -p "$OUT/keys"
echo "downloading keys, verifier and record from $BASE"
curl -fsS "$BASE/keys/" -o "$OUT/keys/indice.json"
# Every public key the index lists, so the verifier can pick the one named by the record's kid.
node -e '
const idx = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const files = new Set();
for (const k of (idx.llaves ?? idx.keys ?? [])) if (k.archivo) files.add(k.archivo); else if (k.file) files.add(k.file);
if (files.size === 0) { files.add("katun-evidence-v1.pub"); files.add("katun-evidence-prueba-v1.pub"); }
process.stdout.write([...files].join("\n"));
' "$OUT/keys/indice.json" | while read -r f; do
  [ -n "$f" ] && curl -fsS "$BASE/keys/$f" -o "$OUT/keys/$f"
done
curl -fsS "$BASE/keys/katun-verify.mjs" -o "$OUT/katun-verify.mjs"
curl -fsS "$BASE/t/$PUB/evidence/$ORDER" -o "$OUT/registro.json"
echo "verifier sha256: $(shasum -a 256 "$OUT/katun-verify.mjs" | awk '{print $1}')"
echo
echo "verifying offline"
node "$OUT/katun-verify.mjs" "$OUT/registro.json" --keys-dir "$OUT/keys" --lang en
