-- The app no longer collects "machine" on production entries.
-- Drop the NOT NULL constraint so inserts succeed without it.
-- Existing rows keep their data; new rows simply omit the field.
ALTER TABLE production_entries
  ALTER COLUMN machine DROP NOT NULL;
