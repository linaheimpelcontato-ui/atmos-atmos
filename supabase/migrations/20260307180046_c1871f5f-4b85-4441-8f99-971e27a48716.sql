
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'pt';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS proposals_share_token_idx ON proposals(share_token);

-- Public policy for reading proposals by share_token (anon)
CREATE POLICY "Public can view proposals by share_token"
ON proposals FOR SELECT TO anon
USING (share_token IS NOT NULL);

-- Public policy for reading proposal_day_items linked to shared proposals
CREATE POLICY "Public can view proposal_day_items for shared proposals"
ON proposal_day_items FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM proposals WHERE proposals.id = proposal_day_items.proposal_id AND proposals.share_token IS NOT NULL
));
