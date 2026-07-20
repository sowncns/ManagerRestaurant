import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { BrowserMultiFormatReader } from '@zxing/library'
import { Link } from 'react-router-dom'
import { Printer, RefreshCw, ScanLine, Check, Clock, Camera, X, Ban, History } from 'lucide-react'
import { kitchenApi, cancelApi, itemQrValue, type KitchenQueueItem, type Preorder, type ConfirmedPreorder } from '../api/orders'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, Badge, ErrorText, Modal } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useRealtime } from '../lib/useRealtime'

const POLL_MS = 10000

// Sinh QR dataURL cho tung mon roi mo cua so in (moi mon 1 phieu A8 nho).
async function printTickets(items: KitchenQueueItem[]) {
  if (!items.length) return
  const tickets = await Promise.all(
    items.map(async (it) => {
      const code = itemQrValue(it.id)
      const dataUrl = await QRCode.toDataURL(code, { margin: 1, width: 220 })
      // Ma vach 1D (Code128) de may quet laser sieu thi doc duoc.
      let barcodeUrl = ''
      try {
        const canvas = document.createElement('canvas')
        JsBarcode(canvas, code, { format: 'CODE128', width: 2, height: 48, margin: 0, displayValue: false })
        barcodeUrl = canvas.toDataURL()
      } catch {
        /* bo qua neu khong tao duoc ma vach */
      }
      return { it, dataUrl, barcodeUrl }
    }),
  )
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Phiếu bếp</title>
  <style>
    @page { size: 58mm auto; margin: 4mm; }
    body { font-family: system-ui, sans-serif; margin: 0; }
    .ticket { width: 58mm; text-align: center; padding: 6px 0 14px; page-break-after: always; }
    .tbl { font-size: 20px; font-weight: 800; }
    .name { font-size: 16px; font-weight: 700; margin: 2px 0; }
    .qty { font-size: 15px; }
    .note { font-size: 12px; color: #444; font-style: italic; }
    .code { font-size: 11px; color: #666; margin-top: 2px; letter-spacing: 1px; }
    .qr { width: 150px; height: 150px; }
    .barcode { width: 90%; height: 42px; margin-top: 4px; }
  </style></head><body>
  ${tickets
    .map(
      ({ it, dataUrl, barcodeUrl }) => `<div class="ticket">
        <div class="tbl">Bàn ${it.table_number}</div>
        <div class="name">${escapeHtml(it.item_name)}</div>
        <div class="qty">SL: ${it.quantity}${it.kitchen_type_name ? ' · ' + escapeHtml(it.kitchen_type_name) : ''}</div>
        ${it.note ? `<div class="note">${escapeHtml(it.note)}</div>` : ''}
        <img class="qr" src="${dataUrl}" alt="QR" />
        ${barcodeUrl ? `<img class="barcode" src="${barcodeUrl}" alt="barcode" />` : ''}
        <div class="code">${itemQrValue(it.id)} · ${escapeHtml(it.order_code)}</div>
      </div>`,
    )
    .join('')}
  <script>window.onload = function(){ window.print(); setTimeout(function(){ window.close() }, 300) }</script>
  </body></html>`
  const w = window.open('', '_blank', 'width=420,height=640')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}

// In phieu bep cho don DAT TRUOC khi bep bam Dong y (khong QR, chi danh sach mon + gio hen).
function printPreorderTicket(p: ConfirmedPreorder) {
  const time = p.reservation_time ? String(p.reservation_time).slice(0, 5) : ''
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Phiếu đặt trước</title>
  <style>
    @page { size: 58mm auto; margin: 4mm; }
    body { font-family: system-ui, sans-serif; margin: 0; font-size: 13px; }
    .center { text-align: center; }
    .title { font-size: 16px; font-weight: 800; margin: 4px 0; }
    .sub { font-size: 13px; margin-bottom: 6px; }
    .line { border-bottom: 1px dashed #000; margin: 6px 0; }
    .item { font-weight: 700; margin-top: 4px; }
    .note { font-size: 12px; color: #444; font-style: italic; }
  </style></head><body>
    <div class="center title">MÓN ĐẶT TRƯỚC</div>
    <div class="center sub">Hẹn ${time} · Bàn ${escapeHtml(String(p.table_number ?? ''))}</div>
    <div class="line"></div>
    ${p.items
      .map(
        (it) => `<div class="item">${escapeHtml(it.item_name)} × ${it.quantity}</div>
        ${it.note ? `<div class="note">${escapeHtml(it.note)}</div>` : ''}`,
      )
      .join('')}
    <div class="line"></div>
    <script>window.onload = function(){ window.print(); setTimeout(function(){ window.close() }, 300) }</script>
  </body></html>`
  const w = window.open('', '_blank', 'width=420,height=640')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export default function KitchenPage() {
  const { staff } = useAuth()
  const [items, setItems] = useState<KitchenQueueItem[]>([])
  const [historyItems, setHistoryItems] = useState<KitchenQueueItem[]>([])
  const [preorders, setPreorders] = useState<Preorder[]>([])
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanValue, setScanValue] = useState('')
  const [cancelCount, setCancelCount] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const scanRef = useRef<HTMLInputElement>(null)

  // Quet bang webcam (dung BarcodeDetector san co cua trinh duyet - khong can thu vien).
  const [cameraOn, setCameraOn] = useState(false)
  const [camError, setCamError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })

  async function load() {
    try {
      const [q, h, p] = await Promise.all([kitchenApi.queue(), kitchenApi.history(), kitchenApi.preorders()])
      setItems(q)
      setHistoryItems(h)
      setPreorders(p)
      setErr('')
    } catch (e) {
      setErr(errMsg(e))
    }
    // Dem yeu cau huy dang cho (loc theo loai bep o backend) de canh bao.
    try {
      setCancelCount((await cancelApi.list('PENDING')).length)
    } catch {
      /* khong chan trang bep neu loi dem huy */
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, POLL_MS) // backstop neu SSE mat event
    return () => clearInterval(t)
  }, [])
  // Mon moi vao bep / doi trang thai nau -> refetch ngay (chi chi nhanh cua bep nay).
  useRealtime('/internal/orders/kitchen/stream', load)

  useEffect(() => {
    if (!cameraOn) return
    let cancelled = false
    const reader = new BrowserMultiFormatReader()

    async function start() {
      setCamError('')
      try {
        if (!videoRef.current) return
        
        await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (_result, _error) => {
            if (cancelled) return
            if (_result) {
              const value = _result.getText().trim()
              const now = Date.now()
              // Chong quet trung 1 ma lien tuc (cooldown 3s).
              if (!value || (value === lastScanRef.current.code && now - lastScanRef.current.at < 3000)) return
              lastScanRef.current = { code: value, at: now }
              void doScan(value)
            }
          }
        )
      } catch (e: any) {
        if (!cancelled) {
          setCamError('Không truy cập được camera. Kiểm tra quyền camera của trình duyệt. (' + e.message + ')')
          setCameraOn(false)
        }
      }
    }
    
    start()

    return () => {
      cancelled = true
      reader.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn])

  // May quet ma kieu sieu thi (USB/Bluetooth keyboard-wedge): go rat nhanh + Enter.
  // Lang nghe toan trang -> quet o dau cung duoc, khong can click vao o nhap.
  useEffect(() => {
    let buffer = ''
    let lastAt = 0
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement
      const tag = el?.tagName
      // Neu dang go trong o nhap/textarea/select thi de xu ly binh thuong.
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const now = Date.now()
      if (now - lastAt > 100) buffer = '' // khoang cach lon -> nguoi go tay, bo
      lastAt = now
      if (e.key === 'Enter') {
        if (buffer.length >= 4) void doScan(buffer)
        buffer = ''
        return
      }
      if (e.key.length === 1) buffer += e.key
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const waiting = useMemo(() => items.filter((i) => i.kitchen_status === 'WAITING'), [items])

  async function doScan(code: string) {
    const value = code.trim()
    if (!value) return
    setLoading(true)
    try {
      const r = await kitchenApi.scan(value)
      setMsg(`Đã báo nấu xong món #${r.order_item_id}`)
      setErr('')
      setScanValue('')
      await load()
    } catch (e) {
      setErr(errMsg(e))
      setMsg('')
    } finally {
      setLoading(false)
      scanRef.current?.focus()
    }
  }

  async function confirmPreorder(p: Preorder) {
    setLoading(true)
    try {
      const data = await kitchenApi.confirmPreorder(p.reservation_id)
      printPreorderTicket(data)
      setMsg(`Đã duyệt đơn đặt trước · Bàn ${p.table_number}`)
      setErr('')
      await load()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  async function cancelPreorder(p: Preorder) {
    if (!window.confirm(`Hủy đơn đặt trước của "${p.customer_name}" (Bàn ${p.table_number})? Cọc sẽ được hoàn về ví khách.`)) return
    setLoading(true)
    try {
      await kitchenApi.cancelPreorder(p.reservation_id)
      setMsg('Đã hủy đơn đặt trước và hoàn cọc cho khách')
      setErr('')
      await load()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  async function markReady(id: number) {
    setLoading(true)
    try {
      await kitchenApi.markReady(id)
      setMsg(`Đã báo nấu xong món #${id}`)
      setErr('')
      await load()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={`Bếp${staff?.kitchen_type_name ? ' · ' + staff.kitchen_type_name : ''}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowHistory(true)}>
              <History size={16} /> <span className="hidden sm:inline">Lịch sử quét món</span>
            </Button>
            <Button variant="secondary" onClick={() => printTickets(waiting)}>
              <Printer size={16} /> <span className="hidden sm:inline">In phiếu chờ</span> ({waiting.length})
            </Button>
            <Button variant="secondary" onClick={load}>
              <RefreshCw size={16} /> <span className="hidden sm:inline">Làm mới</span>
            </Button>
          </div>
        }
      />

      {/* Canh bao yeu cau huy: luon hien o tren cung ke ca khi dang quet mon */}
      {cancelCount > 0 && (
        <Link
          to="/cancel-requests"
          className="mb-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100"
        >
          <Ban size={18} className="shrink-0" />
          <span>
            Có <b>{cancelCount}</b> yêu cầu hủy đang chờ xử lý — bấm để xem
          </span>
        </Link>
      )}

      {/* Thanh quet QR: may quet cam tay go ma + Enter, hoac nhap tay */}
      <form
        className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault()
          doScan(scanValue)
        }}
      >
        <ScanLine size={20} className="shrink-0 text-slate-400" />
        <input
          ref={scanRef}
          autoFocus
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          placeholder="Quét QR phiếu món (hoặc nhập mã rồi Enter)"
          className="min-w-[140px] flex-1 border-0 text-base outline-none placeholder:text-slate-400 sm:text-sm"
        />
        <Button
          type="button"
          variant={cameraOn ? 'danger' : 'secondary'}
          onClick={() => setCameraOn((v) => !v)}
        >
          {cameraOn ? <X size={16} /> : <Camera size={16} />} {cameraOn ? 'Tắt camera' : 'Camera'}
        </Button>
        <Button type="submit" disabled={loading || !scanValue.trim()}>
          Báo xong
        </Button>
      </form>

      {cameraOn && (
        <div className="mb-4 flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-black/90 p-3">
          <div className="relative w-full max-w-sm">
            <video ref={videoRef} className="aspect-square w-full rounded-md object-cover" muted playsInline />
            {/* Khung vuong huong dan can giua ma */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-3/5 w-3/5 rounded-lg border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
          <p className="text-xs text-slate-300">Đưa mã vào khung vuông giữa màn hình để báo nấu xong.</p>
        </div>
      )}
      {camError && <ErrorText>{camError}</ErrorText>}

      {err && <ErrorText>{err}</ErrorText>}
      {msg && <p className="mb-3 text-sm text-green-600">{msg}</p>}

      {preorders.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-700">
            <Clock size={16} /> Món đặt trước
            <span className="rounded-full bg-indigo-100 px-2 text-xs">{preorders.length}</span>
          </h2>
          <div className="space-y-2">
            {preorders.map((p) => (
              <div key={p.reservation_id} className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-800">Bàn {p.table_number}</span>
                      <Badge className="bg-indigo-100 text-indigo-800">ĐẶT TRƯỚC</Badge>
                      <span className="flex items-center gap-1 text-sm text-indigo-700">
                        <Clock size={14} /> hẹn {String(p.reservation_time).slice(0, 5)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{p.customer_name}</div>
                    <ul className="mt-1.5 text-sm text-slate-700">
                      {p.items.map((it, i) => (
                        <li key={i}>
                          {it.item_name} <span className="text-slate-500">× {it.quantity}</span>
                          {it.note && <span className="ml-1 text-xs italic text-slate-500">({it.note})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button onClick={() => confirmPreorder(p)} disabled={loading} className="h-8 px-3 text-xs">
                      <Check size={14} className="mr-1" /> Đồng ý
                    </Button>
                    <Button variant="danger" onClick={() => cancelPreorder(p)} disabled={loading} className="h-8 px-3 text-xs">
                      <X size={14} className="mr-1" /> Hủy
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-1">
        <Column title="Chờ nấu" icon={<Clock size={16} />} count={waiting.length}>
          {waiting.map((it) => (
            <KitchenCard key={it.id} it={it} onReady={() => markReady(it.id)} onPrint={() => printTickets([it])} loading={loading} />
          ))}
          {!waiting.length && <Empty>Không có món chờ nấu</Empty>}
        </Column>
      </div>

      {showHistory && (
        <Modal open title="Lịch sử quét (Đã nấu xong 24h)" onClose={() => setShowHistory(false)}>
          <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto w-[600px] max-w-full">
            {historyItems.length === 0 ? (
              <Empty>Chưa có lịch sử</Empty>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Tên món</th>
                    <th className="py-2 px-3">Bàn</th>
                    <th className="py-2 px-3">Gọi lúc</th>
                    <th className="py-2 px-3">Xong lúc</th>
                    <th className="py-2 px-3">In</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {historyItems.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3 font-medium">
                        {it.quantity}x {it.item_name}
                      </td>
                      <td className="py-2 px-3">{it.table_number}</td>
                      <td className="py-2 px-3">{new Date(it.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2 px-3">
                        {it.ready_at ? new Date(it.ready_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2 px-3">
                        <Button variant="secondary" onClick={() => printTickets([it])} className="px-2 py-1 text-xs">In</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setShowHistory(false)}>
              Đóng
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Column({ title, icon, count, children }: { title: string; icon: ReactNode; count: number; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
        {icon} {title} <span className="rounded-full bg-slate-100 px-2 text-xs">{count}</span>
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">{children}</p>
}

function KitchenCard({
  it,
  onReady,
  onPrint,
  loading,
  done,
}: {
  it: KitchenQueueItem
  onReady?: () => void
  onPrint: () => void
  loading: boolean
  done?: boolean
}) {
  const [now, setNow] = useState(Date.now())
  
  useEffect(() => {
    if (done) return
    const t = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(t)
  }, [done])

  const diffMs = done && it.ready_at ? new Date(it.ready_at).getTime() - new Date(it.created_at).getTime() : now - new Date(it.created_at).getTime()
  const diffMins = Math.max(0, Math.floor(diffMs / 60000))

  let colorClass = 'border-slate-200 bg-white'
  let timeColor = 'text-slate-500'
  
  if (done) {
    colorClass = 'border-green-200 bg-green-50/40'
  } else {
    if (diffMins >= 30) {
      colorClass = 'border-red-300 bg-red-50'
      timeColor = 'text-red-600 font-bold'
    } else if (diffMins >= 15) {
      colorClass = 'border-amber-300 bg-amber-50'
      timeColor = 'text-amber-600 font-bold'
    }
  }

  return (
    <div className={`rounded-lg border p-3 transition-colors ${colorClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-800">Bàn {it.table_number}</span>
            {it.kitchen_type_name && <Badge className="bg-orange-100 text-orange-800">{it.kitchen_type_name}</Badge>}
            <span className={`text-sm flex items-center gap-1 ${timeColor}`}>
              <Clock size={14} /> {diffMins} phút
            </span>
          </div>
          <div className="mt-1 text-sm font-medium text-slate-700">
            {it.item_name} <span className="text-slate-500">× {it.quantity}</span>
          </div>
          {it.note && <div className="mt-1 text-xs italic text-slate-600 font-medium">Ghi chú: {it.note}</div>}
          <div className="mt-1.5 text-[11px] uppercase tracking-wide text-slate-400">{it.order_code}</div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button variant="secondary" onClick={onPrint} className="h-8 px-3 text-xs">
            <Printer size={14} className="mr-1" /> In
          </Button>
          {onReady && (
            <Button onClick={onReady} disabled={loading} className="h-8 px-3 text-xs">
              <Check size={14} className="mr-1" /> Xong
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
