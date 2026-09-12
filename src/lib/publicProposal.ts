/**
 * Shape returned by the `get_public_proposal` RPC (see
 * supabase/migrations/20260911120000_public_proposal_privacy.sql). This is
 * the ONLY path ProposalPublic.tsx uses to read a proposal by share token or
 * slug — never a direct `.from("proposals")` select — so this is also the
 * full list of fields the public/client-facing proposal page can ever see.
 */
export type PublicProposalDayItem = {
  id?: string;
  day_number: number;
  day_label: string | null;
  category: string;
  item_name: string | null;
  /** Only present when show_price_breakdown is on (or caller is admin); null otherwise. */
  value: number | null;
  value_text: string | null;
  description: string | null;
  catalog_item_id: string | null;
  quantity: number;
  vehicle_type: string | null;
  start_time: string | null;
  end_time: string | null;
  item_index: number;
};

export type PublicProposalDay = {
  day_number: number;
  description: string | null;
  observation: string | null;
};

export type PublicProposalAccommodation = {
  id: string;
  product_id: string;
  checkin_date: string | null;
  checkout_date: string | null;
  num_nights: number;
  notes: string | null;
  is_selected: boolean;
};

export type PublicProposal = {
  id: string;
  title: string;
  status: string;
  notes: string | null;
  num_people: number;
  num_days: number;
  start_date: string | null;
  end_date: string | null;
  subtotal: number;
  discount_percent: number;
  discount_fixed: number;
  tax_percent: number;
  total: number;
  valid_until: string | null;
  language: string;
  published_at: string | null;
  share_token: string | null;
  contract_url: string | null;
  payment_terms: { installments: { label: string; percent: number; due_rule: string }[] } | null;
  show_price_breakdown: boolean;
  /** price_per_person_day is only present when show_price_breakdown is on (or caller is admin). */
  atmos_service: { price_per_person_day: number | null; description: string; num_courtesies?: number } | null;
  prospects: { name: string } | null;
  proposal_days: PublicProposalDay[];
  proposal_day_items: PublicProposalDayItem[];
  proposal_accommodations: PublicProposalAccommodation[];
  // Public aggregates: always present regardless of show_price_breakdown.
  // items_subtotal/items_discount_amount are GROUP-level and items-only (do
  // NOT include atmos_service/accommodation revenue -- do not divide these
  // by num_people and present the result as a per-person price). The one
  // unambiguous per-person figure is net_per_person, derived from the fully
  // authoritative persisted `total`. None of this re-derives the admin-side
  // pricing pipeline (owned by ProposalFormDialog/financeCalcs).
  num_paying: number;
  num_courtesies: number;
  items_subtotal: number;
  items_discount_amount: number;
  /** Null (never a fabricated 0) when there's no valid paying headcount -- render as unavailable, not free. */
  net_per_person: number | null;
};

/**
 * Normalizes the jsonb payload from `get_public_proposal` into a
 * `PublicProposal`. Returns null for anything that isn't a valid proposal
 * object (RPC returns SQL NULL for "not found" and "not published, caller
 * isn't admin" alike, on purpose — the public page shouldn't be able to
 * distinguish an invalid token from an unpublished one).
 */
export function parsePublicProposal(raw: unknown): PublicProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;
  if (!r.id) return null;

  return {
    id: r.id,
    title: r.title ?? "",
    status: r.status ?? "draft",
    notes: r.notes ?? null,
    num_people: r.num_people ?? 1,
    num_days: r.num_days ?? 1,
    start_date: r.start_date ?? null,
    end_date: r.end_date ?? null,
    subtotal: r.subtotal ?? 0,
    discount_percent: r.discount_percent ?? 0,
    discount_fixed: r.discount_fixed ?? 0,
    tax_percent: r.tax_percent ?? 0,
    total: r.total ?? 0,
    valid_until: r.valid_until ?? null,
    language: r.language ?? "pt",
    published_at: r.published_at ?? null,
    share_token: r.share_token ?? null,
    contract_url: r.contract_url ?? null,
    payment_terms: r.payment_terms ?? null,
    show_price_breakdown: !!r.show_price_breakdown,
    atmos_service: r.atmos_service ?? null,
    prospects: r.prospects ?? null,
    proposal_days: Array.isArray(r.proposal_days) ? r.proposal_days : [],
    proposal_day_items: Array.isArray(r.proposal_day_items) ? r.proposal_day_items : [],
    proposal_accommodations: Array.isArray(r.proposal_accommodations) ? r.proposal_accommodations : [],
    num_paying: r.num_paying ?? 1,
    num_courtesies: r.num_courtesies ?? 0,
    items_subtotal: r.items_subtotal ?? 0,
    items_discount_amount: r.items_discount_amount ?? 0,
    // Distinguish "RPC didn't send this field" (undefined -> default 0,
    // defensive) from an explicit null ("no valid paying headcount" -- must
    // stay null, not collapse into a fabricated free price).
    net_per_person: r.net_per_person === undefined ? 0 : r.net_per_person,
  };
}

/** Whether the itemized per-line price breakdown may be shown. Hidden from
 * clients by default; admins always see it (they need it to review pricing
 * before publishing), everyone else only when staff flips show_price_breakdown on. */
export function canShowPriceBreakdown(proposal: Pick<PublicProposal, "show_price_breakdown">, isAdmin: boolean): boolean {
  return isAdmin || !!proposal.show_price_breakdown;
}
