/*
# إنشاء جدول إعدادات النظام

1. الغرض
   تخزين هوية التطبيق والمشروع (الاسم، الوصف، بيانات التواصل، الشعار)
   في مكان واحد مركزي يمكن للمدير تعديله من قسم "إعدادات النظام".

2. الجداول الجديدة
   - `system_settings`
     - `id` (uuid, مفتاح أساسي)
     - `app_name` (text) — اسم التطبيق
     - `app_description` (text) — وصف مختصر
     - `contact_email` (text) — بريد التواصل
     - `contact_phone` (text) — هاتف التواصل
     - `contact_address` (text) — العنوان
     - `logo_url` (text) — رابط الشعار (يُرفع إلى Supabase Storage)
     - `storage_mode` (text, default 'supabase') — وضع التخزين الحالي
     - `updated_at` (timestamptz)

3. الأمان
   - تفعيل RLS على الجدول.
   - جميع المستخدمين المصادق عليهم يمكنهم القراءة (SELECT).
   - المديرون فقط يمكنهم الإضافة والتعديل (INSERT/UPDATE) — يتم التحقق
     عبر الدالة is_current_user_admin().
*/

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL DEFAULT 'مخازن مدارس طلائع المبدعين الأهلية',
  app_description text DEFAULT 'نظام إدارة المخازن',
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  contact_address text DEFAULT '',
  logo_url text DEFAULT '',
  storage_mode text NOT NULL DEFAULT 'supabase',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- جميع المستخدمين المصادق عليهم يمكنهم قراءة الإعدادات
DROP POLICY IF EXISTS "authenticated_read_settings" ON system_settings;
CREATE POLICY "authenticated_read_settings" ON system_settings
  FOR SELECT TO authenticated USING (true);

-- المديرون فقط يمكنهم الإضافة
DROP POLICY IF EXISTS "admin_insert_settings" ON system_settings;
CREATE POLICY "admin_insert_settings" ON system_settings
  FOR INSERT TO authenticated WITH CHECK (is_current_user_admin());

-- المديرون فقط يمكنهم التعديل
DROP POLICY IF EXISTS "admin_update_settings" ON system_settings;
CREATE POLICY "admin_update_settings" ON system_settings
  FOR UPDATE TO authenticated USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- المديرون فقط يمكنهم الحذف
DROP POLICY IF EXISTS "admin_delete_settings" ON system_settings;
CREATE POLICY "admin_delete_settings" ON system_settings
  FOR DELETE TO authenticated USING (is_current_user_admin());

-- إدراج صف افتراضي إذا لم يوجد
INSERT INTO system_settings (id, app_name, app_description)
SELECT gen_random_uuid(), 'مخازن مدارس طلائع المبدعين الأهلية', 'نظام إدارة المخازن'
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- إنشاء bucket لتخزين الشعار إذا لم يوجد
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

-- سياسات التخزين: القراءة عامة، الرفع للمديرين فقط
DROP POLICY IF EXISTS "public_read_school_assets" ON storage.objects;
CREATE POLICY "public_read_school_assets" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "admin_upload_school_assets" ON storage.objects;
CREATE POLICY "admin_upload_school_assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'school-assets' AND is_current_user_admin());

DROP POLICY IF EXISTS "admin_update_school_assets" ON storage.objects;
CREATE POLICY "admin_update_school_assets" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'school-assets' AND is_current_user_admin()) WITH CHECK (bucket_id = 'school-assets' AND is_current_user_admin());

DROP POLICY IF EXISTS "admin_delete_school_assets" ON storage.objects;
CREATE POLICY "admin_delete_school_assets" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'school-assets' AND is_current_user_admin());
