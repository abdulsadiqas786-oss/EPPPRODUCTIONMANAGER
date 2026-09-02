/*
# Add closing_balances table for manual closing overrides

- Same structure as opening_balances: part_no + month + qty
- When a closing override exists, it replaces the auto-calculated closing
  and is used as the carry-forward opening for the next month.
- RLS: authenticated read, admin write.
*/

CREATE TABLE IF NOT EXISTS closing_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_no text NOT NULL,
  month text NOT NULL,
  qty integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_closing_part_month UNIQUE(part_no, month)
);

CREATE INDEX IF NOT EXISTS idx_closing_balances_part_no ON closing_balances(part_no);
CREATE INDEX IF NOT EXISTS idx_closing_balances_month ON closing_balances(month);

ALTER TABLE closing_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_closing_balances" ON closing_balances;
CREATE POLICY "auth_select_closing_balances" ON closing_balances FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_closing_balances" ON closing_balances;
CREATE POLICY "admin_insert_closing_balances" ON closing_balances FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_closing_balances" ON closing_balances;
CREATE POLICY "admin_update_closing_balances" ON closing_balances FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_closing_balances" ON closing_balances;
CREATE POLICY "admin_delete_closing_balances" ON closing_balances FOR DELETE
  TO authenticated USING (is_admin());
