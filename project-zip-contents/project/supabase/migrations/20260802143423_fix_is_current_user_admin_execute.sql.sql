/*
# إصلاح دالة is_current_user_admin: SECURITY DEFINER + منح EXECUTE

1. المشكلة
   دالة `is_current_user_admin()` لم تمنح صلاحية EXECUTE لدور `authenticated`،
   لذلك أي سياسة RLS تستدعيها (مثل رفع الشعار إلى storage) تفشل بصمت.
   كما أنها ليست SECURITY DEFINER، فلو أُغلق جدول user_roles لاحقاً لتعطلت.

2. التغييرات
   - استبدال جسم الدالة عبر CREATE OR REPLACE (يحافظ على OID والتبعيات).
   - ALTER FUNCTION لضبط SECURITY DEFINER و search_path آمن.
   - منح EXECUTE على الدالة لأدوار anon و authenticated.
*/

CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  );
$$;

ALTER FUNCTION is_current_user_admin() SECURITY DEFINER;
ALTER FUNCTION is_current_user_admin() SET search_path = public;

GRANT EXECUTE ON FUNCTION is_current_user_admin() TO anon, authenticated;
