import { api } from '../lib/api'

export interface AuditLog {
  id: number
  employee_name: string | null
  action: string
  entity: string
  entity_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export const auditApi = {
  async list(params?: {
    employee_id?: number
    action?: string
    entity?: string
    from_date?: string
    to_date?: string
    page?: number
    limit?: number
  }) {
    const { data } = await api.get('/internal/audit-logs', { params: { limit: 50, ...params } })
    const logs: AuditLog[] = data.logs ?? data
    const pagination = data.pagination as { page: number; limit: number; total: number; totalPages: number } | undefined
    return { logs, pagination }
  },
}
