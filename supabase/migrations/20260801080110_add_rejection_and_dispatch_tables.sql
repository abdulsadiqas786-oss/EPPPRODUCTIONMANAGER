-- Add rejection_entries and dispatch_entries tables

CREATE TABLE IF NOT EXISTS rejection_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_no text NOT NULL,
  part_name text NOT NULL,
  rejection_store text NOT NULL DEFAULT '1019 Scrap Store',
  rejection_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rejection_date ON rejection_entries(rejection_date);
CREATE INDEX IF NOT EXISTS idx_rejection_part_no ON rejection_entries(part_no);

ALTER TABLE rejection_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rejection" ON rejection_entries;
CREATE POLICY "anon_select_rejection" ON rejection_entries FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_rejection" ON rejection_entries;
CREATE POLICY "anon_insert_rejection" ON rejection_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_rejection" ON rejection_entries;
CREATE POLICY "anon_update_rejection" ON rejection_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_rejection" ON rejection_entries;
CREATE POLICY "anon_delete_rejection" ON rejection_entries FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS dispatch_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_no text NOT NULL,
  part_name text NOT NULL,
  migo_type text NOT NULL DEFAULT '313',
  dispatch_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_date ON dispatch_entries(dispatch_date);
CREATE INDEX IF NOT EXISTS idx_dispatch_part_no ON dispatch_entries(part_no);

ALTER TABLE dispatch_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_dispatch" ON dispatch_entries;
CREATE POLICY "anon_select_dispatch" ON dispatch_entries FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dispatch" ON dispatch_entries;
CREATE POLICY "anon_insert_dispatch" ON dispatch_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dispatch" ON dispatch_entries;
CREATE POLICY "anon_update_dispatch" ON dispatch_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dispatch" ON dispatch_entries;
CREATE POLICY "anon_delete_dispatch" ON dispatch_entries FOR DELETE
  TO anon, authenticated USING (true);
