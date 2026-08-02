import { api } from '../lib/api'

export interface Supplier {
  id: number
  company_id: number
  supplier_code: string
  supplier_name: string
  phone: string | null
  email: string | null
  address: string | null
  tax_code: string | null
  contact_name: string | null
  note: string | null
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
}

export interface SupplierInput {
  supplier_code: string
  supplier_name: string
  phone?: string
  email?: string
  address?: string
  tax_code?: string
  contact_name?: string
  note?: string
}

export interface ReceiptItem {
  id?: number
  ingredient_id: number
  ingredient_code?: string
  ingredient_name?: string
  unit?: string
  quantity: number | string
  unit_price: number | string
  line_amount?: number | string
  note?: string
}

export interface Receipt {
  id: number
  company_id: number
  branch_id: number | null
  supplier_id: number
  supplier_name: string
  supplier_code: string
  branch_name: string | null
  receipt_code: string
  receipt_date: string
  total_amount: number | string
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED'
  note: string | null
  created_by: number | null
  created_by_name: string | null
  created_at: string
}

export interface ReceiptInput {
  supplier_id: number
  branch_id?: number
  receipt_code?: string
  receipt_date?: string
  note?: string
  items: { ingredient_id: number; quantity: number; unit_price?: number; note?: string }[]
}

const withCompany = (companyId?: number, extra: Record<string, unknown> = {}) => {
  const params: Record<string, unknown> = { ...extra }
  if (companyId) params.companyId = companyId
  return { params }
}

export const procurementApi = {
  // Suppliers
  async listSuppliers(companyId?: number, search?: string): Promise<Supplier[]> {
    const { data } = await api.get('/internal/procurement/suppliers', withCompany(companyId, search ? { search } : {}))
    return data.suppliers
  },
  async getSupplier(id: number, companyId?: number): Promise<Supplier> {
    const { data } = await api.get(`/internal/procurement/suppliers/${id}`, withCompany(companyId))
    return data.supplier
  },
  async createSupplier(body: SupplierInput, companyId?: number): Promise<Supplier> {
    const { data } = await api.post('/internal/procurement/suppliers', { ...body, companyId }, withCompany(companyId))
    return data.supplier
  },
  async updateSupplier(id: number, body: Partial<SupplierInput> & { status?: 'ACTIVE' | 'INACTIVE' }, companyId?: number): Promise<Supplier> {
    const { data } = await api.put(`/internal/procurement/suppliers/${id}`, { ...body, companyId }, withCompany(companyId))
    return data.supplier
  },
  async deleteSupplier(id: number, companyId?: number): Promise<void> {
    await api.delete(`/internal/procurement/suppliers/${id}`, withCompany(companyId))
  },

  // Receipts
  async listReceipts(companyId?: number, supplierId?: number): Promise<Receipt[]> {
    const { data } = await api.get('/internal/procurement/receipts', withCompany(companyId, supplierId ? { supplierId } : {}))
    return data.receipts
  },
  async getReceipt(id: number, companyId?: number): Promise<Receipt & { items: ReceiptItem[] }> {
    const { data } = await api.get(`/internal/procurement/receipts/${id}`, withCompany(companyId))
    return data.receipt
  },
  async createReceipt(body: ReceiptInput, companyId?: number): Promise<number> {
    const { data } = await api.post('/internal/procurement/receipts', { ...body, companyId }, withCompany(companyId))
    return data.receiptId
  },
  async confirmReceipt(id: number, companyId?: number): Promise<void> {
    await api.post(`/internal/procurement/receipts/${id}/confirm`, { companyId }, withCompany(companyId))
  },
  async cancelReceipt(id: number, companyId?: number): Promise<void> {
    await api.delete(`/internal/procurement/receipts/${id}`, withCompany(companyId))
  },
  async getReceiptByCode(code: string, companyId?: number): Promise<Receipt & { items: ReceiptItem[] }> {
    const { data } = await api.get(`/internal/procurement/receipts/by-code/${encodeURIComponent(code)}`, withCompany(companyId))
    return data.receipt
  },
  async importByCode(code: string, companyId?: number, branchId?: number): Promise<Receipt & { items: ReceiptItem[] }> {
    const { data } = await api.post('/internal/procurement/receipts/import-by-code', { code, companyId, branchId })
    return data.receipt
  },
}
