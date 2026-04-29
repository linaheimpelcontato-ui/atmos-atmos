
ALTER TABLE proposal_day_items 
  ADD COLUMN start_time text DEFAULT NULL,
  ADD COLUMN end_time text DEFAULT NULL;

ALTER TABLE proposal_days 
  ADD COLUMN observation text DEFAULT '';
