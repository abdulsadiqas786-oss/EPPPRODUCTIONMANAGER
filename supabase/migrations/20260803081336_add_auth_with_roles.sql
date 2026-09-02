/*
# Add authentication with admin and viewer roles

1. New Tables
- `user_roles`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key -> auth.users(id), cascade delete)
  - `role` (text, not null) — either 'admin' or 'viewer'
  - `created_at` (timestamptz)
  - Unique constraint on user_id

2. New Functions
- `is_admin()` — returns true if the current authenticated user's role is 'admin'.
  SECURITY DEFINER, fixed search_path.

3. Security Changes (RLS)
- ALL data tables: SELECT requires authentication (TO authenticated).
- Write operations require admin role via is_admin().
- Old anon-access policies dropped — app now requires sign-in.
- user_roles: users read own role; admin manages all roles.

4. Notes
- Admin can add/edit/delete all entries. Viewers are read-only.
*/

-- ============================================================
-- user_roles table (must exist BEFORE is_admin function)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'viewer')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_id UNIQUE(user_id)
);

-- ============================================================
-- is_admin() function — must exist BEFORE policies reference it
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- ============================================================
-- Enable RLS on user_roles and add policies
-- ============================================================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_role" ON user_roles;
CREATE POLICY "select_own_role" ON user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_select_all_roles" ON user_roles;
CREATE POLICY "admin_select_all_roles" ON user_roles FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_insert_roles" ON user_roles;
CREATE POLICY "admin_insert_roles" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_roles" ON user_roles;
CREATE POLICY "admin_update_roles" ON user_roles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_roles" ON user_roles;
CREATE POLICY "admin_delete_roles" ON user_roles FOR DELETE
  TO authenticated USING (is_admin());

-- ============================================================
-- Update RLS on ALL data tables: authenticated read, admin write
-- ============================================================

-- parts
DROP POLICY IF EXISTS "anon_select_parts" ON parts;
DROP POLICY IF EXISTS "anon_insert_parts" ON parts;
DROP POLICY IF EXISTS "anon_update_parts" ON parts;
DROP POLICY IF EXISTS "anon_delete_parts" ON parts;

CREATE POLICY "auth_select_parts" ON parts FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "admin_insert_parts" ON parts FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_parts" ON parts FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_parts" ON parts FOR DELETE
  TO authenticated USING (is_admin());

-- production_entries
DROP POLICY IF EXISTS "anon_select_production" ON production_entries;
DROP POLICY IF EXISTS "anon_insert_production" ON production_entries;
DROP POLICY IF EXISTS "anon_update_production" ON production_entries;
DROP POLICY IF EXISTS "anon_delete_production" ON production_entries;

CREATE POLICY "auth_select_production" ON production_entries FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "admin_insert_production" ON production_entries FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_production" ON production_entries FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_production" ON production_entries FOR DELETE
  TO authenticated USING (is_admin());

-- sap_production_entries
DROP POLICY IF EXISTS "anon_select_sap_production" ON sap_production_entries;
DROP POLICY IF EXISTS "anon_insert_sap_production" ON sap_production_entries;
DROP POLICY IF EXISTS "anon_update_sap_production" ON sap_production_entries;
DROP POLICY IF EXISTS "anon_delete_sap_production" ON sap_production_entries;

CREATE POLICY "auth_select_sap_production" ON sap_production_entries FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "admin_insert_sap_production" ON sap_production_entries FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_sap_production" ON sap_production_entries FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_sap_production" ON sap_production_entries FOR DELETE
  TO authenticated USING (is_admin());

-- rejection_entries
DROP POLICY IF EXISTS "anon_select_rejection" ON rejection_entries;
DROP POLICY IF EXISTS "anon_insert_rejection" ON rejection_entries;
DROP POLICY IF EXISTS "anon_update_rejection" ON rejection_entries;
DROP POLICY IF EXISTS "anon_delete_rejection" ON rejection_entries;

CREATE POLICY "auth_select_rejection" ON rejection_entries FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "admin_insert_rejection" ON rejection_entries FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_rejection" ON rejection_entries FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_rejection" ON rejection_entries FOR DELETE
  TO authenticated USING (is_admin());

-- dispatch_entries
DROP POLICY IF EXISTS "anon_select_dispatch" ON dispatch_entries;
DROP POLICY IF EXISTS "anon_insert_dispatch" ON dispatch_entries;
DROP POLICY IF EXISTS "anon_update_dispatch" ON dispatch_entries;
DROP POLICY IF EXISTS "anon_delete_dispatch" ON dispatch_entries;

CREATE POLICY "auth_select_dispatch" ON dispatch_entries FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "admin_insert_dispatch" ON dispatch_entries FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_dispatch" ON dispatch_entries FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_dispatch" ON dispatch_entries FOR DELETE
  TO authenticated USING (is_admin());

-- monthly_plans
DROP POLICY IF EXISTS "anon_select_monthly_plans" ON monthly_plans;
DROP POLICY IF EXISTS "anon_insert_monthly_plans" ON monthly_plans;
DROP POLICY IF EXISTS "anon_update_monthly_plans" ON monthly_plans;
DROP POLICY IF EXISTS "anon_delete_monthly_plans" ON monthly_plans;

CREATE POLICY "auth_select_monthly_plans" ON monthly_plans FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "admin_insert_monthly_plans" ON monthly_plans FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_monthly_plans" ON monthly_plans FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_monthly_plans" ON monthly_plans FOR DELETE
  TO authenticated USING (is_admin());
