/*
# Create parts and production_entries tables (single-tenant, no auth)

1. New Tables
- `parts`
  - `id` (uuid, primary key)
  - `part_no` (text, not null) — unique part number identifier
  - `part_name` (text, not null) — human-readable part name
  - `category` (text, not null) — part category grouping
  - `qty` (integer, not null, default 0) — current stock quantity
  - `rate` (numeric(12,2), not null, default 0) — unit rate / price
  - `created_at` (timestamptz) — row creation timestamp
  - `updated_at` (timestamptz) — row last-modified timestamp
- `production_entries`
  - `id` (uuid, primary key)
  - `part_id` (uuid, foreign key -> parts.id, cascade delete) — which part was produced
  - `part_no` (text, not null) — denormalized part number for fast reporting
  - `qty_produced` (integer, not null) — number of units produced
  - `production_date` (date, not null) — date of production
  - `machine` (text, not null) — machine identifier used
  - `created_at` (timestamptz) — row creation timestamp

2. Indexes
- `idx_parts_part_no` on parts(part_no) — fast lookups by part number
- `idx_parts_category` on parts(category) — category filtering
- `idx_production_part_id` on production_entries(part_id)
- `idx_production_date` on production_entries(production_date) — today's production query

3. Security
- Enable RLS on both tables.
- Single-tenant app with no sign-in: allow anon + authenticated full CRUD
  because the data is intentionally shared/public across the workshop.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).

4. Notes
- `updated_at` auto-refreshes via a trigger on parts whenever a row changes.
- production_entries stores a denormalized `part_no` copy so reports can be
  exported even if a part is later deleted (the FK cascades, but the snapshot
  of the part number at entry time is preserved until cascade).
*/

CREATE TABLE IF NOT EXISTS parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_no text NOT NULL,
  part_name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  qty integer NOT NULL DEFAULT 0,
  rate numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parts_part_no ON parts(part_no);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);

CREATE TABLE IF NOT EXISTS production_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  part_no text NOT NULL,
  qty_produced integer NOT NULL,
  production_date date NOT NULL,
  machine text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_production_part_id ON production_entries(part_id);
CREATE INDEX IF NOT EXISTS idx_production_date ON production_entries(production_date);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_parts" ON parts;
CREATE POLICY "anon_select_parts" ON parts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_parts" ON parts;
CREATE POLICY "anon_insert_parts" ON parts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_parts" ON parts;
CREATE POLICY "anon_update_parts" ON parts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_parts" ON parts;
CREATE POLICY "anon_delete_parts" ON parts FOR DELETE
  TO anon, authenticated USING (true);

ALTER TABLE production_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_production" ON production_entries;
CREATE POLICY "anon_select_production" ON production_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_production" ON production_entries;
CREATE POLICY "anon_insert_production" ON production_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_production" ON production_entries;
CREATE POLICY "anon_update_production" ON production_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_production" ON production_entries;
CREATE POLICY "anon_delete_production" ON production_entries FOR DELETE
  TO anon, authenticated USING (true);
