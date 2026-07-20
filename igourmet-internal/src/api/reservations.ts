import { api } from '../lib/api'

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export interface Reservation {
  id: number
  reservation_code: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  guest_count: number | null
  reservation_date: string
  reservation_time: string
  table_id: number | null
  table_number: string | null
  table_name: string | null
  status: ReservationStatus
  note: string | null
  special_request: string | null
  deposit_amount: number | null
  deposit_status: string | null
}

export type AlertState = 'READY' | 'CONFLICT' | 'NO_TABLE' | 'OVERDUE'

export interface ReservationAlert {
  id: number
  customer_name: string
  reservation_date: string
  reservation_time: string
  guest_count: number
  table_number: string | null
  free_tables: number
  minutes_until: number
  state: AlertState
  message: string
}

export interface SuggestedTable {
  id: number
  table_number: string
  capacity: number
}

export interface CreateReservationInput {
  customer_name: string
  customer_phone: string
  customer_email?: string
  guest_count?: number
  reservation_date: string
  reservation_time: string
  table_id?: number
  branch_id?: number
  special_request?: string
  note?: string
}

export const reservationsApi = {
  async list(): Promise<Reservation[]> {
    const { data } = await api.get('/internal/reservations')
    return data.reservations
  },
  async getAlerts(): Promise<ReservationAlert[]> {
    const { data } = await api.get('/internal/reservations/alerts')
    return data.alerts
  },
  async suggestTable(id: number): Promise<SuggestedTable | null> {
    const { data } = await api.get(`/internal/reservations/${id}/suggest-table`)
    return data.table
  },
  async create(body: CreateReservationInput): Promise<Reservation> {
    const { data } = await api.post('/internal/reservations', body)
    return data.reservation
  },
  async update(id: number, body: Partial<CreateReservationInput>): Promise<Reservation> {
    const { data } = await api.put(`/internal/reservations/${id}`, body)
    return data.reservation
  },
  async changeStatus(id: number, status: ReservationStatus): Promise<Reservation> {
    const { data } = await api.patch(`/internal/reservations/${id}/status`, { status })
    return data.reservation
  },
  async assignTable(id: number, table_id: number): Promise<Reservation> {
    const { data } = await api.post(`/internal/reservations/${id}/assign-table`, { table_id })
    return data.reservation
  },
  async checkin(id: number, table_id?: number): Promise<Reservation> {
    const { data } = await api.post(`/internal/reservations/${id}/checkin`, { table_id })
    return data.reservation
  },
  async cancel(id: number): Promise<void> {
    await api.delete(`/internal/reservations/${id}`)
  },
}
