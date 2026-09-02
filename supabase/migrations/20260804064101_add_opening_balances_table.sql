/*
# Add opening_balances table for manual opening stock entries

1. New Table
- `opening_balances`
  - `id` (uuid, primary key)
  - `part_no` (text, not null)
  - `month` (text, not null) — YYYY-MM format
  - `qty` (integer, not null, default 0) — manual opening quantity
  - `created_at` (timestamptz)
  - Unique on (part_no, month)

2. Security
- RLS enabled, authenticated read, admin write (same pattern as other tables).

3. Notes
- Used for the first month (Aug 2026) where there is no previous month closing
  to carry forward. Admin manually enters opening stock per part for August.
- For subsequent months, opening = previous month's closing (auto-calculated).
*/

CREATE TABLE IF NOT EXISTS opening_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_no text NOT NULL,
  month text NOT NULL,
  qty integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_opening_part_month UNIQUE(part_no, month)
);

CREATE INDEX IF NOT EXISTS idx_opening_balances_part_no ON opening_balances(part_no);
CREATE INDEX IF NOT EXISTS idx_opening_balances_month ON opening_balances(month);

ALTER TABLE opening_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_opening_balances" ON opening_balances;
CREATE POLICY "auth_select_opening_balances" ON opening_balances FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_opening_balances" ON opening_balances;
CREATE POLICY "admin_insert_opening_balances" ON opening_balances FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_opening_balances" ON opening_balances;
CREATE POLICY "admin_update_opening_balances" ON opening_balances FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_opening_balances" ON opening_balances;
CREATE POLICY "admin_delete_opening_balances" ON opening_balances FOR DELETE
  TO authenticated USING (is_admin());
