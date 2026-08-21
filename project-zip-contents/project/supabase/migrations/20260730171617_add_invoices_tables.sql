/*
# إضافة جداول فواتير الشراء والبيع

1. الجداول الجديدة:
   - `invoices`: الفواتير (شراء/بيع) مع بنودها
   - `invoice_items`: بنود الفواتير

2. الأمان: RLS مفعّل على كل الجداول بسياسات owner-scoped للمستخدمين المسجلين.

3. ملاحظات:
   - نوع الفاتورة: purchase (شراء) أو sale (بيع)
   - حالة الفاتورة: draft, paid, cancelled
   - كل فاتورة لها رقم تلقائي وبنود متعددة (صنف، كمية، سعر، إجمالي)
   - يمكن ربط فاتورة الشراء بمورد وفاتورة البيع بطرف (موظف/جهة)
*/

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_type text NOT NULL CHECK (invoice_type IN ('purchase', 'sale')),
  party_name text NOT NULL,
  party_id uuid,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid', 'cancelled')),
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_invoice_items" ON invoice_items;
CREATE POLICY "select_own_invoice_items" ON invoice_items FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_invoice_items" ON invoice_items;
CREATE POLICY "insert_own_invoice_items" ON invoice_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_invoice_items" ON invoice_items;
CREATE POLICY "update_own_invoice_items" ON invoice_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_invoice_items" ON invoice_items;
CREATE POLICY "delete_own_invoice_items" ON invoice_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
