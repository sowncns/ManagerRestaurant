import { api } from '../lib/api'

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'APP' | 'DEBT'

export interface ScanResult {
  type: 'VOUCHER' | 'MEMBER'
  customerId: number
  customerName: string | null
  voucherApplied: string | null
  discountAmount: number
  newTotal: number
}

export interface TableVoucher {
  voucherCode: string
  voucherName: string
  discountAmount: number
  customerId?: number | null
  customerName?: string | null
}

export interface CheckoutIntent {
  invoiceId: number
  invoiceCode: string
  amount: number
  tableId: number
  method: PaymentMethod
  orderCode?: number
  qrCode?: string
  checkoutUrl?: string
}

export interface KiemMonItem {
  itemName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  vat: number
}

export interface KiemMon {
  items: KiemMonItem[]
  subtotal: number
  vatTotal: number
  vatByRate: Record<string, number>
  total: number
}

export const checkoutApi = {
  async getKiemMon(tableId: number): Promise<KiemMon> {
    const { data } = await api.get(`/internal/checkout/table/${tableId}/kiem-mon`)
    return data
  },
  async scan(tableId: number, token: string): Promise<ScanResult> {
    const { data } = await api.post('/internal/checkout/scan', { tableId, token })
    return data.data
  },
  async validateVoucher(
    code: string,
    orderTotal: number,
    tableId: number,
    customerRef?: string,
  ): Promise<TableVoucher> {
    const { data } = await api.post('/internal/checkout/validate-voucher', {
      code,
      orderTotal,
      tableId,
      customerRef,
    })
    return data.data
  },
  async getTableVoucher(tableId: number): Promise<TableVoucher> {
    const { data } = await api.get(`/internal/checkout/table/${tableId}/voucher`)
    return data
  },
  async createInvoice(
    tableId: number,
    paymentMethod: PaymentMethod,
    customerId?: number | null
  ): Promise<{ message: string; intent?: CheckoutIntent }> {
    const { data } = await api.post('/internal/checkout/create-invoice', { tableId, paymentMethod, customerId })
    return data
  },
  async getIntent(tableId: number): Promise<{ hasIntent: boolean; intent?: CheckoutIntent }> {
    const { data } = await api.get(`/internal/checkout/intent/${tableId}`)
    return data
  },
  async cancelIntent(tableId: number): Promise<void> {
    await api.delete(`/internal/checkout/intent/${tableId}`)
  },
  async getLatestInvoice(tableId: number): Promise<any> {
    const { data } = await api.get(`/internal/checkout/table/${tableId}/latest-invoice`)
    return data
  },
  // Thu ngan void 1 mon (nham lan) khoi bill.
  async voidItem(
    orderItemId: number,
    body: { reason_code: string; note?: string },
  ): Promise<{ order_item_id: number; billing_status: 'VOIDED'; voided_amount: number }> {
    const { data } = await api.post(`/internal/checkout/items/${orderItemId}/void`, body)
    return data
  },
  // Thu ngan giam gia rieng 1 mon theo %.
  async discountItem(
    orderItemId: number,
    body: { discount_percent: number; note?: string },
  ): Promise<{ order_item_id: number; discount_percent: number; discounted_amount: number }> {
    const { data } = await api.post(`/internal/checkout/items/${orderItemId}/discount`, body)
    return data
  },
  // Thu ngan giam so luong 1 mon (SL moi < SL hien tai).
  async reduceQuantity(
    orderItemId: number,
    body: { quantity: number; note?: string },
  ): Promise<{ order_item_id: number; quantity: number; removed_amount: number }> {
    const { data } = await api.post(`/internal/checkout/items/${orderItemId}/reduce-quantity`, body)
    return data
  },
}
