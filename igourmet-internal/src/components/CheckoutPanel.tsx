import { useCallback, useEffect, useState } from 'react'
import { QrCode, RefreshCw, X, ClipboardList } from 'lucide-react'
import type { DiningTable } from '../api/tables'
import { ordersApi, type Order, type OrderItem } from '../api/orders'
import { checkoutApi, type ScanResult, type CheckoutIntent, type PaymentMethod } from '../api/checkout'
import { printKiemMon } from '../lib/kiemMon'
import { errMsg } from '../lib/errMsg'
import QRCode from 'qrcode'
import { Button, Modal, Input, ErrorText, Badge } from './ui'

function printInvoiceHtml(invoice: any) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Hóa Đơn</title>
  <style>
    @page { size: 58mm auto; margin: 4mm; }
    body { font-family: system-ui, sans-serif; margin: 0; font-size: 13px; color: #000; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title { font-size: 18px; margin: 10px 0; }
    .line { border-bottom: 1px dashed #000; margin: 8px 0; }
    .flex { display: flex; justify-content: space-between; }
    .mb { margin-bottom: 4px; }
    .mt { margin-top: 8px; }
    .item-name { font-weight: 600; margin-top: 4px; }
  </style></head><body>
    <div class="center bold title">iGourmet</div>
    <div class="center mb">HÓA ĐƠN THANH TOÁN</div>
    <div class="line"></div>
    <div class="flex mb"><span>Mã HĐ:</span><span>${invoice.invoice_code}</span></div>
    <div class="flex mb"><span>Bàn:</span><span class="bold">${invoice.table_name || 'Bàn ' + invoice.table_number}</span></div>
    <div class="flex mb"><span>Ngày:</span><span>${new Date(invoice.created_at).toLocaleString('vi-VN')}</span></div>
    <div class="line"></div>
    ${invoice.items?.map((it: any) => `
      <div class="item-name">${it.item_name} ${it.is_mistake ? '(Nhầm lẫn)' : ''}</div>
      <div class="flex">
        <span>${it.quantity} x ${Number(it.unit_price).toLocaleString('vi-VN')}</span>
        <span>${Number(it.total_price).toLocaleString('vi-VN')}</span>
      </div>
    `).join('') || ''}
    <div class="line"></div>
    <div class="flex bold mt" style="font-size: 15px">
      <span>TỔNG CỘNG:</span>
      <span>${Number(invoice.final_amount).toLocaleString('vi-VN')}đ</span>
    </div>
    <div class="center mt" style="margin-top: 20px; font-style: italic">Cảm ơn quý khách và hẹn gặp lại!</div>
    <script>window.onload = function(){ window.print(); setTimeout(function(){ window.close() }, 500) }</script>
  </body></html>`
  const w = window.open('', '_blank', 'width=400,height=600')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}


export default function CheckoutPanel({
  table,
  onClose,
  onPaid,
}: {
  table: DiningTable
  onClose: () => void
  onPaid: () => void
}) {
  const [order, setOrder] = useState<Order | null>(null)
  const [token, setToken] = useState('')
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [intent, setIntent] = useState<CheckoutIntent | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [paidInvoiceId, setPaidInvoiceId] = useState<number | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const loadOrder = useCallback(async () => {
    try {
      setOrder(await ordersApi.getActiveForTable(table.id))
    } catch {
      setOrder(null)
    }
  }, [table.id])

  const loadIntent = useCallback(async () => {
    try {
      const res = await checkoutApi.getIntent(table.id)
      setIntent(res.hasIntent ? res.intent ?? null : null)
    } catch {
      setIntent(null)
    }
  }, [table.id])

  const loadVoucher = useCallback(async () => {
    try {
      const v = await checkoutApi.getTableVoucher(table.id)
      if (v.customerId) {
        setScan({
          type: v.voucherCode ? 'VOUCHER' : 'MEMBER',
          customerId: v.customerId,
          customerName: v.customerName || null,
          voucherApplied: v.voucherCode ? (v.voucherName || v.voucherCode) : null,
          discountAmount: v.discountAmount || 0,
          newTotal: 0, // will be computed below
        })
      }
    } catch {
      // ignore
    }
  }, [table.id])

  useEffect(() => {
    void loadOrder()
    void loadIntent()
    void loadVoucher()
  }, [loadOrder, loadIntent, loadVoucher])

  const allItems = order?.items ?? []
  // Bo mon da huy; mon void hien nhung khong tinh tien.
  const items = allItems.filter((it) => it.kitchen_status !== 'CANCELLED')
  const billable = items.filter((it) => it.billing_status !== 'VOIDED')
  const mistakeUnvoided = items.filter((it) => it.is_mistake && it.billing_status !== 'VOIDED')
  // Tien 1 dong: goc = total_price (hoac don gia x SL), tru % giam rieng cua mon.
  const lineBase = (it: OrderItem) => Number(it.total_price) || Number(it.unit_price) * it.quantity || 0
  const lineNet = (it: OrderItem) => lineBase(it) * (1 - (Number(it.discount_percent) || 0) / 100)
  const total = billable.reduce((s, it) => s + lineNet(it), 0)
  const finalTotal = Math.max(0, total - (scan?.discountAmount || 0))

  async function voidItem(orderItemId: number, name: string) {
    if (!window.confirm(`Void món "${name}" khỏi bill? Khách sẽ không phải trả món này.`)) return
    setBusy(true)
    setErr('')
    try {
      await checkoutApi.voidItem(orderItemId, { reason_code: 'OTHER', note: 'Void tại quầy' })
      await loadOrder()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function discountItem(it: OrderItem) {
    const s = window.prompt(`Giảm bao nhiêu % cho "${it.item_name}"? (0-100)`, String(it.discount_percent || 0))
    if (s == null) return
    const pct = Number(s)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      alert('Nhập % từ 0 đến 100')
      return
    }
    setBusy(true)
    setErr('')
    try {
      await checkoutApi.discountItem(it.order_item_id, { discount_percent: pct })
      await loadOrder()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function reduceQty(it: OrderItem) {
    const s = window.prompt(
      `Số lượng mới cho "${it.item_name}" (hiện ${it.quantity}; nhập nhỏ hơn để giảm, muốn bỏ hết thì Void):`,
      String(it.quantity),
    )
    if (s == null) return
    const q = Number(s)
    if (!Number.isInteger(q) || q < 1 || q >= it.quantity) {
      alert(`Nhập số nguyên từ 1 đến ${it.quantity - 1}`)
      return
    }
    setBusy(true)
    setErr('')
    try {
      await checkoutApi.reduceQuantity(it.order_item_id, { quantity: q })
      await loadOrder()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function doScan() {
    if (!token.trim()) return
    setBusy(true)
    setErr('')
    try {
      const res = await checkoutApi.scan(table.id, token.trim())
      setScan(res)
      setToken('')
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }



  async function handlePrintInvoice() {
    if (!table) return
    setBusy(true)
    try {
      const inv = await checkoutApi.getLatestInvoice(table.id)
      if (inv) printInvoiceHtml(inv)
      else alert('Không tìm thấy hóa đơn gần nhất.')
    } catch (e) {
      alert(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  // KT. Thanh toan (TRANSFER/APP): intent bi xoa khi khach tra xong -> hien modal in hoa don.
  async function checkPaid() {
    setBusy(true)
    try {
      const res = await checkoutApi.getIntent(table.id)
      if (!res.hasIntent) {
        alert('Đã thanh toán thành công!')
        setPaidInvoiceId(intent?.invoiceId || 1) // co gia tri -> hien modal + nut In hoa don
      } else {
        setIntent(res.intent ?? intent)
        alert('Khách chưa hoàn tất thanh toán. Vui lòng chờ khách xác nhận rồi kiểm tra lại.')
      }
    } catch (e) {
      alert(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function pay(method: PaymentMethod) {
    if (
      mistakeUnvoided.length > 0 &&
      !window.confirm(
        `Còn ${mistakeUnvoided.length} món nhầm lẫn chưa void — khách sẽ bị tính tiền các món này. Vẫn thanh toán?`,
      )
    ) {
      return
    }
    setBusy(true)
    setErr('')
    try {
      const res = await checkoutApi.createInvoice(table.id, method, scan?.customerId)
      if (method === 'TRANSFER' && res.intent) {
        setIntent(res.intent)
        const qrString = res.intent.qrCode || res.intent.checkoutUrl
        if (qrString) {
          const url = await QRCode.toDataURL(qrString, { width: 300, margin: 2 })
          setQrDataUrl(url)
          setShowQrModal(true)
        }
      } else if (method === 'CASH' || method === 'DEBT') {
        alert(res.message)
        setPaidInvoiceId(res.intent?.invoiceId || 1) // Just mark as paid to show print button
      } else {
        alert(res.message)
        void loadIntent()
      }
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  // In phieu kiem mon (pre-bill): mon + gia goc + VAT, khong thu tien.
  async function handleKiemMon() {
    setErr('')
    try {
      const data = await checkoutApi.getKiemMon(table.id)
      if (!data.items.length) {
        setErr('Bàn chưa có món nào để kiểm')
        return
      }
      printKiemMon(table.table_name || `Bàn ${table.table_number}`, data)
    } catch (e) {
      setErr(errMsg(e))
    }
  }

  if (paidInvoiceId) {
    return (
      <Modal open title="Thanh toán thành công" onClose={onPaid}>
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="text-green-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-16 w-16 mx-auto mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium text-center">Đã thanh toán hóa đơn</p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={onPaid}>
              Đóng
            </Button>
            <Button onClick={handlePrintInvoice} disabled={busy}>
              In hóa đơn
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header panel */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Thu ngân</h3>
          <p className="truncate text-lg font-bold text-slate-900">
            {table.table_name || `Bàn ${table.table_number}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleKiemMon}
            className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 active:scale-95"
          >
            <ClipboardList size={15} /> Kiểm món
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        {/* Danh sach mon */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">Món trong đơn</h4>
          {items.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có món / không có đơn đang mở.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {items.map((it) => {
                const voided = it.billing_status === 'VOIDED'
                const pct = Number(it.discount_percent) || 0
                const base = lineBase(it)
                const net = lineNet(it)
                return (
                  <li key={it.order_item_id} className="flex flex-col gap-1.5 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className={voided ? 'text-slate-400 line-through' : ''}>
                        {it.item_name} × {it.quantity}
                        {it.is_mistake && !voided && (
                          <Badge className="ml-2 bg-red-100 text-red-700">Nhầm lẫn</Badge>
                        )}
                        {pct > 0 && !voided && (
                          <Badge className="ml-2 bg-amber-100 text-amber-700">−{pct}%</Badge>
                        )}
                        {voided && <Badge className="ml-2 bg-slate-200 text-slate-500">Đã void</Badge>}
                      </span>
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        {pct > 0 && !voided && (
                          <span className="text-slate-400 line-through">{base.toLocaleString('vi-VN')}đ</span>
                        )}
                        <span className={voided ? 'text-slate-400 line-through' : ''}>
                          {net.toLocaleString('vi-VN')}đ
                        </span>
                      </span>
                    </div>
                    {!voided && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                          disabled={busy}
                          onClick={() => discountItem(it)}
                        >
                          Giảm %
                        </button>
                        <button
                          className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                          disabled={busy || it.quantity <= 1}
                          onClick={() => reduceQty(it)}
                        >
                          Giảm SL
                        </button>
                        <Button
                          variant="danger"
                          className="px-2 py-1 text-xs"
                          disabled={busy}
                          onClick={() => voidItem(it.order_item_id, it.item_name)}
                        >
                          Void
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {mistakeUnvoided.length > 0 && (
            <p className="mt-2 text-xs font-medium text-red-600">
              ⚠ Còn {mistakeUnvoided.length} món nhầm lẫn chưa void — xử lý trước khi thu tiền.
            </p>
          )}
        </div>

        {/* Quet QR khach */}
        <div className="rounded-lg bg-slate-50 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <QrCode size={15} /> Quét mã khách (voucher / thành viên)
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder="Dán token QR từ app khách"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1"
            />
            <Button onClick={doScan} disabled={busy}>
              Quét
            </Button>
          </div>
          {scan && (
            <div className="mt-2 text-sm text-slate-700">
              <div>
                Khách: <span className="font-medium">{scan.customerName ?? scan.customerId}</span>{' '}
                <Badge className="bg-slate-200 text-slate-700">{scan.type}</Badge>
              </div>
              {scan.voucherApplied && (
                <div className="text-green-700">
                  Voucher: {scan.voucherApplied} (−{scan.discountAmount.toLocaleString('vi-VN')}đ)
                </div>
              )}
            </div>
          )}


        </div>

        {/* Tong tien */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-sm text-slate-500">Tổng thanh toán</span>
          <span className="text-xl font-semibold text-slate-900">
            {finalTotal.toLocaleString('vi-VN')}đ
          </span>
        </div>

        <ErrorText>{err}</ErrorText>

        {/* Dang cho khach tra (TRANSFER qua PayOS / APP qua vi) */}
        {intent && (intent.method === 'TRANSFER' || intent.method === 'APP') ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            {intent.method === 'TRANSFER' ? (
              <>
                <div className="mb-1 font-semibold text-amber-800">Chuyển khoản PayOS</div>
                <p className="mb-2 text-slate-600">Mời khách quét mã hoặc mở link để thanh toán:</p>
                {intent.checkoutUrl && (
                  <a
                    href={intent.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block break-all text-blue-600 underline"
                  >
                    Link thanh toán (Click để mở)
                  </a>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1 justify-center bg-indigo-600 hover:bg-indigo-700"
                    onClick={async () => {
                      const qrString = intent.qrCode || intent.checkoutUrl
                      if (qrString) {
                        const url = await QRCode.toDataURL(qrString, { width: 300, margin: 2 })
                        setQrDataUrl(url)
                        setShowQrModal(true)
                      }
                    }}
                  >
                    Hiện mã QR
                  </Button>
                  <Button variant="secondary" className="flex-1 justify-center" disabled={busy} onClick={checkPaid}>
                    <RefreshCw size={15} /> KT. Thanh toán
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-1 font-semibold text-amber-800">⏳ Chờ khách xác nhận trên App</div>
                <p className="mb-3 text-slate-600">
                  Đã gửi yêu cầu thanh toán tới ứng dụng của khách. Khách mở app xác nhận bằng PIN, sau đó bấm kiểm tra để in hóa đơn.
                </p>
                <Button variant="secondary" className="w-full justify-center" disabled={busy} onClick={checkPaid}>
                  <RefreshCw size={15} /> KT. Thanh toán
                </Button>
              </>
            )}
            <Button
              variant="danger"
              className="mt-2 w-full justify-center"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm('Hủy giao dịch này để chọn phương thức khác?')) return
                setBusy(true)
                try {
                  await checkoutApi.cancelIntent(table.id)
                  setIntent(null)
                } catch (e) {
                  alert(errMsg(e))
                } finally {
                  setBusy(false)
                }
              }}
            >
              Hủy thanh toán
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button onClick={() => pay('CASH')} disabled={busy}>
              Tiền mặt
            </Button>
            <Button onClick={() => pay('TRANSFER')} disabled={busy}>
              Chuyển khoản
            </Button>
            <Button onClick={() => pay('APP')} disabled={busy}>
              Qua App
            </Button>
            <Button onClick={() => pay('DEBT')} variant="danger" disabled={busy}>
              Ghi nợ
            </Button>
          </div>
        )}
      </div>

      {showQrModal && (
        <Modal open title="Mã QR Thanh Toán" onClose={() => setShowQrModal(false)}>
          <div className="flex flex-col items-center justify-center p-4">
            <p className="mb-4 text-center text-sm text-slate-600">
              Khách hàng có thể dùng App Ngân Hàng quét mã dưới đây để thanh toán:
            </p>
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 object-contain rounded-lg border shadow-sm" />
            )}
            <Button className="mt-6 w-full" onClick={() => setShowQrModal(false)}>
              Đóng
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
