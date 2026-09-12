import { describe, expect, it, vi } from "vitest";
import { fetchClicksignDocumentStatus } from "./clicksignVerify";

function mockFetch(status: number, jsonBody?: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => jsonBody,
  })) as unknown as typeof fetch;
}

describe("fetchClicksignDocumentStatus", () => {
  it("reports verified=true only when status is closed AND finished_at is present", async () => {
    const fetchImpl = mockFetch(200, {
      document: { status: "closed", finished_at: "2026-09-12T10:00:00Z" },
    });
    const result = await fetchClicksignDocumentStatus("https://app.clicksign.com", "doc-1", "token", fetchImpl);
    expect(result).toEqual({ verified: true, status: "closed", finishedAt: "2026-09-12T10:00:00Z" });
  });

  it("does not verify a document that is still running, even if the webhook claimed it closed", async () => {
    const fetchImpl = mockFetch(200, {
      document: { status: "running", finished_at: null },
    });
    const result = await fetchClicksignDocumentStatus("https://app.clicksign.com", "doc-1", "token", fetchImpl);
    expect(result.verified).toBe(false);
    expect(result.status).toBe("running");
  });

  it("does not verify when status is closed but finished_at is missing (inconsistent response)", async () => {
    const fetchImpl = mockFetch(200, {
      document: { status: "closed", finished_at: null },
    });
    const result = await fetchClicksignDocumentStatus("https://app.clicksign.com", "doc-1", "token", fetchImpl);
    expect(result.verified).toBe(false);
  });

  it("does not verify on an HTTP error from Clicksign (e.g. wrong/expired credential, document not found)", async () => {
    const fetchImpl = mockFetch(404);
    const result = await fetchClicksignDocumentStatus("https://app.clicksign.com", "doc-missing", "token", fetchImpl);
    expect(result).toEqual({ verified: false, error: "http_404" });
  });

  it("does not verify and reports the error on a network failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const result = await fetchClicksignDocumentStatus("https://app.clicksign.com", "doc-1", "token", fetchImpl);
    expect(result).toEqual({ verified: false, error: "network down" });
  });

  it("URL-encodes the document key and access token, and never sends them anywhere but the sandbox/prod base passed in", async () => {
    const fetchImpl = mockFetch(200, { document: { status: "closed", finished_at: "x" } });
    await fetchClicksignDocumentStatus("https://sandbox.clicksign.com", "doc key/with spaces", "tok en", fetchImpl);
    const calledUrl = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl.startsWith("https://sandbox.clicksign.com/api/v1/documents/")).toBe(true);
    expect(calledUrl).toContain(encodeURIComponent("doc key/with spaces"));
    expect(calledUrl).toContain(encodeURIComponent("tok en"));
  });
});
