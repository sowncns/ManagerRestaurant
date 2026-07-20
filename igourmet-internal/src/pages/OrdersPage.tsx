import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ReceiptText, RefreshCw, Clock, DoorOpen, ClipboardList, X, QrCode, Camera } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { tablesApi, type DiningTable } from '../api/tables'
import { menuApi, type MenuItem, type Category } from '../api/menu'
import { ordersApi, cancelApi, type Order, type KitchenStatus, type OrderItem, type CancelReason } from '../api/orders'
import { reservationsApi } from '../api/reservations'
import { checkoutApi } from '../api/checkout'
import { printKiemMon } from '../lib/kiemMon'
import { errMsg } from '../lib/errMsg'
import QRCode from 'qrcode'
import { Button, ErrorText, Modal, Input } from '../components/ui'
import TableGridView from '../components/orders/TableGridView'
import MenuPanel from '../components/orders/MenuPanel'
import OrderPanel, { type CartLine } from '../components/orders/OrderPanel'
import ItemNoteModal from '../components/orders/ItemNoteModal'
import CancelReasonModal from '../components/orders/CancelReasonModal'

const POLL_MS = 15000

export default function OrdersPage() {
  const [tables, setTables] = useState<DiningTable[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [table, setTable] = useState<DiningTable | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [cart, setCart] = useState<Record<number, CartLine>>({})
  const [noteFor, setNoteFor] = useState<number | null>(null)
  const [cancelItem, setCancelItem] = useState<OrderItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedEmptyTable, setSelectedEmptyTable] = useState<DiningTable | null>(null)
  const [walkinGuests, setWalkinGuests] = useState('1')
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [scanToken, setScanToken] = useState('')
  const [scanRes, setScanRes] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [camError, setCamError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [intentMethod, setIntentMethod] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  // Tai du lieu nen (menu + category) 1 lan.
  useEffect(() => {
    Promise.all([menuApi.listItems(), menuApi.listCategories()])
      .then(([its, cats]) => {
        setItems(its.filter((i) => i.is_available))
        setCategories(cats)
      })
      .catch((e) => setErr(errMsg(e)))
  }, [])

  function loadTables() {
    tablesApi
      .list()
      .then(setTables)
      .catch((e) => setErr(errMsg(e)))
  }
  useEffect(loadTables, [])

  // Doi bàn -> reset trang thai + tai don active.
  useEffect(() => {
    setCart({})
    if (!table) {
      setOrder(null)
      return
    }
    ordersApi
      .getActiveForTable(table.id)
      .then(setOrder)
      .catch(() => setOrder(null))
      
    if (table.status === 'WAIT_PAYMENT') {
      checkoutApi.getIntent(table.id)
        .then(res => setIntentMethod(res.intent?.method || null))
        .catch(() => setIntentMethod(null))
    } else {
      setIntentMethod(null)
    }

    // Khoi phuc thong tin khach da quet (neu co)
    checkoutApi.getTableVoucher(table.id)
      .then(res => {
        if (res.customerId) {
          setScanRes(`Đã thêm: ${res.customerName || res.customerId} ${res.voucherCode ? '+ Voucher' : ''}`)
        } else {
          setScanRes('')
        }
      })
      .catch(() => setScanRes(''))
  }, [table])

  // Polling trang thai bep khi dang o màn gọi món.
  useEffect(() => {
    if (!table) return
    pollRef.current = window.setInterval(() => {
      ordersApi
        .getActiveForTable(table.id)
        .then(setOrder)
        .catch(() => {})
    }, POLL_MS)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [table])

  async function handleScan(tokenStr: string) {
    if (!tokenStr.trim() || !table) return
    setBusy(true)
    setScanRes('')
    try {
      const res = await checkoutApi.scan(table.id, tokenStr.trim())
      setScanRes(`Đã thêm: ${res.customerName || res.customerId} ${res.voucherApplied ? `+ Voucher` : ''}`)
      setScanToken('')
      setCameraOn(false) // tắt cam sau khi quét thành công
    } catch (e: any) {
      setScanRes(e.response?.data?.message || e.message || 'Lỗi quét mã')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!cameraOn || !scanModalOpen) return
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
              if (!value || (value === lastScanRef.current.code && now - lastScanRef.current.at < 3000)) return
              lastScanRef.current = { code: value, at: now }
              void handleScan(value)
            }
          }
        )
      } catch (e: any) {
        if (!cancelled) {
          setCamError('Không truy cập được camera. (' + e.message + ')')
          setCameraOn(false)
        }
      }
    }
    
    start()

    return () => {
      cancelled = true
      reader.reset()
    }
  }, [cameraOn, scanModalOpen])

  async function refreshOrder() {
    if (!table) return
    try {
      setOrder(await ordersApi.getActiveForTable(table.id))
    } catch {
      /* giu don cu */
    }
  }

  const inc = (id: number) =>
    setCart((c) => ({ ...c, [id]: { ...c[id], quantity: (c[id]?.quantity ?? 0) + 1 } }))
  const dec = (id: number) =>
    setCart((c) => {
      const n = (c[id]?.quantity ?? 0) - 1
      const next = { ...c }
      if (n <= 0) delete next[id]
      else next[id] = { ...next[id], quantity: n }
      return next
    })
  const setNote = (id: number, note: string) =>
    setCart((c) => ({ ...c, [id]: { ...c[id], note: note || undefined } }))

  async function submit() {
    if (!table) return
    const entries = Object.entries(cart).map(([id, line]) => ({
      menu_item_id: Number(id),
      quantity: line.quantity,
      note: line.note,
    }))
    if (entries.length === 0) return
    setBusy(true)
    setErr('')
    try {
      if (order) await ordersApi.addItems(order.order_id, entries)
      else await ordersApi.create({ table_id: table.id, order_items: entries })
      setCart({})
      await refreshOrder()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function setItemStatus(itemId: number, status: KitchenStatus) {
    setBusy(true)
    setErr('')
    try {
      await ordersApi.updateItemKitchenStatus(itemId, status)
      await refreshOrder()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function requestCancel(reason: CancelReason, note: string) {
    if (!order || !cancelItem) return
    setBusy(true)
    setErr('')
    try {
      const res = await cancelApi.request(order.order_id, cancelItem.order_item_id, {
        reason_code: reason,
        reason_note: note || undefined,
      })
      await refreshOrder()
      alert(
        res.is_mistake
          ? 'Món đã nấu — đã đánh dấu nhầm lẫn, thu ngân sẽ bỏ khỏi bill khi thanh toán.'
          : 'Đã gửi yêu cầu hủy xuống bếp, chờ bếp duyệt.',
      )
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const cartCount = Object.values(cart).reduce((s, l) => s + l.quantity, 0)
  const noteItemName = noteFor ? (items.find((i) => i.menu_item_id === noteFor)?.name ?? '') : ''

  function handleSelectTable(t: DiningTable) {
    if (t.status === 'AVAILABLE' || t.status === 'RESERVED') {
      setWalkinGuests(String(t.capacity))
      setSelectedEmptyTable(t)
    } else {
      setTable(t)
    }
  }

  async function openEmptyTable() {
    if (!selectedEmptyTable) return
    setBusy(true)
    setErr('')
    try {
      await ordersApi.create({ table_id: selectedEmptyTable.id, guest_count: Number(walkinGuests) })
      setTable(selectedEmptyTable)
      setSelectedEmptyTable(null)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function cancelEmptyTable() {
    if (!table) return
    if (!confirm('Bạn có chắc chắn muốn hủy bàn này? Bàn sẽ trở về trạng thái trống.')) return
    setBusy(true)
    setErr('')
    try {
      await tablesApi.changeStatus(table.id, 'AVAILABLE')
      setTable(null)
      loadTables()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  // ----- Màn chọn bàn -----
  if (!table) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Chọn bàn</h1>
          <Button variant="secondary" onClick={loadTables}>
            <RefreshCw size={15} /> Làm mới
          </Button>
        </div>
        <ErrorText>{err}</ErrorText>
        <TableGridView 
          tables={tables} 
          onSelect={handleSelectTable} 
          onCheckin={async (id) => {
            if (!confirm('Bạn muốn nhận khách cho phiếu đặt này?')) return
            try {
              setErr('')
              await reservationsApi.checkin(id)
              loadTables()
            } catch (e) {
              setErr(errMsg(e))
            }
          }}
        />

        {selectedEmptyTable && (
          <Modal open title={`Mở bàn ${selectedEmptyTable.table_number}`} onClose={() => setSelectedEmptyTable(null)}>
            <div className="flex flex-col gap-5">
              {selectedEmptyTable.upcoming_reservation && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="mb-2 text-xs font-semibold text-blue-800">Khách đặt trước</div>
                  <div className="flex items-center justify-between gap-2 rounded-md bg-white p-2 shadow-sm">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-500" />
                      {selectedEmptyTable.upcoming_reservation.reservation_time?.slice(0, 5)} · {selectedEmptyTable.upcoming_reservation.customer_name}
                    </span>
                    <Button 
                      className="px-3 py-1.5 text-xs" 
                      onClick={async () => {
                        setBusy(true)
                        try {
                          await reservationsApi.checkin(selectedEmptyTable.upcoming_reservation!.id)
                          setTable(selectedEmptyTable)
                          setSelectedEmptyTable(null)
                        } catch (e) {
                          setErr(errMsg(e))
                        } finally {
                          setBusy(false)
                        }
                      }}
                      disabled={busy}
                    >
                      Nhận khách
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50/50 p-3">
                <div className="text-xs font-semibold text-green-800">Khách vãng lai</div>
                <Input 
                  label="Số lượng khách" 
                  type="number" 
                  value={walkinGuests} 
                  onChange={(e) => setWalkinGuests(e.target.value)} 
                  autoFocus 
                />
                <Button 
                  onClick={openEmptyTable} 
                  disabled={busy || !walkinGuests} 
                  className="w-full justify-center bg-green-600 hover:bg-green-700"
                >
                  <DoorOpen size={16} /> Mở bàn & Gọi món
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    )
  }

  async function handleKiemMon() {
    if (!table) return
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

  // ----- Màn gọi món -----
  const isTablePaid = table?.status === 'SERVING' && table.active_order_id == null
  const panel = (
    <OrderPanel
      tableId={table?.id}
      order={order}
      isPaid={isTablePaid}
      cart={cart}
      items={items}
      busy={busy}
      onInc={inc}
      onDec={dec}
      onEditNote={setNoteFor}
      onServe={(id) => setItemStatus(id, 'SERVED')}
      onRequestCancel={setCancelItem}
      onSubmit={submit}
    />
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-9rem)]">
      <div className="sticky top-0 z-40 -mx-4 mb-3 flex items-center gap-2 bg-white/80 px-4 py-3 backdrop-blur-xl border-b border-slate-100/50 shadow-[0_4px_20px_rgb(0,0,0,0.02)] md:static md:mx-0 md:mb-5 md:bg-transparent md:px-0 md:border-none md:shadow-none">
        <button 
          onClick={() => setTable(null)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        
        <div className="flex flex-1 flex-col overflow-hidden px-1">
          <h1 className="truncate text-[17px] font-bold tracking-tight text-slate-900 md:text-xl">
            {table.table_name || `Bàn ${table.table_number}`}
          </h1>
          {order && (
            <span className="text-[12px] font-semibold text-indigo-600">
              Đơn #{order.order_id}
            </span>
          )}
          {scanRes && !scanRes.startsWith('Lỗi') && (
            <span className="text-[12px] font-semibold text-emerald-600">
              {scanRes}
            </span>
          )}
        </div>

        {order?.items && order.items.some(it => it.kitchen_status !== 'CANCELLED') && (
          <div className="flex shrink-0 gap-1.5 sm:gap-2">
            <button 
              onClick={() => { setScanToken(''); setScanRes(''); setCameraOn(false); setScanModalOpen(true); }}
              className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 active:scale-95"
            >
              <QrCode size={14} className="sm:w-[15px] sm:h-[15px]" /> 
              <span className="hidden sm:inline">Quét mã</span>
              <span className="sm:hidden">Quét</span>
            </button>
            <button 
              onClick={handleKiemMon}
              className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-indigo-50 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 active:scale-95"
            >
              <ClipboardList size={14} className="sm:w-[15px] sm:h-[15px]" />
              <span className="hidden sm:inline">Kiểm món</span>
              <span className="sm:hidden">Kiểm</span>
            </button>
            {table.status === 'WAIT_PAYMENT' && intentMethod === 'TRANSFER' && (
              <button 
                onClick={async () => {
                  setBusy(true)
                  try {
                    const res = await checkoutApi.getIntent(table.id)
                    if (res.intent) {
                       const qrString = res.intent.qrCode || res.intent.checkoutUrl
                       if (qrString) {
                         const url = await QRCode.toDataURL(qrString, { width: 300, margin: 2 })
                         setQrDataUrl(url)
                         setShowQrModal(true)
                       }
                    } else {
                       alert('Khách đã thanh toán hoặc đã hủy giao dịch.')
                       setTable(null)
                       loadTables()
                    }
                  } catch(e) {
                    alert(errMsg(e))
                  } finally {
                    setBusy(false)
                  }
                }}
                className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-blue-50 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 active:scale-95"
              >
                <QrCode size={14} className="sm:w-[15px] sm:h-[15px]" />
                <span className="hidden sm:inline">QR Thanh toán</span>
                <span className="sm:hidden">Mã QR</span>
              </button>
            )}
          </div>
        )}

        {(!order?.items || order.items.every(it => it.kitchen_status === 'CANCELLED')) && (
          <button 
            disabled={busy}
            onClick={cancelEmptyTable}
            className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 active:scale-95 disabled:opacity-50"
          >
            Hủy bàn
          </button>
        )}
      </div>
      <ErrorText>{err}</ErrorText>

      <div className="flex min-h-0 flex-1 gap-6">
        {/* Menu */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-0">
          <MenuPanel items={items} categories={categories} onAdd={(it) => inc(it.menu_item_id)} />
        </div>
        {/* Panel don co dinh (tablet tro len) */}
        <div className="hidden w-80 shrink-0 md:block">{panel}</div>
      </div>

      {/* Thanh duoi mo bottom-sheet (dien thoai) */}
      <div className="fixed inset-x-0 bottom-16 z-40 flex items-center justify-center p-4 md:hidden">
        <button 
          className="group relative flex w-[90%] max-w-sm items-center justify-between overflow-hidden rounded-[2rem] bg-slate-900 px-5 py-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 active:scale-95" 
          onClick={() => setSheetOpen(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
          <div className="relative flex items-center gap-3 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
              <ReceiptText size={16} />
            </div>
            <span className="text-[15px] font-semibold tracking-wide">Xem đơn</span>
          </div>
          {cartCount > 0 && (
            <div className="relative flex items-center justify-center rounded-full bg-indigo-500 px-3 py-1 text-[13px] font-bold text-white shadow-inner">
              {cartCount} món mới
            </div>
          )}
        </button>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSheetOpen(false)}
          ></div>
          
          {/* Sheet */}
          <div className="relative z-10 flex flex-col rounded-t-[1.75rem] bg-white pb-safe shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
              <h3 className="text-[17px] font-bold text-slate-900">Đơn hiện tại</h3>
              <button 
                onClick={() => setSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="h-[70vh] overflow-y-auto p-4 pt-2 pb-8">{panel}</div>
          </div>
        </div>
      )}

      <ItemNoteModal
        open={noteFor !== null}
        itemName={noteItemName}
        initialNote={noteFor ? (cart[noteFor]?.note ?? '') : ''}
        onClose={() => setNoteFor(null)}
        onSave={(note) => noteFor && setNote(noteFor, note)}
      />

      <CancelReasonModal
        open={cancelItem !== null}
        itemName={cancelItem?.item_name ?? ''}
        onClose={() => setCancelItem(null)}
        onSubmit={requestCancel}
      />

      {scanModalOpen && (
        <Modal open title="Quét mã khách (Voucher/Member)" onClose={() => { setScanModalOpen(false); setCameraOn(false); }}>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Dán token QR từ app khách"
                value={scanToken}
                onChange={(e) => setScanToken(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              <Button onClick={() => setCameraOn(!cameraOn)} variant={cameraOn ? "danger" : "secondary"}>
                {cameraOn ? <X size={16} /> : <Camera size={16} />}
              </Button>
              <Button onClick={() => handleScan(scanToken)} disabled={busy || !scanToken.trim()}>
                Quét
              </Button>
            </div>
            {cameraOn && (
              <div className="mb-2 flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-black/90 p-3">
                <div className="relative w-full max-w-sm">
                  <video ref={videoRef} className="aspect-square w-full rounded-md object-cover" muted playsInline />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-3/5 w-3/5 rounded-lg border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  </div>
                </div>
                <p className="text-xs text-slate-300">Đưa mã QR khách hàng vào khung vuông</p>
              </div>
            )}
            {camError && <ErrorText>{camError}</ErrorText>}
            {scanRes && (
              <div className={scanRes.startsWith('Lỗi') ? "text-red-600 font-medium text-sm" : "text-emerald-600 font-medium text-sm"}>
                {scanRes}
              </div>
            )}
          </div>
        </Modal>
      )}

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
