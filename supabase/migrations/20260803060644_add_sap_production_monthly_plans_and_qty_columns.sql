/*
# Add SAP production, monthly plans, and qty columns

1. Modified Tables
- `rejection_entries`
  - Added `qty` (integer, NOT NULL, default 1) — number of rejected units per entry.
    Existing rows get qty=1, preserving the old "one row = one unit" behavior.
- `dispatch_entries`
  - Added `qty` (integer, NOT NULL, default 1) — number of dispatched units per entry.
    Existing rows get qty=1, preserving the old "one row = one unit" behavior.

2. New Tables
- `sap_production_entries`
  - `id` (uuid, primary key)
  - `part_id` (uuid, foreign key -> parts.id, cascade delete) — which part was produced (SAP)
  - `part_no` (text, not null) — denormalized part number for fast reporting
  - `qty_produced` (integer, not null) — number of units produced per SAP
  - `production_date` (date, not null) — date of SAP production
  - `created_at` (timestamptz) — row creation timestamp
- `monthly_plans`
  - `id` (uuid, primary key)
  - `part_no` (text, not null) — which part the plan is for
  - `month` (text, not null) — YYYY-MM format, e.g. '2026-08'
  - `plan_qty` (integer, not null, default 0) — planned production quantity for the month
  - `created_at` (timestamptz) — row creation timestamp
  - Unique constraint on (part_no, month) — one plan per part per month

3. Indexes
- idx_sap_production_part_id on sap_production_entries(part_id)
- idx_sap_production_date on sap_production_entries(production_date)
- idx_sap_production_part_no on sap_production_entries(part_no)
- idx_monthly_plans_part_no on monthly_plans(part_no)
- idx_monthly_plans_month on monthly_plans(month)

4. Security
- Enable RLS on both new tables.
- Single-tenant app with no sign-in: allow anon + authenticated full CRUD.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).

5. Notes
- SAP production tracks what SAP records as produced (separate from actual Migo 101
  production). It is used to calculate rejection% = rejection / SAP production * 100.
- Monthly plans store the planned quantity per part per month.
- The app no longer updates parts.qty on production entry; opening/closing stock is
  computed dynamically from entries. parts.qty serves as the initial stock baseline.
*/

-- Add qty column to rejection_entries
ALTER TABLE rejection_entries
  ADD COLUMN IF NOT EXISTS qty integer NOT NULL DEFAULT 1;

-- Add qty column to dispatch_entries
ALTER TABLE dispatch_entries
  ADD COLUMN IF NOT EXISTS qty integer NOT NULL DEFAULT 1;

-- Create sap_production_entries table
CREATE TABLE IF NOT EXISTS sap_production_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid REFERENCES parts(id) ON DELETE CASCADE,
  part_no text NOT NULL,
  qty_produced integer NOT NULL,
  production_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sap_production_part_id ON sap_production_entries(part_id);
CREATE INDEX IF NOT EXISTS idx_sap_production_date ON sap_production_entries(production_date);
CREATE INDEX IF NOT EXISTS idx_sap_production_part_no ON sap_production_entries(part_no);

ALTER TABLE sap_production_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sap_production" ON sap_production_entries;
CREATE POLICY "anon_select_sap_production" ON sap_production_entries FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sap_production" ON sap_production_entries;
CREATE POLICY "anon_insert_sap_production" ON sap_production_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sap_production" ON sap_production_entries;
CREATE POLICY "anon_update_sap_production" ON sap_production_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sap_production" ON sap_production_entries;
CREATE POLICY "anon_delete_sap_production" ON sap_production_entries FOR DELETE
  TO anon, authenticated USING (true);

-- Create monthly_plans table
CREATE TABLE IF NOT EXISTS monthly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_no text NOT NULL,
  month text NOT NULL,
  plan_qty integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_part_month UNIQUE(part_no, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_plans_part_no ON monthly_plans(part_no);
CREATE INDEX IF NOT EXISTS idx_monthly_plans_month ON monthly_plans(month);

ALTER TABLE monthly_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_monthly_plans" ON monthly_plans;
CREATE POLICY "anon_select_monthly_plans" ON monthly_plans FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_monthly_plans" ON monthly_plans;
CREATE POLICY "anon_insert_monthly_plans" ON monthly_plans FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_monthly_plans" ON monthly_plans;
CREATE POLICY "anon_update_monthly_plans" ON monthly_plans FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_monthly_plans" ON monthly_plans;
CREATE POLICY "anon_delete_monthly_plans" ON monthly_plans FOR DELETE
  TO anon, authenticated USING (true);
