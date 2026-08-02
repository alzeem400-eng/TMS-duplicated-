import * as XLSX from 'xlsx'
import { supabase } from './supabase'
import type {
  Category,
  Employee,
  Item,
  ReturnsScrap,
  StockIn,
  StockOut,
  Supplier,
} from '../types'

const SHEETS = {
  categories: 'التصنيفات',
  items: 'الأصناف',
  suppliers: 'الموردون',
  employees: 'الموظفون',
  stockIn: 'الوارد',
  stockOut: 'المنصرف',
  returns: 'المرتجعات والتالف',
} as const

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function writeWorkbook(wb: XLSX.WorkBook, filename: string) {
  wb.Workbook = wb.Workbook || {}
  wb.Workbook.Views = wb.Workbook.Views || [{}]
  ;(wb.Workbook.Views[0] as { RTL?: boolean }).RTL = true
  XLSX.writeFile(wb, filename)
}

/* ------------------------------------------------------------------ */
/* EXPORT — full backup of all data to a single Excel file            */
/* ------------------------------------------------------------------ */

export async function exportAllData() {
  const [itemsRes, categoriesRes, suppliersRes, employeesRes, stockInRes, stockOutRes, returnsRes] =
    await Promise.all([
      supabase.from('items').select('*, category:categories(*)'),
      supabase.from('categories').select('*'),
      supabase.from('suppliers').select('*'),
      supabase.from('employees').select('*'),
      supabase.from('stock_in').select('*, item:items(name, sku), supplier:suppliers(name)'),
      supabase.from('stock_out').select('*, item:items(name, sku), employee:employees(name)'),
      supabase.from('returns_scrap').select('*, item:items(name, sku)'),
    ])

  const categories = (categoriesRes.data || []) as Category[]
  const items = (itemsRes.data || []) as Item[]
  const suppliers = (suppliersRes.data || []) as Supplier[]
  const employees = (employeesRes.data || []) as Employee[]
  const stockIn = (stockInRes.data || []) as StockIn[]
  const stockOut = (stockOutRes.data || []) as StockOut[]
  const returns = (returnsRes.data || []) as ReturnsScrap[]

  const wb = XLSX.utils.book_new()

  const catRows = categories.map((q) => ({
    'الاسم بالعربية': q.name_ar,
    'الاسم بالإنجليزية': q.name,
    الأيقونة: q.icon || '',
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(catRows.length > 0 ? catRows : [{ 'الاسم بالعربية': '' }]),
    SHEETS.categories,
  )

  const itemRows = items.map((q) => ({
    الرمز: q.sku,
    الصنف: q.name,
    التصنيف: q.category?.name_ar || '',
    الوحدة: q.unit,
    'الرصيد الحالي': q.current_balance,
    'الحد الأدنى': q.reorder_level,
    'سعر التكلفة': q.cost_price,
    'سعر البيع': q.sale_price,
    'قيمة المخزون': q.current_balance * q.cost_price,
    ملاحظات: q.notes || '',
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(itemRows.length > 0 ? itemRows : [{ الرمز: '' }]),
    SHEETS.items,
  )

  const supRows = suppliers.map((q) => ({
    الاسم: q.name,
    الهاتف: q.phone || '',
    'البريد الإلكتروني': q.email || '',
    العنوان: q.address || '',
    ملاحظات: q.notes || '',
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(supRows.length > 0 ? supRows : [{ الاسم: '' }]),
    SHEETS.suppliers,
  )

  const empRows = employees.map((q) => ({
    الاسم: q.name,
    'المسمى الوظيفي': q.job_title || '',
    القسم: q.department || '',
    الهاتف: q.phone || '',
    ملاحظات: q.notes || '',
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(empRows.length > 0 ? empRows : [{ الاسم: '' }]),
    SHEETS.employees,
  )

  const inRows = stockIn.map((q) => ({
    التاريخ: q.received_date,
    الصنف: q.item?.name || '',
    الرمز: q.item?.sku || '',
    المورد: q.supplier?.name || '',
    'رقم الفاتورة': q.invoice_number || '',
    الكمية: q.quantity,
    'سعر الوحدة': q.unit_cost,
    الإجمالي: q.unit_cost * q.quantity,
    ملاحظات: q.notes || '',
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(inRows.length > 0 ? inRows : [{ التاريخ: '' }]),
    SHEETS.stockIn,
  )

  const outRows = stockOut.map((q) => ({
    التاريخ: q.issue_date,
    الصنف: q.item?.name || '',
    الرمز: q.item?.sku || '',
    'نوع الصرف': q.issue_type === 'student' ? 'طالب' : q.issue_type === 'teacher' ? 'معلم' : 'قسم',
    المستلم: q.recipient_name || q.employee?.name || '',
    القسم: q.department || '',
    الصف: q.grade || '',
    الكمية: q.quantity,
    'الرقم التسلسلي': q.serial_number || '',
    ملاحظات: q.notes || '',
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(outRows.length > 0 ? outRows : [{ التاريخ: '' }]),
    SHEETS.stockOut,
  )

  const retRows = returns.map((q) => ({
    التاريخ: q.transaction_date,
    الصنف: q.item?.name || '',
    الرمز: q.item?.sku || '',
    النوع: q.type === 'return' ? 'مرتجع' : 'تالف',
    الكمية: q.quantity,
    السبب: q.reason || '',
    المصدر: q.source_name || '',
    ملاحظات: q.notes || '',
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(retRows.length > 0 ? retRows : [{ التاريخ: '' }]),
    SHEETS.returns,
  )

  const date = new Date().toISOString().slice(0, 10)
  writeWorkbook(wb, `مخزن_المدرسة_${date}.xlsx`)
}

/* ------------------------------------------------------------------ */
/* FULL BACKUP — every table as a sheet, raw rows for complete restore */
/* ------------------------------------------------------------------ */

const BACKUP_TABLES = [
  'categories', 'items', 'suppliers', 'employees',
  'stock_in', 'stock_out', 'returns_scrap',
  'purchase_orders', 'purchase_order_items',
  'inventory_counts', 'inventory_count_items',
  'invoices', 'invoice_items',
] as const

export async function exportFullBackup() {
  const results = await Promise.all(
    BACKUP_TABLES.map((t) => supabase.from(t).select('*')),
  )
  const wb = XLSX.utils.book_new()
  BACKUP_TABLES.forEach((t, i) => {
    const rows = (results[i].data || []) as Record<string, unknown>[]
    const sheet = rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.json_to_sheet([{ 'لا توجد بيانات': '' }])
    XLSX.utils.book_append_sheet(wb, sheet, t)
  })
  const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  writeWorkbook(wb, `نسخة_احتياطية_${date}.xlsx`)
}

export async function exportTableCSV(table: string) {
  const { data } = await supabase.from(table).select('*')
  const rows = (data || []) as Record<string, unknown>[]
  const ws = rows.length > 0
    ? XLSX.utils.json_to_sheet(rows)
    : XLSX.utils.json_to_sheet([{ 'لا توجد بيانات': '' }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, table)
  const csv = XLSX.utils.sheet_to_csv(ws)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${table}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/* TEMPLATE — empty Excel with the correct Arabic headers per sheet   */
/* ------------------------------------------------------------------ */

export function downloadImportTemplate(includeAll = true) {
  const wb = XLSX.utils.book_new()

  const catHeaders = [{ 'الاسم بالعربية': '', 'الاسم بالإنجليزية': '', الأيقونة: '' }]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catHeaders), SHEETS.categories)

  const itemHeaders = [
    {
      الرمز: '',
      الصنف: '',
      التصنيف: '',
      الوحدة: '',
      'الرصيد الحالي': '',
      'الحد الأدنى': '',
      'سعر التكلفة': '',
      'سعر البيع': '',
      ملاحظات: '',
    },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemHeaders), SHEETS.items)

  if (includeAll) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ الاسم: '', الهاتف: '', 'البريد الإلكتروني': '', العنوان: '', ملاحظات: '' }]),
      SHEETS.suppliers,
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { الاسم: '', 'المسمى الوظيفي': '', القسم: '', الهاتف: '', ملاحظات: '' },
      ]),
      SHEETS.employees,
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          التاريخ: '',
          الصنف: '',
          الرمز: '',
          المورد: '',
          'رقم الفاتورة': '',
          الكمية: '',
          'سعر الوحدة': '',
          الإجمالي: '',
          ملاحظات: '',
        },
      ]),
      SHEETS.stockIn,
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          التاريخ: '',
          الصنف: '',
          الرمز: '',
          'نوع الصرف': '',
          المستلم: '',
          القسم: '',
          الصف: '',
          الكمية: '',
          'الرقم التسلسلي': '',
          ملاحظات: '',
        },
      ]),
      SHEETS.stockOut,
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          التاريخ: '',
          الصنف: '',
          الرمز: '',
          النوع: '',
          الكمية: '',
          السبب: '',
          المصدر: '',
          ملاحظات: '',
        },
      ]),
      SHEETS.returns,
    )
  }

  writeWorkbook(wb, includeAll ? 'قالب_استيراد_المخزن.xlsx' : 'قالب_استيراد_الأصناف.xlsx')
}

/* ------------------------------------------------------------------ */
/* IMPORT — parse an uploaded Excel file                              */
/* ------------------------------------------------------------------ */

export interface ImportPreview {
  categories: Partial<Category>[]
  items: {
    sku: string
    name: string
    category_name?: string
    unit: string
    current_balance: number
    reorder_level: number
    cost_price: number
    sale_price: number
    notes: string
  }[]
  suppliers: Partial<Supplier>[]
  employees: Partial<Employee>[]
  stockIn: {
    received_date: string
    item_sku?: string
    item_name?: string
    supplier_name?: string
    invoice_number: string
    quantity: number
    unit_cost: number
    notes: string
  }[]
  stockOut: {
    issue_date: string
    item_sku?: string
    item_name?: string
    issue_type: 'student' | 'teacher' | 'department'
    recipient_name: string
    department: string
    grade: string
    quantity: number
    serial_number: string
    notes: string
  }[]
  returns: {
    transaction_date: string
    item_sku?: string
    item_name?: string
    type: 'return' | 'scrap'
    quantity: number
    reason: string
    source_name: string
    notes: string
  }[]
}

const EMPTY_PREVIEW: ImportPreview = {
  categories: [],
  items: [],
  suppliers: [],
  employees: [],
  stockIn: [],
  stockOut: [],
  returns: [],
}

function sheetToRows(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  if (!wb.SheetNames.includes(name)) return []
  const sheet = wb.Sheets[name]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}

export async function parseImportFile(file: File): Promise<ImportPreview> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })

  // Try Arabic sheet names first, fall back to any matching by order
  const preview: ImportPreview = { ...EMPTY_PREVIEW }

  const catRows = sheetToRows(wb, SHEETS.categories)
  preview.categories = catRows
    .map((r) => ({
      name_ar: str(r['الاسم بالعربية']),
      name: str(r['الاسم بالإنجليزية']),
      icon: str(r['الأيقونة']) || 'book',
    }))
    .filter((r) => r.name_ar)

  const itemRows = sheetToRows(wb, SHEETS.items)
  preview.items = itemRows
    .map((r) => ({
      sku: str(r['الرمز']),
      name: str(r['الصنف']),
      category_name: str(r['التصنيف']),
      unit: str(r['الوحدة']) || 'حبة',
      current_balance: num(r['الرصيد الحالي']),
      reorder_level: num(r['الحد الأدنى']),
      cost_price: num(r['سعر التكلفة']),
      sale_price: num(r['سعر البيع']),
      notes: str(r['ملاحظات']),
    }))
    .filter((r) => r.sku && r.name)

  const supRows = sheetToRows(wb, SHEETS.suppliers)
  preview.suppliers = supRows
    .map((r) => ({
      name: str(r['الاسم']),
      phone: str(r['الهاتف']) || null,
      email: str(r['البريد الإلكتروني']) || null,
      address: str(r['العنوان']) || null,
      notes: str(r['ملاحظات']) || null,
    }))
    .filter((r) => r.name)

  const empRows = sheetToRows(wb, SHEETS.employees)
  preview.employees = empRows
    .map((r) => ({
      name: str(r['الاسم']),
      job_title: str(r['المسمى الوظيفي']) || null,
      department: str(r['القسم']) || null,
      phone: str(r['الهاتف']) || null,
      notes: str(r['ملاحظات']) || null,
    }))
    .filter((r) => r.name)

  const inRows = sheetToRows(wb, SHEETS.stockIn)
  preview.stockIn = inRows
    .map((r) => ({
      received_date: str(r['التاريخ']),
      item_sku: str(r['الرمز']),
      item_name: str(r['الصنف']),
      supplier_name: str(r['المورد']),
      invoice_number: str(r['رقم الفاتورة']),
      quantity: num(r['الكمية']),
      unit_cost: num(r['سعر الوحدة']),
      notes: str(r['ملاحظات']),
    }))
    .filter((r) => r.received_date && (r.item_sku || r.item_name) && r.quantity)

  const outRows = sheetToRows(wb, SHEETS.stockOut)
  preview.stockOut = outRows
    .map((r) => {
      const typeAr = str(r['نوع الصرف'])
      const issue_type: 'student' | 'teacher' | 'department' =
        typeAr === 'طالب' ? 'student' : typeAr === 'معلم' ? 'teacher' : 'department'
      return {
        issue_date: str(r['التاريخ']),
        item_sku: str(r['الرمز']),
        item_name: str(r['الصنف']),
        issue_type,
        recipient_name: str(r['المستلم']),
        department: str(r['القسم']),
        grade: str(r['الصف']),
        quantity: num(r['الكمية']),
        serial_number: str(r['الرقم التسلسلي']),
        notes: str(r['ملاحظات']),
      }
    })
    .filter((r) => r.issue_date && (r.item_sku || r.item_name) && r.quantity)

  const retRows = sheetToRows(wb, SHEETS.returns)
  preview.returns = retRows
    .map((r) => {
      const typeAr = str(r['النوع'])
      const type: 'return' | 'scrap' = typeAr === 'تالف' ? 'scrap' : 'return'
      return {
        transaction_date: str(r['التاريخ']),
        item_sku: str(r['الرمز']),
        item_name: str(r['الصنف']),
        type,
        quantity: num(r['الكمية']),
        reason: str(r['السبب']),
        source_name: str(r['المصدر']),
        notes: str(r['ملاحظات']),
      }
    })
    .filter((r) => r.transaction_date && (r.item_sku || r.item_name) && r.quantity)

  return preview
}

export interface ImportSummary {
  categories: number
  items: number
  suppliers: number
  employees: number
  stockIn: number
  stockOut: number
  returns: number
}

function countSummary(p: ImportPreview): ImportSummary {
  return {
    categories: p.categories.length,
    items: p.items.length,
    suppliers: p.suppliers.length,
    employees: p.employees.length,
    stockIn: p.stockIn.length,
    stockOut: p.stockOut.length,
    returns: p.returns.length,
  }
}

/* ------------------------------------------------------------------ */
/* COMMIT — write parsed data into Supabase                          */
/* ------------------------------------------------------------------ */

export interface CommitResult {
  summary: ImportSummary
  errors: string[]
}

/**
 * Import items only. Categories referenced by name are created on the fly.
 * Existing SKUs are updated instead of duplicated (upsert).
 */
export async function importItemsOnly(preview: ImportPreview): Promise<CommitResult> {
  const errors: string[] = []
  const summary = countSummary(preview)

  // Ensure categories referenced by name exist
  const categoryNameSet = new Set(
    preview.items.map((i) => i.category_name).filter(Boolean) as string[],
  )
  const categoryNameToId = new Map<string, string>()

  if (categoryNameSet.size > 0) {
    const { data: existingCats } = await supabase
      .from('categories')
      .select('id, name_ar')
      .in('name_ar', Array.from(categoryNameSet))
    ;(existingCats || []).forEach((c) => categoryNameToId.set(c.name_ar, c.id))

    const toCreate = Array.from(categoryNameSet).filter((n) => !categoryNameToId.has(n))
    if (toCreate.length > 0) {
      const { data: created, error } = await supabase
        .from('categories')
        .insert(toCreate.map((name_ar) => ({ name_ar, name: name_ar, icon: 'book' })))
        .select('id, name_ar')
      if (error) errors.push(`فشل إنشاء التصنيفات: ${error.message}`)
      ;(created || []).forEach((c) => categoryNameToId.set(c.name_ar, c.id))
      summary.categories += created?.length || 0
    }
  }

  // Upsert items by sku
  const itemRows = preview.items.map((i) => ({
    sku: i.sku,
    name: i.name,
    category_id: i.category_name ? categoryNameToId.get(i.category_name) || null : null,
    unit: i.unit,
    current_balance: i.current_balance,
    reorder_level: i.reorder_level,
    cost_price: i.cost_price,
    sale_price: i.sale_price,
    notes: i.notes || null,
  }))

  if (itemRows.length > 0) {
    const { error } = await supabase
      .from('items')
      .upsert(itemRows, { onConflict: 'sku' })
    if (error) errors.push(`فشل استيراد الأصناف: ${error.message}`)
  }

  return { summary, errors }
}

/**
 * Import everything: categories, items, suppliers, employees, then
 * stock_in / stock_out / returns (resolved by sku/name).
 */
export async function importAllData(preview: ImportPreview): Promise<CommitResult> {
  const errors: string[] = []
  const summary = countSummary(preview)

  // 1. Categories
  let categoryNameToId = new Map<string, string>()
  if (preview.categories.length > 0) {
    const rows = preview.categories.map((c) => ({
      name_ar: c.name_ar!,
      name: c.name || c.name_ar!,
      icon: c.icon || 'book',
    }))
    const { data, error } = await supabase.from('categories').upsert(rows, {
      onConflict: 'name_ar',
    }).select('id, name_ar')
    if (error) errors.push(`فشل استيراد التصنيفات: ${error.message}`)
    ;(data || []).forEach((c) => categoryNameToId.set(c.name_ar, c.id))
    // also fetch any existing categories to resolve item references
    const { data: allCats } = await supabase.from('categories').select('id, name_ar')
    ;(allCats || []).forEach((c) => categoryNameToId.set(c.name_ar, c.id))
  } else {
    const { data: allCats } = await supabase.from('categories').select('id, name_ar')
    ;(allCats || []).forEach((c) => categoryNameToId.set(c.name_ar, c.id))
  }

  // 2. Items (upsert by sku)
  let skuToItemId = new Map<string, string>()
  let nameToItemId = new Map<string, string>()
  if (preview.items.length > 0) {
    const itemRows = preview.items.map((i) => ({
      sku: i.sku,
      name: i.name,
      category_id: i.category_name ? categoryNameToId.get(i.category_name) || null : null,
      unit: i.unit,
      current_balance: i.current_balance,
      reorder_level: i.reorder_level,
      cost_price: i.cost_price,
      sale_price: i.sale_price,
      notes: i.notes || null,
    }))
    const { data, error } = await supabase
      .from('items')
      .upsert(itemRows, { onConflict: 'sku' })
      .select('id, sku, name')
    if (error) errors.push(`فشل استيراد الأصناف: ${error.message}`)
    ;(data || []).forEach((i) => {
      skuToItemId.set(i.sku, i.id)
      nameToItemId.set(i.name, i.id)
    })
  }
  // load all items to resolve transactions by name
  const { data: allItems } = await supabase.from('items').select('id, sku, name')
  ;(allItems || []).forEach((i) => {
    skuToItemId.set(i.sku, i.id)
    nameToItemId.set(i.name, i.id)
  })

  // 3. Suppliers
  let supplierNameToId = new Map<string, string>()
  if (preview.suppliers.length > 0) {
    const rows = preview.suppliers.map((s) => ({
      name: s.name!,
      phone: s.phone || null,
      email: s.email || null,
      address: s.address || null,
      notes: s.notes || null,
    }))
    const { data, error } = await supabase
      .from('suppliers')
      .upsert(rows, { onConflict: 'name' })
      .select('id, name')
    if (error) errors.push(`فشل استيراد الموردين: ${error.message}`)
    ;(data || []).forEach((s) => supplierNameToId.set(s.name, s.id))
  }
  const { data: allSuppliers } = await supabase.from('suppliers').select('id, name')
  ;(allSuppliers || []).forEach((s) => supplierNameToId.set(s.name, s.id))

  // 4. Employees
  let employeeNameToId = new Map<string, string>()
  if (preview.employees.length > 0) {
    const rows = preview.employees.map((e) => ({
      name: e.name!,
      job_title: e.job_title || null,
      department: e.department || null,
      phone: e.phone || null,
      notes: e.notes || null,
    }))
    const { data, error } = await supabase
      .from('employees')
      .upsert(rows, { onConflict: 'name' })
      .select('id, name')
    if (error) errors.push(`فشل استيراد الموظفين: ${error.message}`)
    ;(data || []).forEach((e) => employeeNameToId.set(e.name, e.id))
  }

  // 5. Stock in
  if (preview.stockIn.length > 0) {
    const rows = preview.stockIn
      .map((s) => ({
        item_id: (s.item_sku && skuToItemId.get(s.item_sku)) || (s.item_name && nameToItemId.get(s.item_name)) || null,
        supplier_id: s.supplier_name ? supplierNameToId.get(s.supplier_name) || null : null,
        invoice_number: s.invoice_number || null,
        quantity: s.quantity,
        unit_cost: s.unit_cost,
        received_date: s.received_date,
        notes: s.notes || null,
      }))
      .filter((r) => r.item_id)
    if (rows.length > 0) {
      const { error } = await supabase.from('stock_in').insert(rows)
      if (error) errors.push(`فشل استيراد الوارد: ${error.message}`)
    }
  }

  // 6. Stock out
  if (preview.stockOut.length > 0) {
    const rows = preview.stockOut
      .map((s) => ({
        item_id: (s.item_sku && skuToItemId.get(s.item_sku)) || (s.item_name && nameToItemId.get(s.item_name)) || null,
        quantity: s.quantity,
        issue_type: s.issue_type,
        recipient_name: s.recipient_name || null,
        department: s.department || null,
        grade: s.grade || null,
        serial_number: s.serial_number || null,
        issue_date: s.issue_date,
        notes: s.notes || null,
      }))
      .filter((r) => r.item_id)
    if (rows.length > 0) {
      const { error } = await supabase.from('stock_out').insert(rows)
      if (error) errors.push(`فشل استيراد المنصرف: ${error.message}`)
    }
  }

  // 7. Returns / scrap
  if (preview.returns.length > 0) {
    const rows = preview.returns
      .map((s) => ({
        item_id: (s.item_sku && skuToItemId.get(s.item_sku)) || (s.item_name && nameToItemId.get(s.item_name)) || null,
        quantity: s.quantity,
        type: s.type,
        reason: s.reason || null,
        source_name: s.source_name || null,
        transaction_date: s.transaction_date,
        notes: s.notes || null,
      }))
      .filter((r) => r.item_id)
    if (rows.length > 0) {
      const { error } = await supabase.from('returns_scrap').insert(rows)
      if (error) errors.push(`فشل استيراد المرتجعات: ${error.message}`)
    }
  }

  return { summary, errors }
}

/* ------------------------------------------------------------------ */
/* JSON BACKUP / RESTORE — full data export & import via JSON         */
/* ------------------------------------------------------------------ */

const JSON_BACKUP_TABLES = [
  'categories', 'items', 'suppliers', 'employees',
  'stock_in', 'stock_out', 'returns_scrap',
  'purchase_orders', 'purchase_order_items',
  'inventory_counts', 'inventory_count_items',
  'invoices', 'invoice_items',
] as const

export async function exportJSONBackup() {
  const results = await Promise.all(
    JSON_BACKUP_TABLES.map((t) => supabase.from(t).select('*')),
  )
  const data: Record<string, unknown[]> = {}
  JSON_BACKUP_TABLES.forEach((t, i) => {
    data[t] = (results[i].data || []) as unknown[]
  })
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    tables: data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `نسخة_احتياطية_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export interface JSONRestorePreview {
  version: number
  exported_at: string
  tables: Record<string, unknown[]>
  totalRecords: number
}

export async function parseJSONBackup(file: File): Promise<JSONRestorePreview> {
  const text = await file.text()
  const parsed = JSON.parse(text) as { version?: number; exported_at?: string; tables?: Record<string, unknown[]> }
  if (!parsed.tables || typeof parsed.tables !== 'object') {
    throw new Error('ملف غير صالح: لا يحتوي على بيانات الجداول')
  }
  const totalRecords = Object.values(parsed.tables).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0)
  return {
    version: parsed.version || 1,
    exported_at: parsed.exported_at || '',
    tables: parsed.tables,
    totalRecords,
  }
}

export async function restoreJSONBackup(preview: JSONRestorePreview): Promise<{ restored: Record<string, number>; errors: string[] }> {
  const restored: Record<string, number> = {}
  const errors: string[] = []

  const orderedTables = [
    'categories', 'items', 'suppliers', 'employees',
    'stock_in', 'stock_out', 'returns_scrap',
    'purchase_orders', 'purchase_order_items',
    'inventory_counts', 'inventory_count_items',
    'invoices', 'invoice_items',
  ]

  for (const table of orderedTables) {
    const rows = preview.tables[table]
    if (!Array.isArray(rows) || rows.length === 0) {
      restored[table] = 0
      continue
    }
    const cleanRows = rows.map((r) => {
      const row = r as Record<string, unknown>
      const { id, created_at, updated_at, ...rest } = row
      return rest
    })
    const { error } = await supabase.from(table).insert(cleanRows)
    if (error) {
      errors.push(`${table}: ${error.message}`)
    } else {
      restored[table] = cleanRows.length
    }
  }

  return { restored, errors }
}
