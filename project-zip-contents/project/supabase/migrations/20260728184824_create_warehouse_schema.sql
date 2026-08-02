/*
# Create school warehouse schema (single-tenant, no auth)

1. Purpose
   This is the database for a school warehouse management app (إدارة مخازن المدرسة).
   The app has NO sign-in screen, so it runs entirely as the `anon` role. All
   policies therefore allow `anon, authenticated` and the data is intentionally
   shared/public within the single tenant.

2. New Tables
   - `categories` — item categories (books, uniforms, electronics, stationery, furniture, cleaning)
     - id (uuid PK), name (text), name_ar (text), icon (text), created_at (timestamptz)
   - `items` — stock items
     - id (uuid PK), sku (text unique), name (text), category_id (uuid FK -> categories),
       unit (text), current_balance (int, default 0), reorder_level (int, default 0),
       cost_price (numeric, default 0), sale_price (numeric, default 0),
       attributes (jsonb, default '{}'), notes (text), created_at (timestamptz)
   - `suppliers` — suppliers
     - id (uuid PK), name (text), phone, email, address, notes, created_at
   - `employees` — school staff
     - id (uuid PK), name (text), job_title, department, phone, notes, created_at
   - `stock_in` — goods received
     - id (uuid PK), item_id (FK -> items), supplier_id (FK -> suppliers nullable),
       invoice_number, quantity (int), unit_cost (numeric), received_date (date),
       notes, created_at
   - `stock_out` — goods issued
     - id (uuid PK), item_id (FK -> items), quantity (int), issue_type (text: student/teacher/department),
       recipient_name, employee_id (FK -> employees nullable), department, grade,
       serial_number, issue_date (date), notes, created_at
   - `returns_scrap` — returns and scrap
     - id (uuid PK), item_id (FK -> items), quantity (int), type (text: return/scrap),
       reason, source_type, source_name, transaction_date (date), notes, created_at

3. Security
   - RLS enabled on every table.
   - Each table gets 4 CRUD policies (SELECT/INSERT/UPDATE/DELETE) scoped to
     `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because
     this is a single-tenant app with no sign-in (data is intentionally shared).

4. Indexes
   - items.category_id, items.sku
   - stock_in.item_id, stock_out.item_id, returns_scrap.item_id
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  name_ar text NOT NULL,
  icon text DEFAULT 'book',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  unit text NOT NULL DEFAULT 'حبة',
  current_balance integer NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 0,
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  job_title text,
  department text,
  phone text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_in (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_number text,
  quantity integer NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_out (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  issue_type text NOT NULL DEFAULT 'department',
  recipient_name text,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  department text,
  grade text,
  serial_number text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS returns_scrap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'return',
  reason text,
  source_type text,
  source_name text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_stock_in_item_id ON stock_in(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_out_item_id ON stock_out(item_id);
CREATE INDEX IF NOT EXISTS idx_returns_scrap_item_id ON returns_scrap(item_id);

-- Helper to enable RLS + grant full CRUD to anon+authenticated for a shared table
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','items','suppliers','employees','stock_in','stock_out','returns_scrap']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);

    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "anon_select_%s" ON %I FOR SELECT TO anon, authenticated USING (true);', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "anon_insert_%s" ON %I FOR INSERT TO anon, authenticated WITH CHECK (true);', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "anon_update_%s" ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "anon_delete_%s" ON %I FOR DELETE TO anon, authenticated USING (true);', t, t);
  END LOOP;
END $$;
