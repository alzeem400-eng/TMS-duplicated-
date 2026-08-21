import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Category, Employee, Item, ReturnsScrap, StockIn, StockOut, Supplier } from '../types'

export function useWarehouseData() {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stockIn, setStockIn] = useState<StockIn[]>([])
  const [stockOut, setStockOut] = useState<StockOut[]>([])
  const [returns, setReturns] = useState<ReturnsScrap[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [itemsRes, catsRes, supRes, empRes, inRes, outRes, retRes] = await Promise.all([
      supabase.from('items').select('*, category:categories(*)'),
      supabase.from('categories').select('*'),
      supabase.from('suppliers').select('*'),
      supabase.from('employees').select('*'),
      supabase.from('stock_in').select('*, item:items(name, sku), supplier:suppliers(name)'),
      supabase.from('stock_out').select('*, item:items(name, sku), employee:employees(name)'),
      supabase.from('returns_scrap').select('*, item:items(name, sku)'),
    ])
    setItems((itemsRes.data || []) as Item[])
    setCategories((catsRes.data || []) as Category[])
    setSuppliers((supRes.data || []) as Supplier[])
    setEmployees((empRes.data || []) as Employee[])
    setStockIn((inRes.data || []) as StockIn[])
    setStockOut((outRes.data || []) as StockOut[])
    setReturns((retRes.data || []) as ReturnsScrap[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return {
    items, categories, suppliers, employees, stockIn, stockOut, returns,
    loading, reload: load,
  }
}
