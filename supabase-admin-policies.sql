-- Admin RLS policies
-- Allows the admin email (ykvaz07@gmail.com) full access to manage all tables

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ykvaz07@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Purchases: admin can do everything
DROP POLICY IF EXISTS "Admin full access to purchases" ON purchases;
CREATE POLICY "Admin full access to purchases" ON purchases
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Subscriptions: admin can do everything
DROP POLICY IF EXISTS "Admin full access to subscriptions" ON subscriptions;
CREATE POLICY "Admin full access to subscriptions" ON subscriptions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Audit logs: admin can insert
DROP POLICY IF EXISTS "Admin can insert audit logs" ON audit_logs;
CREATE POLICY "Admin can insert audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (is_admin());

-- Audit logs: admin can read
DROP POLICY IF EXISTS "Admin can read audit logs" ON audit_logs;
CREATE POLICY "Admin can read audit logs" ON audit_logs
  FOR SELECT
  USING (is_admin());

-- Announcements: admin can do everything
DROP POLICY IF EXISTS "Admin full access to announcements" ON announcements;
CREATE POLICY "Admin full access to announcements" ON announcements
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- IP logs: admin can read all
DROP POLICY IF EXISTS "Admin can read all ip logs" ON ip_logs;
CREATE POLICY "Admin can read all ip logs" ON ip_logs
  FOR SELECT
  USING (is_admin());

-- Scripts: admin can read all
DROP POLICY IF EXISTS "Admin can read all scripts" ON scripts;
CREATE POLICY "Admin can read all scripts" ON scripts
  FOR SELECT
  USING (is_admin());

-- Keys: admin can read all
DROP POLICY IF EXISTS "Admin can read all keys" ON keys;
CREATE POLICY "Admin can read all keys" ON keys
  FOR SELECT
  USING (is_admin());

-- Projects: admin can read all
DROP POLICY IF EXISTS "Admin can read all projects" ON projects;
CREATE POLICY "Admin can read all projects" ON projects
  FOR SELECT
  USING (is_admin());
