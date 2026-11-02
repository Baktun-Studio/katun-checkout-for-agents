# Trusted Agent Protocol: what we verified, and when

Read on 26 October 2026 (US Central time) from the public merchant specification at
`https://developer.visa.com/docs/trusted-agent-protocol/trusted-agent-protocol-specifications`, without a Visa Developer session,
and from `https://developer.visa.com/docs/trusted-agent-protocol/product-terms` and `https://github.com/visa/trusted-agent-protocol`.
Everything below is what those pages said that day. Where the page is silent or inconsistent, we say so and we say what this
repository's demonstration agent does.

## What the specification says

**Headers.** `Signature-Input` and `Signature`, as defined by RFC 9421 (HTTP Message Signatures). The samples use the label `sig2`.
`Signature` carries the signature as `sig2=:<base64>:`.

**Covered components.** `@authority` and `@path`. The prose says the signature covers "method, path, headers", but every sample
covers exactly `@authority` and `@path`.

**Signature parameters.** `created`, `expires`, `keyid`, `alg`, `tag` and `nonce`. The page says that if any of them is missing
"the message should be blocked".

**Tags.** `agent-browser-auth` for browsing interactions (product detail and availability) and `agent-payer-auth` for payment or
checkout interactions.

**Algorithm.** The message-signature sample uses `alg="Ed25519"`. The JSON containers (consumer recognition and payment) use
`PS256`; for ID tokens the page says "PS256 is preferred to RS256" and "None is not supported".

**Validity window.** `created` and `expires` "should not be more than 8 minutes apart".

**Replay.** The merchant may keep "a record of all nonces received in the last 8 minutes"; a nonce that matches a recorded one means
the message "should be blocked". The nonce is also described as a session identifier that the consumer and payment containers
echo.

**Key discovery.** The relying party selects the key by `keyid` (header) or `kid` (JSON) from a key set published at a "well-known
location". The page shows a `GET /keys` endpoint with a `keyID` parameter returning a JWK, with RSA fields (`n`, `e`) in the example.

**Sample `Signature-Input` (browsing):**

```
Signature-Input: sig2=("@authority" "@path");created=1735689600;keyid="poqkLGiymh_W0uP6PZFw-dvez3QJT5SolqXBCW38r0U";alg="Ed25519";expires=1735693200;nonce="...";tag="agent-browser-auth"
```

## What the specification does not say

- No `Signature-Agent` header or any header that names the agent or its key directory.
- No full URL or path for the key directory ("a well-known location", "a Visa hosted well-known URL", never spelled out).
- No complete list of allowed `alg` values for the message signature.
- No JWK example for an Ed25519 key (the only JWK example is RSA).
- No statement on whether the request body (for example through `Content-Digest`) is covered.
- No canonicalization rule for the JSON containers beyond "in the order received".
- No key rotation, expiry or revocation rules; no error response catalogue.

## Inconsistencies we found

- The sample has `created=1735689600` and `expires=1735693200`, a 60-minute window, against the stated 8-minute rule.
- `keyid` (headers) and `kid` (JSON) name the same thing.
- One validation line reads as if `created` must not be in the past; the usual check is that it must not be in the future.
- Reused nonces must be rejected, yet the nonce is also called a session identifier shared by several signatures.

## What the demonstration agent in this repository does

Written from the specification, not from Visa's sample code (the Product Terms do not allow modifying the sample code or the
specification, and the sample code's license points to Visa's terms rather than to an open-source license).

- Signs with Ed25519 (`alg="Ed25519"`), covering `@authority` and `@path`, with all six parameters present.
- Uses a window of at most 8 minutes between `created` and `expires` (the rule, not the sample). The default is 5 minutes.
- Generates a fresh random nonce (128 bits, base64url) for every request.
- Uses `tag="agent-browser-auth"` for search and product detail and `tag="agent-payer-auth"` for checkout.
- Publishes its public key as a JWKS (`kty: OKP`, `crv: Ed25519`, `x`, `kid`) in `tap-agent/keys/jwks.json`, meant to be served
  over HTTPS from this repository's GitHub Pages once the repository is public. The `kid` is the RFC 7638 JWK thumbprint of the
  key. This is our directory, not Visa's: as of 26 October 2026 there is no publicly reachable Visa key directory, no test agents
  with Visa-issued keys and no hosted TAP sandbox.
- Does not send a `Signature-Agent` header by default (the specification does not define one). An option adds it for merchants
  that resolve directories that way.

## Wording

The sentence we use in any public text about this demonstration: "agent identity verified with Visa's Trusted Agent Protocol
signatures (RFC 9421), tested against our own TAP-conformant agent". Nothing in this repository claims a review, a certification
or a program membership from Visa.
