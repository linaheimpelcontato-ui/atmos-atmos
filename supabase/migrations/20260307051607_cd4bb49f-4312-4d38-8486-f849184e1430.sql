
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS end_date date;
