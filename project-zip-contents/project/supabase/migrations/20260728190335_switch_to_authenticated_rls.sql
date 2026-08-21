/*
# Switch RLS policies to authenticated-only (login now required)

1. Purpose
   The app now has a sign-in screen (email + password). Previously the data was
   open to `anon, authenticated` (single-tenant, no auth). Now that login exists,
   all policies are tightened to `TO authenticated` with ownership checks.

2. Changes
   - Drops the old `anon_*` permissive policies on all 7 tables.
   - Creates new owner-scoped CRUD policies (SELECT/INSERT/UPDATE/DELETE) on:
     categories, items, suppliers, employees, stock_in, stock_out, returns_scrap.
   - Adds `user_id uuid NOT NULL DEFAULT auth.uid()` to each table and a FK to
     auth.users, so every row belongs to the signed-in user and the DEFAULT
     auth.uid() makes `.insert({...})` succeed without the client passing user_id.

3. Security
   - RLS stays enabled. Each table gets 4 policies scoped to `TO authenticated`.
   - Ownership predicate: `auth.uid() = user_id`.
   - No policy references `anon` anymore — unauthenticated requests get nothing.
*/

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','items','suppliers','employees','stock_in','stock_out','returns_scrap']
  LOOP
    -- add owner column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='user_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;', t);
    END IF;

    -- backfill any existing nulls (shouldn't be any, but safe)
    EXECUTE format('UPDATE %I SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;', t);

    -- drop old permissive policies
    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I;', t, t);

    -- create owner-scoped policies
    EXECUTE format('DROP POLICY IF EXISTS "select_own_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "select_own_%s" ON %I FOR SELECT TO authenticated USING (auth.uid() = user_id);', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "insert_own_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "insert_own_%s" ON %I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "update_own_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "update_own_%s" ON %I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "delete_own_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "delete_own_%s" ON %I FOR DELETE TO authenticated USING (auth.uid() = user_id);', t, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_user_id ON stock_in(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_out_user_id ON stock_out(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_scrap_user_id ON returns_scrap(user_id);
