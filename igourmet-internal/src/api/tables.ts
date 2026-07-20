import { api } from '../lib/api'

export type TableStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'SERVING'
  | 'WAIT_PAYMENT'
  | 'DISABLE'

export interface UpcomingReservation {
  id: number
  customer_name: string
  reservation_time: string
  guest_count: number | null
}

export interface DiningTable {
  id: number
  branch_id: number
  section_id: number | null
  section_name: string | null
  table_number: string
  table_name: string | null
  capacity: number
  status: TableStatus
  active_waiter_name: string | null
  active_order_amount: number
  active_order_id?: number | null
  upcoming_reservation: UpcomingReservation | null
}

export interface Section {
  id: number
  branch_id: number
  name: string
  section_type: string | null
  status: string
}

export const tablesApi = {
  async listSections(): Promise<Section[]> {
    const { data } = await api.get('/internal/dining-tables/sections')
    return data.sections
  },
  async list(): Promise<DiningTable[]> {
    const { data } = await api.get('/internal/dining-tables/tables')
    return data.tables
  },
  async create(body: Record<string, unknown>): Promise<DiningTable> {
    const { data } = await api.post('/internal/dining-tables/tables', body)
    return data.table
  },
  async update(id: number, body: Record<string, unknown>): Promise<DiningTable> {
    const { data } = await api.put(`/internal/dining-tables/tables/${id}`, body)
    return data.table
  },
  async changeStatus(id: number, status: TableStatus): Promise<DiningTable> {
    const { data } = await api.patch(`/internal/dining-tables/tables/${id}/status`, { status })
    return data.table
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/internal/dining-tables/tables/${id}`)
  },
}
