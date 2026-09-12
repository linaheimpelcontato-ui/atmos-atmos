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

export type PublicProposalDayTotal = {
  day_number: number;
  total_per_person: number;
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
  // Public aggregates: always present regardless of show_price_breakdown --
  // these are "what the customer pays", not a line-item cost/margin breakdown.
  num_paying: number;
  num_courtesies: number;
  subtotal_per_person: number;
  discount_amount_per_person: number;
  net_per_person: number;
  day_totals: PublicProposalDayTotal[];
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
    subtotal_per_person: r.subtotal_per_person ?? 0,
    discount_amount_per_person: r.discount_amount_per_person ?? 0,
    net_per_person: r.net_per_person ?? 0,
    day_totals: Array.isArray(r.day_totals) ? r.day_totals : [],
  };
}

/** Looks up the precomputed per-day rolled-up total for a given day number. */
export function findDayTotal(proposal: Pick<PublicProposal, "day_totals">, dayNumber: number): number {
  return proposal.day_totals.find((d) => d.day_number === dayNumber)?.total_per_person ?? 0;
}

/** Whether the itemized per-line price breakdown may be shown. Hidden from
 * clients by default; admins always see it (they need it to review pricing
 * before publishing), everyone else only when staff flips show_price_breakdown on. */
export function canShowPriceBreakdown(proposal: Pick<PublicProposal, "show_price_breakdown">, isAdmin: boolean): boolean {
  return isAdmin || !!proposal.show_price_breakdown;
}
