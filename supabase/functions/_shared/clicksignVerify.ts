// Server-side confirmation of a Clicksign document's real status, used so
// the webhook never marks a contract as signed based solely on the event
// payload it received — it must also confirm against Clicksign's own API.
//
// Endpoint and field names are exactly as documented at
// developers.clicksign.com/v1.0/docs/visualizar-documento:
//   GET /api/v1/documents/:key?access_token=...
//   response.document.status === "closed" (other values: "running", "canceled")
//   response.document.finished_at: timestamp, null while incomplete

export interface ClicksignDocumentStatus {
  verified: boolean;
  status?: string;
  finishedAt?: string | null;
  error?: string;
}

export async function fetchClicksignDocumentStatus(
  apiBase: string,
  documentKey: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ClicksignDocumentStatus> {
  try {
    const url = `${apiBase}/api/v1/documents/${encodeURIComponent(documentKey)}?access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return { verified: false, error: `http_${res.status}` };
    }

    const data = await res.json();
    const status: string | undefined = data?.document?.status;
    const finishedAt: string | null = data?.document?.finished_at ?? null;

    return {
      verified: status === "closed" && Boolean(finishedAt),
      status,
      finishedAt,
    };
  } catch (err) {
    return {
      verified: false,
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }
}
