/*
# إضافة جدول صلاحيات المستخدمين على الأقسام

1. الغرض
   إنشاء جدول `user_permissions` يخزّن صلاحية كل مستخدم على كل قسم من أقسام
   البرنامج. الصلاحية تكون واحدة من ثلاثة مستويات:
   - `view`  : استعراض فقط
   - `add`   : استعراض وإضافة فقط (بدون تعديل أو حذف)
   - `edit`  : استعراض وإضافة وتعديل (إدارة كاملة للبيانات)
   المدير (admin) لديه صلاحيات كاملة على جميع الأقسام تلقائيًا ولا يحتاج لصفوف
   في هذا الجدول.

2. الجداول الجديدة
   - `user_permissions`
     - id (uuid PK)
     - user_id (uuid FK -> auth.users, ON DELETE CASCADE)
     - section (text) — مفتاح القسم: overview, items, categories, suppliers,
       employees, stock-in, stock-out, returns, reports, purchase-orders,
       inventory, invoices, search, backup
     - level (text) — المستوى: view / add / edit
     - granted_by (uuid FK -> auth.users) — من أعطى الصلاحية
     - created_at (timestamptz)
     - قيد التفرد: UNIQUE(user_id, section)

3. الأمان
   - RLS مفعّل على الجدول.
   - SELECT: أي مستخدم مسجّل يمكنه رؤية صلاحياته الخاصة (لعرض ما يملكه).
   - INSERT/UPDATE/DELETE: مدير النظام فقط (من يملك دور admin في user_roles)
     عبر دالة SECURITY DEFINER تتحقق من الدور. السياسات تستدعي الدالة.

4. ملاحظات
   - لا توجد بيانات أولية — المدير يضيف الصلاحيات من واجهة المستخدمين.
*/

CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section text NOT NULL,
  level text NOT NULL DEFAULT 'view' CHECK (level IN ('view', 'add', 'edit')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, section)
);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- دالة للتحقق مما إذا كان المستخدم الحالي مديرًا
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  );
$$;

-- SELECT: المستخدم يرى صلاحياته فقط، والمدير يرى الكل
DROP POLICY IF EXISTS "select_user_permissions" ON user_permissions;
CREATE POLICY "select_user_permissions" ON user_permissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_current_user_admin());

-- INSERT: المدير فقط
DROP POLICY IF EXISTS "insert_user_permissions" ON user_permissions;
CREATE POLICY "insert_user_permissions" ON user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin());

-- UPDATE: المدير فقط
DROP POLICY IF EXISTS "update_user_permissions" ON user_permissions;
CREATE POLICY "update_user_permissions" ON user_permissions
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- DELETE: المدير فقط
DROP POLICY IF EXISTS "delete_user_permissions" ON user_permissions;
CREATE POLICY "delete_user_permissions" ON user_permissions
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_section ON user_permissions(section);
