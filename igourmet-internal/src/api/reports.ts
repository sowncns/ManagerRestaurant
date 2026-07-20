import { api } from '../lib/api'

export interface DashboardData {
  revenue_7d: { period: string; revenue: number }[]
  today: {
    date: string
    revenue: number
    invoice_count: number
    total_orders: number
    completed_orders: number
    total_guests: number
  }
  month: { from: string; revenue: number; invoice_count: number }
  top_items: { menu_item_id: number; item_name: string; total_quantity: number | string; total_revenue: number | string }[]
  table_status: { status: string; count: number | string }[]
}

export interface AdminOverview {
  system: { companies: number; branches: number; employees: number }
  companies: {
    id: number
    name: string
    status: string
    branches: number
    employees: number
    revenue_month: number
    revenue_prev: number
  }[]
}

export const reportsApi = {
  async dashboard(companyId?: number | '', branchId?: number | ''): Promise<DashboardData> {
    const params: any = {}
    if (companyId) params.company_id = companyId
    if (branchId) params.branch_id = branchId
    const { data } = await api.get('/internal/reports/dashboard', { params })
    return data.data
  },
  async adminOverview(): Promise<AdminOverview> {
    const { data } = await api.get('/internal/reports/admin-overview')
    return data.data
  },
}
