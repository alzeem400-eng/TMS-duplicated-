/*
# إضافة جداول الصلاحيات وطلبات الشراء والجرد

1. الجداول الجديدة:
   - `user_roles`: صلاحيات المستخدمين (admin/manager/viewer)
   - `purchase_orders`: طلبات الشراء مع بنودها
   - `purchase_order_items`: بنود طلبات الشراء
   - `inventory_counts`: جلسات الجرد
   - `inventory_count_items`: بنود الجرد (الكميات الفعلية مقابل المسجلة)

2. الأمان: RLS مفعّل على كل الجداول بسياسات owner-scoped للمستخدمين المسجلين.

3. ملاحظات:
   - جدول user_roles يخزن دور كل مستخدم في التطبيق (admin, manager, viewer)
   - المستخدم الذي ينشئ الصف هو مالكه
   - طلبات الشراء لها حالات: draft, sent, approved, received, cancelled
*/

-- user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_user_roles" ON user_roles;
CREATE POLICY "select_user_roles" ON user_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_user_roles" ON user_roles;
CREATE POLICY "insert_user_roles" ON user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "update_user_roles" ON user_roles;
CREATE POLICY "update_user_roles" ON user_roles FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "delete_user_roles" ON user_roles;
CREATE POLICY "delete_user_roles" ON user_roles FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','received','cancelled')),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_purchase_orders" ON purchase_orders;
CREATE POLICY "select_own_purchase_orders" ON purchase_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_purchase_orders" ON purchase_orders;
CREATE POLICY "insert_own_purchase_orders" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_purchase_orders" ON purchase_orders;
CREATE POLICY "update_own_purchase_orders" ON purchase_orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_purchase_orders" ON purchase_orders;
CREATE POLICY "delete_own_purchase_orders" ON purchase_orders FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- purchase_order_items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity_ordered numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  quantity_received numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_po_items" ON purchase_order_items;
CREATE POLICY "select_own_po_items" ON purchase_order_items FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_po_items" ON purchase_order_items;
CREATE POLICY "insert_own_po_items" ON purchase_order_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_po_items" ON purchase_order_items;
CREATE POLICY "update_own_po_items" ON purchase_order_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_po_items" ON purchase_order_items;
CREATE POLICY "delete_own_po_items" ON purchase_order_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- inventory_counts
CREATE TABLE IF NOT EXISTS inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_inventory_counts" ON inventory_counts;
CREATE POLICY "select_own_inventory_counts" ON inventory_counts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_inventory_counts" ON inventory_counts;
CREATE POLICY "insert_own_inventory_counts" ON inventory_counts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_inventory_counts" ON inventory_counts;
CREATE POLICY "update_own_inventory_counts" ON inventory_counts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_inventory_counts" ON inventory_counts;
CREATE POLICY "delete_own_inventory_counts" ON inventory_counts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- inventory_count_items
CREATE TABLE IF NOT EXISTS inventory_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  system_qty numeric NOT NULL DEFAULT 0,
  actual_qty numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(count_id, item_id)
);

ALTER TABLE inventory_count_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_count_items" ON inventory_count_items;
CREATE POLICY "select_own_count_items" ON inventory_count_items FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_count_items" ON inventory_count_items;
CREATE POLICY "insert_own_count_items" ON inventory_count_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_count_items" ON inventory_count_items;
CREATE POLICY "update_own_count_items" ON inventory_count_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_count_items" ON inventory_count_items;
CREATE POLICY "delete_own_count_items" ON inventory_count_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id ON purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order_id ON purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_user_id ON inventory_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_count_items_count_id ON inventory_count_items(count_id);
