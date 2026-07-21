import { api } from '../lib/api'

export type DiscountType = 'percent' | 'fixed'
export type VoucherStatus = 'active' | 'inactive' | 'expired'
export type ApplyScope = 'all_branches' | 'selected_branches'

export interface Voucher {
  id: number
  company_id: number
  code: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  type: string
  discount_type: DiscountType
  discount_value: number
  min_order_amount: number
  max_discount_amount: number
  start_date: string
  end_date: string
  usage_limit: number
  used_count: number
  per_customer_limit: number
  apply_scope: ApplyScope
  status: VoucherStatus
  image_url?: string | null
  branchIds?: number[]
  // chi co o GET chi tiet
  issued?: number
  used?: number
}

export interface VoucherInput {
  company_id?: number
  code: string
  name: string
  name_en?: string
  description?: string
  discount_type: DiscountType
  discount_value: number
  min_order_amount?: number
  max_discount_amount?: number
  start_date: string
  end_date: string
  usage_limit?: number
  per_customer_limit?: number
  apply_scope?: ApplyScope
  type: string
  status?: VoucherStatus
  image_url?: string
  branchIds?: number[]
}

export interface AssignInput {
  customerIds?: number[]
  rank?: string
  birthMonth?: number
  all_customers?: boolean
  reason?: string
}

export const vouchersApi = {
  async list(params?: { company_id?: number; status?: string }): Promise<Voucher[]> {
    const { data } = await api.get('/internal/vouchers', { params })
    return data.vouchers
  },
  async get(id: number): Promise<Voucher> {
    const { data } = await api.get(`/internal/vouchers/${id}`)
    return data.voucher
  },
  async create(body: VoucherInput): Promise<Voucher> {
    const { data } = await api.post('/internal/vouchers', body)
    return data.voucher
  },
  async update(id: number, body: Partial<VoucherInput>): Promise<Voucher> {
    const { data } = await api.put(`/internal/vouchers/${id}`, body)
    return data.voucher
  },
  async deactivate(id: number): Promise<void> {
    await api.delete(`/internal/vouchers/${id}`)
  },
  async assign(id: number, body: AssignInput): Promise<{ issued: number; skipped: number }> {
    const { data } = await api.post(`/internal/vouchers/${id}/assign`, body)
    return { issued: data.issued, skipped: data.skipped }
  },
}
