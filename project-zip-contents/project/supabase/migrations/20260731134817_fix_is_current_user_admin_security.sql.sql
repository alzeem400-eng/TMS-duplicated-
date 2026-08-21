/*
# ترقيع ثغرة أمنية في دالة is_current_user_admin

1. الغرض
   الدالة `is_current_user_admin()` كانت معرّفة بـ SECURITY DEFINER، ما يعني
   أنها تعمل بصلاحيات مالكها (postgres) وتتجاوز RLS. هذا يسمح لأي مستخدم
   يستدعيها بـ RPC بقراءة جدول user_roles متجاوزًا سياسات RLS الخاصة به.
   كما أن منح EXECUTE للدور anon يعني أن المستخدمين غير المسجّلين يمكنهم
   استدعاءها مباشرة.

2. التغييرات
   - تحويل الدالة إلى SECURITY INVOKER بحيث تعمل بصلاحيات المستدعي وتحترم RLS.
   - إلغاء تصريح EXECUTE من جميع الأدوار (anon و authenticated) لأن الدالة
     تُستخدم فقط داخل سياسات RLS ولا تحتاج لاستدعاء مباشر من التطبيق عبر RPC.
   - منح EXECUTE فقط لـ postgres (المالك الافتراضي) للحفاظ على عملها الداخلي.

3. الأمان
   - الدالة الآن INVOKER فلا تتجاوز RLS.
   - لا يمكن لأي مستخدم anon أو authenticated استدعاؤها عبر RPC.
   - سياسات RLS التي تستدعيها لا تزال تعمل لأنها تُنفّذ في سياق محرك RLS.
*/

-- إعادة تعريف الدالة بصلاحية INVOKER بدلاً من DEFINER
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  );
$$;

-- إلغاء تصريح التشغيل من جميع الأدوار العامة
REVOKE EXECUTE ON FUNCTION is_current_user_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_current_user_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION is_current_user_admin() FROM authenticated;
