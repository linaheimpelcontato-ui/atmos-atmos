-- Clicksign document key link for exact webhook matching (security batch, 2026-09-12).
-- SQL NOT EXECUTED. Reserved timestamp, coordinated in advance to avoid
-- collision with concurrent work on this branch — does not touch any
-- existing table/column/policy/function owned by other migrations.
BEGIN;

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS clicksign_document_key text,
  ADD COLUMN IF NOT EXISTS clicksign_request_signature_key text;

-- Partial unique indexes (NULL rows excluded): each real Clicksign
-- identifier must map to at most one proposal, without forcing every
-- proposal (most of which never had a contract) to have a value.
CREATE UNIQUE INDEX IF NOT EXISTS proposals_clicksign_document_key_idx
  ON public.proposals (clicksign_document_key)
  WHERE clicksign_document_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS proposals_clicksign_request_signature_key_idx
  ON public.proposals (clicksign_request_signature_key)
  WHERE clicksign_request_signature_key IS NOT NULL;

COMMENT ON COLUMN public.proposals.clicksign_document_key IS
  'Exact Clicksign document.key captured at creation time by clicksign-create-document. Used by clicksign-webhook for exact-match lookup — replaces the previous substring search over contract_url, which could not reliably match anything. No backfill: proposals with a contract created before this migration keep this column null and are matched by the legacy contract_url = ''clicksign:<request_signature_key>'' exact-equality fallback instead.';

COMMENT ON COLUMN public.proposals.clicksign_request_signature_key IS
  'Exact Clicksign list.request_signature_key captured at creation time, duplicated out of the contract_url text into its own indexed column for exact-match lookup.';

COMMIT;
