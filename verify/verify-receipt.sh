#!/usr/bin/env bash
# Verifies a Katun sandbox receipt offline: downloads the public keys, the single-file verifier and the signed record, then runs
# the verifier with no network. Commands as published in https://sandbox.katunpay.com/docs/comprobantes?lang=en (read 2026-10-26).
#
#   bash verify/verify-receipt.sh <institution-id> <order-number> [base-url]
#
# <institution-id> is the identifier in the network connector address (https://sandbox.katunpay.com/t/{institution-id}/mcp);
# for the demonstration store it is sbx-tvzsuq4hi6. Only a paid order has a signed record.
#
# Exit code is the verifier's. Output starts with VALID when the signature matches the record and a published key; a sandbox
# record also prints "Test record: no money moved". Nothing here talks to Katun after the downloads.
set -euo pipefail

PUB="${1:-}"; ORDER="${2:-}"; BASE="${3:-https://sandbox.katunpay.com}"
if [ -z "$PUB" ] || [ -z "$ORDER" ]; then
  echo "usage: bash verify/verify-receipt.sh <institution-id> <order-number> [base-url]" >&2
  exit 2
fi
case "$BASE" in https://*) ;; *) echo "base-url must be https" >&2; exit 2 ;; esac
command -v node >/dev/null || { echo "node is required" >&2; exit 2; }
command -v curl >/dev/null || { echo "curl is required" >&2; exit 2; }

OUT="$(dirname "$0")/out/$ORDER"
mkdir -p "$OUT/keys"
echo "downloading keys, verifier and record from $BASE"
fetch() {
  # curl with a readable message instead of a bare exit code when the server answers with an error
  local code
  code="$(curl -sS -o "$2" -w '%{http_code}' "$1")" || { echo "could not download $1" >&2; exit 3; }
  if [ "$code" != "200" ]; then
    rm -f "$2"
    echo "$1 answered HTTP $code. $3" >&2
    exit 3
  fi
}
fetch "$BASE/keys/" "$OUT/keys/index.json" "The key index should always be there; check the base URL."
# Every public key the index lists, so the verifier can pick the one named by the record's kid. The index is the sandbox's
# own format (its fields are named llaves and archivo).
node -e '
const idx = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const files = new Set();
for (const k of (idx.llaves ?? idx.keys ?? [])) if (k.archivo) files.add(k.archivo); else if (k.file) files.add(k.file);
if (files.size === 0) { files.add("katun-evidence-v1.pub"); files.add("katun-evidence-prueba-v1.pub"); }
process.stdout.write([...files].join("\n") + "\n");
' "$OUT/keys/index.json" | while read -r f || [ -n "$f" ]; do
  [ -n "$f" ] && fetch "$BASE/keys/$f" "$OUT/keys/$f" "A key listed in the index is missing."
done
fetch "$BASE/keys/katun-verify.mjs" "$OUT/katun-verify.mjs" "The verifier should always be there; check the base URL."
fetch "$BASE/t/$PUB/evidence/$ORDER" "$OUT/record.json" "No signed record for that order: check the institution id and the order number, and that the order is paid."
echo "verifier sha256: $(shasum -a 256 "$OUT/katun-verify.mjs" | awk '{print $1}')"
echo
echo "verifying offline"
node "$OUT/katun-verify.mjs" "$OUT/record.json" --keys-dir "$OUT/keys" --lang en
