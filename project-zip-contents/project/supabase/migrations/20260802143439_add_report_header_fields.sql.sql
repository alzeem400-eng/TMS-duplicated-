/*
# إضافة حقول ترويسة التقارير إلى جدول إعدادات النظام

1. الغرض
   تمكين المدير من تخصيص ترويسة التقارير الرسمية (الجهات، العناوين، البسملة)
   من قسم إعدادات النظام بدلاً من كونها ثابتة في الكود.

2. الأعمدة الجديدة على جدول system_settings
   - `report_org_line1` (text) — الجمهورية اليمنية
   - `report_org_line2` (text) — وزارة التربية والتعليم
   - `report_org_line3` (text) — مكتب المحافظة
   - `report_org_line4` (text) — مكتب المديرية
   - `report_org_line5` (text) — اسم المدرسة
   - `report_basmala` (text) — نص البسملة
   - `report_attachments_label` (text) — تسمية حقل المرفقات
   - `report_date_label` (text) — تسمية حقل التاريخ
   - `report_number_label` (text) — تسمية حقل الرقم

3. الأمان
   لا تغيير على سياسات RLS — الأعمدة الجديدة مغطاة بسياسات الجدول الحالية.
*/

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS report_org_line1 text DEFAULT 'الجمهورية اليمنية',
  ADD COLUMN IF NOT EXISTS report_org_line2 text DEFAULT 'وزارة التربية والتعليم والبحث العلمي',
  ADD COLUMN IF NOT EXISTS report_org_line3 text DEFAULT 'مكتب التربية والتعليم محافظة صنعاء',
  ADD COLUMN IF NOT EXISTS report_org_line4 text DEFAULT 'مكتب التربية والتعليم مديرية همدان',
  ADD COLUMN IF NOT EXISTS report_org_line5 text DEFAULT 'مدارس طلائع المبدعين الأهلية',
  ADD COLUMN IF NOT EXISTS report_basmala text DEFAULT 'بسم الله الرحمن الرحيم',
  ADD COLUMN IF NOT EXISTS report_attachments_label text DEFAULT 'المرفقات',
  ADD COLUMN IF NOT EXISTS report_date_label text DEFAULT 'التاريخ',
  ADD COLUMN IF NOT EXISTS report_number_label text DEFAULT 'الرقم';
