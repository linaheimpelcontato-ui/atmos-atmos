// Pure helpers for verifying inbound webhook authenticity. Only standard
// Web Crypto (`crypto.subtle`) is used — no Deno- or Node-specific API — so
// this module runs unchanged under Deno (edge functions) and under Node
// (Vitest), which is what makes it independently unit-testable.

/**
 * Constant-time string comparison. Requires equal length up front (same
 * trade-off as Node's `crypto.timingSafeEqual`, which throws on length
 * mismatch): comparing lengths first leaks length, not content, and is the
 * accepted practice for this kind of secret comparison.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface VerifyResult {
  ok: boolean;
  reason?:
    | "secret_not_configured"
    | "header_missing"
    | "header_malformed"
    | "signature_mismatch"
    | "secret_mismatch";
}

/**
 * Verifies Clicksign's `Content-Hmac: sha256=<hex>` header exactly as
 * documented at developers.clicksign.com/docs/seguranca-de-webhooks:
 * "a cada disparo de webhook, a Clicksign calcula o Hash SHA256 [HMAC,
 * conforme os links de implementação da própria página: PHP hash_hmac,
 * Node crypto.Hmac, Ruby OpenSSL::HMAC] do Body da requisição com o Secret
 * e adiciona essa informação ao cabeçalho" — computed over the RAW,
 * unmodified request body (the docs explicitly warn: "não formate o JSON
 * antes do cálculo").
 */
export async function verifyClicksignContentHmac(
  headerValue: string | null,
  secret: string | undefined,
  rawBody: string,
): Promise<VerifyResult> {
  if (!secret) return { ok: false, reason: "secret_not_configured" };
  if (!headerValue) return { ok: false, reason: "header_missing" };

  const match = /^sha256=([0-9a-f]+)$/i.exec(headerValue.trim());
  if (!match) return { ok: false, reason: "header_malformed" };

  const provided = match[1].toLowerCase();
  const expected = await hmacSha256Hex(secret, rawBody);

  if (!timingSafeEqualString(expected, provided)) {
    return { ok: false, reason: "signature_mismatch" };
  }
  return { ok: true };
}

/**
 * Verifies a plain shared-secret header (`x-webhook-secret`), fail-closed:
 * rejects when the secret isn't configured, the header is absent, or the
 * values don't match exactly. ManyChat's "External Request" action has no
 * documented request-signing/HMAC mechanism for outbound calls (confirmed
 * against ManyChat's own developer/help docs) — an exact, fail-closed
 * shared-secret comparison is the strongest verification available for
 * that provider, not a stand-in for a stronger scheme we chose not to use.
 */
export function verifySharedSecretHeader(
  headerValue: string | null,
  secret: string | undefined,
): VerifyResult {
  if (!secret) return { ok: false, reason: "secret_not_configured" };
  if (!headerValue) return { ok: false, reason: "header_missing" };
  if (!timingSafeEqualString(headerValue, secret)) {
    return { ok: false, reason: "secret_mismatch" };
  }
  return { ok: true };
}
