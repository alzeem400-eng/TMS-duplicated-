export interface Category {
  id: string
  name: string
  name_ar: string
  icon: string
  created_at?: string
}

export interface Item {
  id: string
  sku: string
  name: string
  category_id: string | null
  unit: string
  current_balance: number
  reorder_level: number
  cost_price: number
  sale_price: number
  attributes: Record<string, string>
  notes: string | null
  created_at?: string
  category?: Category | null
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at?: string
}

export interface Employee {
  id: string
  name: string
  job_title: string | null
  department: string | null
  phone: string | null
  notes: string | null
  created_at?: string
}

export interface StockIn {
  id: string
  item_id: string
  supplier_id: string | null
  invoice_number: string | null
  quantity: number
  unit_cost: number
  received_date: string
  notes: string | null
  created_at?: string
  item?: Pick<Item, 'name' | 'sku'> | null
  supplier?: Pick<Supplier, 'name'> | null
}

export interface StockOut {
  id: string
  item_id: string
  quantity: number
  issue_type: 'student' | 'teacher' | 'department'
  recipient_name: string | null
  employee_id: string | null
  department: string | null
  grade: string | null
  serial_number: string | null
  issue_date: string
  notes: string | null
  created_at?: string
  item?: Pick<Item, 'name' | 'sku'> | null
  employee?: Pick<Employee, 'name'> | null
}

export interface ReturnsScrap {
  id: string
  item_id: string
  quantity: number
  type: 'return' | 'scrap'
  reason: string | null
  source_type: string | null
  source_name: string | null
  transaction_date: string
  notes: string | null
  created_at?: string
  item?: Pick<Item, 'name' | 'sku'> | null
}

export type UserRole = 'admin' | 'manager' | 'viewer'
export type PermissionLevel = 'view' | 'add' | 'edit'

export interface UserPermission {
  section: string
  level: PermissionLevel
}

export interface UserWithRole {
  id: string
  email: string
  role: UserRole
  created_at: string
  permissions?: UserPermission[]
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'approved' | 'received' | 'cancelled'

export interface PurchaseOrderItem {
  id: string
  order_id: string
  item_id: string
  quantity_ordered: number
  unit_cost: number
  quantity_received: number
  notes: string | null
  item?: Pick<Item, 'name' | 'sku'> | null
}

export interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string | null
  status: PurchaseOrderStatus
  order_date: string
  expected_date: string | null
  notes: string | null
  created_at: string
  supplier?: Pick<Supplier, 'name'> | null
  items?: PurchaseOrderItem[]
}

export type InventoryCountStatus = 'open' | 'closed'

export interface InventoryCountItem {
  id: string
  count_id: string
  item_id: string
  system_qty: number
  actual_qty: number
  notes: string | null
  item?: Pick<Item, 'name' | 'sku' | 'unit'> | null
}

export interface InventoryCount {
  id: string
  title: string
  count_date: string
  status: InventoryCountStatus
  notes: string | null
  created_at: string
  items?: InventoryCountItem[]
}

export type InvoiceType = 'purchase' | 'sale'
export type InvoiceStatus = 'draft' | 'paid' | 'cancelled'

export interface InvoiceItem {
  id: string
  invoice_id: string
  item_id: string | null
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface Invoice {
  id: string
  invoice_number: string
  invoice_type: InvoiceType
  party_name: string
  party_id: string | null
  invoice_date: string
  due_date: string | null
  status: InvoiceStatus
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount: number
  total: number
  paid_amount: number
  notes: string | null
  created_at: string
  items?: InvoiceItem[]
}
