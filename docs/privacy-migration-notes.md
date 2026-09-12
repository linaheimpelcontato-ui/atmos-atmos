# Public proposal privacy — delivery notes (codex/atmos-privacidade)

Versioned copy of the delivery/contract summary, since the Maestri note
("contrato-show-price-breakdow") wasn't reliably showing up cross-terminal.

## Commits
- `e291022` — initial RLS/RPC fix (get_public_proposal, submit_proposal_feedback, sellers/proposals/proposal_feedback policies).
- `d400be3` — second pass after external review: prospects CRM leak, false-success on write errors, JSON whitelist depth (payment_terms/atmos_service.description), stale-response races, expiry timezone, fabricated 0 price.
- (latest, this file) — item.id-keyed edit descriptions (position-based keys broke under the cloned-reorder from d400be3), extracted pure `buildProposalEditsPayload` helper + tests, isAdmin/edit-state reset on token change, test fixture fixes (prospects.segment NOT NULL, anon ACL-denial assertion for get_my_published_proposal_link).

## show_price_breakdown contract
- Column: `proposals.show_price_breakdown boolean NOT NULL DEFAULT false`.
- Semantics: `false` = itemized per-line breakdown hidden from the client (only totals shown); `true` = visible. Admins always see the full breakdown regardless of the saved value.
- Write path: any admin `UPDATE proposals SET show_price_breakdown = ...` under the existing "Admins full access proposals" policy (unchanged). A working toggle already lives directly in ProposalPublic.tsx's own admin bar (`toggleShowBreakdown`) — no change to ProposalFormDialog was needed for that.
- Read path: exclusively via `get_public_proposal`, which returns the **raw saved value** in the `show_price_breakdown` key (never OR'd with `is_admin_view` — that was a real bug caught in review: an earlier version made the toggle always display "on" for admins, hiding the true saved state). A separate internal `v_show_breakdown` (`is_admin OR show_price_breakdown`) decides what to actually include in that response (item value/value_text, atmos_service.price_per_person_day).
- Confirmed compatible with `save_proposal_bundle` (Executor's RPC): omitted preserves existing value on UPDATE / defaults false on CREATE; explicit true/false persists; null/non-boolean rejected.

## Public aggregates (always present, regardless of the toggle)
`num_paying`, `num_courtesies`, `items_subtotal`, `items_discount_amount`, `net_per_person`. These come from the two already-persisted, authoritative columns (`subtotal`, `total`) — the RPC does **not** re-derive the admin-side pricing pipeline (atmos/accommodation revenue, courtesy-adjusted allocation, guide proportional split), which is owned by ProposalFormDialog/financeCalcs and was actively changing in a parallel branch during this work. `items_subtotal`/`items_discount_amount` are group-level and items-only (exclude atmos/accommodation revenue) — labeled "Subtotal/Desconto dos itens (grupo)" in the UI, not presented as a per-person price. `net_per_person` is `null` (never a fabricated `0`) when there's no valid paying headcount (e.g. courtesies ≥ num_people); the UI shows "Indisponível" in that case. The per-day rolled-up total shown in the old page was removed rather than reimplemented with a guessed formula — it's only meaningful when the itemized breakdown itself is visible, and at that point the browser already has the raw item values to compute it from directly.

## Known, documented, not-yet-solved gaps
- Per-person apportionment across heterogeneous room/accommodation splits: `net_per_person` is `total / num_paying`, an **average**, not each guest's exact price when rooms cost differently. Labeled "Valor Médio por Pagante" precisely to avoid implying an exact figure.
- Submitting multiple feedback items (`submit_proposal_feedback`) is sequential; a failure after a partial success isn't idempotent on retry.
- `save_public_proposal_edits` (the atomic RPC `saveEdits` now calls) is implemented in a separate migration/worktree, not included here.
- `get_public_products` / `fetchPublicProducts` integration in ProposalPublic.tsx's product fetch uses a temporary `as any` cast pending that RPC landing in the shared types.

## Verification performed (no live database this session — Docker/disk unavailable)
- `npx tsc --noEmit -p tsconfig.app.json`: 20 errors, all pre-existing in files untouched by this work (same count before/after every round of changes).
- `npx vitest run` on the new/changed lib tests: all passing (`publicProposal.test.ts`, `dateRules.test.ts`, `proposalEdits.test.ts`).
- `supabase/tests/public_proposal_privacy.sql`: written and reviewed, **not executed** against a real Postgres instance. Run it (`supabase start` / `supabase db reset`, then `psql -f`) before treating the migration as validated.
