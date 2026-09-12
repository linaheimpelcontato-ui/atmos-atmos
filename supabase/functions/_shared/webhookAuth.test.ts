import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  timingSafeEqualString,
  verifyClicksignContentHmac,
  verifySharedSecretHeader,
} from "./webhookAuth";

function realClicksignHeader(secret: string, body: string): string {
  // Independent reference implementation (Node's own HMAC), deliberately
  // not reusing the module under test, so a bug shared by both wouldn't be
  // masked.
  const hex = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hex}`;
}

describe("timingSafeEqualString", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqualString("abc123", "abc123")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(timingSafeEqualString("abc123", "abc124")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(timingSafeEqualString("short", "muchlonger")).toBe(false);
  });
});

describe("verifyClicksignContentHmac", () => {
  const secret = "test-clicksign-webhook-secret";
  const body = JSON.stringify({ event: { name: "closed" }, document: { key: "doc-123" } });

  it("accepts a correctly computed Content-Hmac header", async () => {
    const header = realClicksignHeader(secret, body);
    const result = await verifyClicksignContentHmac(header, secret, body);
    expect(result).toEqual({ ok: true });
  });

  it("rejects when the header is missing (fail-closed, no silent bypass)", async () => {
    const result = await verifyClicksignContentHmac(null, secret, body);
    expect(result).toEqual({ ok: false, reason: "header_missing" });
  });

  it("rejects when the secret is not configured, even if a header is present", async () => {
    const header = realClicksignHeader("some-secret", body);
    const result = await verifyClicksignContentHmac(header, undefined, body);
    expect(result).toEqual({ ok: false, reason: "secret_not_configured" });
  });

  it("rejects a malformed header", async () => {
    const result = await verifyClicksignContentHmac("not-a-valid-header", secret, body);
    expect(result).toEqual({ ok: false, reason: "header_malformed" });
  });

  it("rejects when the digest does not match (wrong secret)", async () => {
    const header = realClicksignHeader("wrong-secret", body);
    const result = await verifyClicksignContentHmac(header, secret, body);
    expect(result).toEqual({ ok: false, reason: "signature_mismatch" });
  });

  it("rejects when the body was tampered with after signing", async () => {
    const header = realClicksignHeader(secret, body);
    const tamperedBody = JSON.stringify({ event: { name: "closed" }, document: { key: "doc-999" } });
    const result = await verifyClicksignContentHmac(header, secret, tamperedBody);
    expect(result).toEqual({ ok: false, reason: "signature_mismatch" });
  });
});

describe("verifySharedSecretHeader", () => {
  it("accepts an exact match", () => {
    expect(verifySharedSecretHeader("my-secret", "my-secret")).toEqual({ ok: true });
  });

  it("rejects a missing header even when a secret is configured (fail-closed)", () => {
    expect(verifySharedSecretHeader(null, "my-secret")).toEqual({
      ok: false,
      reason: "header_missing",
    });
  });

  it("rejects when the secret is not configured", () => {
    expect(verifySharedSecretHeader("anything", undefined)).toEqual({
      ok: false,
      reason: "secret_not_configured",
    });
  });

  it("rejects a mismatched header", () => {
    expect(verifySharedSecretHeader("wrong", "my-secret")).toEqual({
      ok: false,
      reason: "secret_mismatch",
    });
  });
});
