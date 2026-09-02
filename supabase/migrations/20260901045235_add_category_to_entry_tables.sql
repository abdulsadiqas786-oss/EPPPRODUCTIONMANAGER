/*
# Add category column to all entry tables

## Purpose
Previously, category was only stored on the `parts` table. The user needs the same part
to appear under multiple categories in the production sheet — e.g. "Box luggage Flr" can
have production entries under "Foshan Mat", SAP entries under "7330-30P", and rejection
entries under "CPD Part". This requires category to be stored per-entry, not just per-part.

## Changes
1. Add `category` column (text, default 'Other') to:
   - production_entries
   - sap_production_entries
   - rejection_entries
   - dispatch_entries
   - monthly_plans
   - opening_balances
   - closing_balances
2. Backfill each new column from the corresponding part's category.
3. Update the parts table default from 'General' to 'Other' (legacy data stays as-is;
   the frontend normalizes 'General' → 'Other' at display time).

## Security
No RLS policy changes — existing policies still apply. No new tables.

## Notes
- The `category` column on entry tables is nullable=false with default 'Other' so existing
  rows and future inserts that omit category get a safe default.
- The parts.category default changes but existing 'General' values are NOT modified — the
  frontend handles that normalization.
*/

-- 1. Add category column to entry tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_entries' AND column_name = 'category') THEN
    ALTER TABLE production_entries ADD COLUMN category text NOT NULL DEFAULT 'Other';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sap_production_entries' AND column_name = 'category') THEN
    ALTER TABLE sap_production_entries ADD COLUMN category text NOT NULL DEFAULT 'Other';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rejection_entries' AND column_name = 'category') THEN
    ALTER TABLE rejection_entries ADD COLUMN category text NOT NULL DEFAULT 'Other';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispatch_entries' AND column_name = 'category') THEN
    ALTER TABLE dispatch_entries ADD COLUMN category text NOT NULL DEFAULT 'Other';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_plans' AND column_name = 'category') THEN
    ALTER TABLE monthly_plans ADD COLUMN category text NOT NULL DEFAULT 'Other';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'opening_balances' AND column_name = 'category') THEN
    ALTER TABLE opening_balances ADD COLUMN category text NOT NULL DEFAULT 'Other';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'closing_balances' AND column_name = 'category') THEN
    ALTER TABLE closing_balances ADD COLUMN category text NOT NULL DEFAULT 'Other';
  END IF;
END $$;

-- 2. Backfill category from parts table for all entry tables
UPDATE production_entries pe
SET category = COALESCE((SELECT category FROM parts WHERE parts.id = pe.part_id), 'Other')
WHERE pe.category = 'Other';

UPDATE sap_production_entries se
SET category = COALESCE((SELECT category FROM parts WHERE parts.id = se.part_id), 'Other')
WHERE se.category = 'Other';

UPDATE rejection_entries re
SET category = COALESCE((SELECT category FROM parts WHERE parts.part_no = re.part_no), 'Other')
WHERE re.category = 'Other';

UPDATE dispatch_entries de
SET category = COALESCE((SELECT category FROM parts WHERE parts.part_no = de.part_no), 'Other')
WHERE de.category = 'Other';

UPDATE monthly_plans mp
SET category = COALESCE((SELECT category FROM parts WHERE parts.part_no = mp.part_no), 'Other')
WHERE mp.category = 'Other';

UPDATE opening_balances ob
SET category = COALESCE((SELECT category FROM parts WHERE parts.part_no = ob.part_no), 'Other')
WHERE ob.category = 'Other';

UPDATE closing_balances cb
SET category = COALESCE((SELECT category FROM parts WHERE parts.part_no = cb.part_no), 'Other')
WHERE cb.category = 'Other';

-- 3. Update parts table default from 'General' to 'Other'
ALTER TABLE parts ALTER COLUMN category SET DEFAULT 'Other';
