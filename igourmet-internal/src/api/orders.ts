import { api } from '../lib/api'

export interface OrderItemInput {
  menu_item_id: number
  quantity: number
  note?: string
}

// Da bo COOKING: WAITING (cho nau) -> READY (nau xong, quet QR) -> SERVED -> CANCELLED
export type KitchenStatus = 'WAITING' | 'READY' | 'SERVED' | 'CANCELLED'

export interface OrderItem {
  order_item_id: number
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  note?: string | null
  kitchen_status?: KitchenStatus
  is_mistake?: boolean
  has_pending_cancel?: boolean
  billing_status?: 'BILLABLE' | 'VOIDED'
  created_at?: string
}

export type CancelReason = 'WRONG_ORDER' | 'OUT_OF_STOCK' | 'CUSTOMER_CHANGE' | 'QUALITY' | 'OTHER'
export type CancelRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'

export interface CancelRequest {
  cancel_request_id: number
  order_id: number
  order_item_id: number
  item_name: string
  table_number: string
  table_name: string | null
  order_code: string
  quantity: number
  requested_qty: number
  reason_code: CancelReason
  reason_note: string | null
  item_status_at_request: string
  current_kitchen_status: string
  kitchen_type_id?: number | null
  kitchen_type_name?: string | null
  status: CancelRequestStatus
  requested_by_name: string | null
  decision_note: string | null
  created_at: string
}

export interface Order {
  order_id: number
  table_id: number
  status: string
  note: string | null
  items?: OrderItem[]
}

export const ordersApi = {
  async create(body: { table_id: number; guest_count?: number; note?: string; order_items?: OrderItemInput[] }): Promise<Order> {
    const { data } = await api.post('/internal/orders', body)
    return data.order ?? data
  },
  async getActiveForTable(tableId: number): Promise<Order | null> {
    const { data } = await api.get(`/internal/orders/table/${tableId}/active`)
    if (data.message === "No active order for this table" || !data.order_id && !data.order?.order_id) {
      return null
    }
    return data.order ?? data
  },
  async addItems(orderId: number, items: OrderItemInput[]): Promise<Order> {
    const { data } = await api.put(`/internal/orders/${orderId}/items`, { items })
    return data.order ?? data
  },
  async updateItemKitchenStatus(itemId: number, status: KitchenStatus): Promise<void> {
    await api.patch(`/internal/orders/items/${itemId}/kitchen-status`, { status })
  },
}

// ===== BEP (Kitchen) =====
export interface KitchenQueueItem {
  id: number // order_item_id
  order_id: number
  menu_item_id: number
  item_name: string
  quantity: number
  kitchen_status: KitchenStatus
  note: string | null
  created_at: string
  ready_at?: string | null
  order_code: string
  table_number: string
  kitchen_type_id: number | null
  kitchen_type_code: string | null
  kitchen_type_name: string | null
}

// Gia tri QR in tren phieu tung mon. Bep quet lai chuoi nay de bao nau xong.
export function itemQrValue(orderItemId: number): string {
  return `OIQR-${orderItemId}`
}

// Don dat truoc da gan ban, cho bep duyet.
export interface PreorderItem {
  item_name: string
  quantity: number
  note: string | null
}
export interface Preorder {
  order_id: number
  reservation_id: number
  table_id: number
  table_number: string
  reservation_date: string
  reservation_time: string
  customer_name: string
  items: PreorderItem[]
}

export interface ConfirmedPreorder {
  order_id: number
  table_number: string | null
  reservation_time: string | null
  items: { item_name: string; quantity: number; note: string | null }[]
}

export const kitchenApi = {
  // Hang doi bep (backend tu loc theo loai bep cua nhan vien dang dang nhap).
  async queue(): Promise<KitchenQueueItem[]> {
    const { data } = await api.get('/internal/orders/kitchen/queue')
    return data.items
  },
  // Don dat truoc da gan ban (cho bep duyet).
  async preorders(): Promise<Preorder[]> {
    const { data } = await api.get('/internal/orders/kitchen/preorders')
    return data.items
  },
  // Dong y don dat truoc -> mon xuong bep, tra data de in phieu.
  async confirmPreorder(reservationId: number): Promise<ConfirmedPreorder> {
    const { data } = await api.post(`/internal/orders/kitchen/preorders/${reservationId}/confirm`)
    return data
  },
  // Huy don dat truoc (khach khong den) -> hoan coc.
  async cancelPreorder(reservationId: number): Promise<void> {
    await api.post(`/internal/orders/kitchen/preorders/${reservationId}/cancel`)
  },
  // Lich su mon bep da lam.
  async history(): Promise<KitchenQueueItem[]> {
    const { data } = await api.get('/internal/orders/kitchen/history')
    return data.items
  },
  // Quet QR phieu mon -> danh dau READY (nau xong) + tru kho.
  async scan(qrCode: string): Promise<{ order_item_id: number; from: string; to: string }> {
    const { data } = await api.post('/internal/orders/kitchen/scan', { qrCode })
    return data
  },
  // Danh dau 1 mon nau xong (khong qua QR, vd bam tay).
  async markReady(itemId: number): Promise<void> {
    await api.patch(`/internal/orders/items/${itemId}/kitchen-status`, { status: 'READY' })
  },
}

export const cancelApi = {
  // Phuc vu gui yeu cau huy 1 mon. Neu mon da nau -> backend tra is_mistake=true.
  async request(
    orderId: number,
    orderItemId: number,
    body: { reason_code: CancelReason; reason_note?: string; requested_qty?: number },
  ): Promise<{ cancel_request_id: number; status: CancelRequestStatus; is_mistake: boolean }> {
    const { data } = await api.post(
      `/internal/orders/${orderId}/items/${orderItemId}/cancel-request`,
      body,
    )
    return data
  },
  async list(status?: CancelRequestStatus): Promise<CancelRequest[]> {
    const { data } = await api.get('/internal/cancel-requests', { params: status ? { status } : undefined })
    return data.items
  },
  async accept(id: number): Promise<void> {
    await api.patch(`/internal/cancel-requests/${id}/accept`)
  },
  async reject(id: number, decision_note?: string): Promise<void> {
    await api.patch(`/internal/cancel-requests/${id}/reject`, { decision_note })
  },
  async withdraw(id: number): Promise<void> {
    await api.patch(`/internal/cancel-requests/${id}/withdraw`)
  },
}
