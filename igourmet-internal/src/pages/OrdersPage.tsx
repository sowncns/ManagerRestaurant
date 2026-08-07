import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { ArrowLeft, RefreshCw, Zap, Grid3x3, Utensils, ShoppingCart, QrCode, Camera, X, User, FileText } from 'lucide-react'
import { tablesApi, type DiningTable } from '../api/tables'
import { menuApi, type MenuItem, type Category } from '../api/menu'
import { ordersApi, cancelApi, type Order, type OrderItem, type CancelReason } from '../api/orders'
import { checkoutApi, type VatInfo } from '../api/checkout'

import { errMsg } from '../lib/errMsg'
import { Button, ErrorText, Modal, Input, Badge } from '../components/ui'
import TableGridView from '../components/orders/TableGridView'
import MenuPanel from '../components/orders/MenuPanel'
import OrderPanel, { type CartLine } from '../components/orders/OrderPanel'
import ItemNoteModal from '../components/orders/ItemNoteModal'
import CancelReasonModal from '../components/orders/CancelReasonModal'
import { cn } from '../lib/cn'

type MobileTab = 'tables' | 'menu' | 'cart'

export default function OrdersPage() {
  const [tables, setTables] = useState<DiningTable[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [table, setTable] = useState<DiningTable | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [cart, setCart] = useState<Record<number, CartLine>>({})
  const [noteFor, setNoteFor] = useState<number | null>(null)
  const [cancelItem, setCancelItem] = useState<OrderItem | null>(null)
  const [selectedEmptyTable, setSelectedEmptyTable] = useState<DiningTable | null>(null)
  const [walkinGuests, setWalkinGuests] = useState('1')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  // Quét QR khách hàng (voucher / thành viên)
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanToken, setScanToken] = useState('')
  const [scanRes, setScanRes] = useState('')
  const [scanResult, setScanResult] = useState<{ name: string; type: 'MEMBER' | 'VOUCHER'; voucher?: string } | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [camError, setCamError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })

  // Hóa đơn VAT
  const [vatModalOpen, setVatModalOpen] = useState(false)
  const [vatInfo, setVatInfo] = useState<VatInfo>({ companyName: '', taxCode: '', address: '', email: '' })
  const [vatSaved, setVatSaved] = useState(false)

  // Mobile Handheld Tab state for Waiter
  const [mobileTab, setMobileTab] = useState<MobileTab>('tables')

  // Auto Load Data
  useEffect(() => {
    Promise.all([menuApi.listItems(), menuApi.listCategories()])
      .then(([its, cats]) => {
        setItems(its.filter((i) => i.is_available))
        setCategories(cats)
      })
      .catch((e) => setErr(errMsg(e)))
  }, [])

  const loadTables = useCallback(() => {
    tablesApi
      .list()
      .then(setTables)
      .catch((e) => setErr(errMsg(e)))
  }, [])

  useEffect(() => {
    loadTables()
  }, [loadTables])

  // Đổi bàn -> switch mobile view sang menu, load lại scan (voucher/thành viên) từ backend
  useEffect(() => {
    setCart({})
    setScanResult(null)
    setScanRes('')
    if (!table) {
      setOrder(null)
      setMobileTab('tables')
      return
    }
    setMobileTab('menu')
    ordersApi
      .getActiveForTable(table.id)
      .then(setOrder)
      .catch(() => setOrder(null))
    // Khôi phục thông tin khách đã quét QR (backend vẫn còn lưu)
    checkoutApi.getTableVoucher(table.id)
      .then((v) => {
        if (v?.customerId) {
          setScanResult({
            name: v.customerName || String(v.customerId),
            type: v.voucherCode ? 'VOUCHER' : 'MEMBER',
            voucher: v.voucherCode || undefined,
          })
        }
      })
      .catch(() => { /* bỏ qua nếu chưa có */ })
    // Load VAT đã lưu cho bàn
    checkoutApi.getTableVat(table.id)
      .then((v) => {
        if (v && v.email) {
          setVatInfo(v)
          setVatSaved(true)
        } else {
          setVatInfo({ companyName: '', taxCode: '', address: '', email: '' })
          setVatSaved(false)
        }
      })
      .catch(() => { setVatInfo({ companyName: '', taxCode: '', address: '', email: '' }); setVatSaved(false) })
  }, [table])

  // Cart Stats
  const cartItemCount = useMemo(() => {
    return Object.values(cart).reduce((acc, l) => acc + l.quantity, 0)
  }, [cart])

  // Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && table) {
        setTable(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [table])

  // Handlers
  const handleSelectTable = (t: DiningTable) => {
    setErr('')
    if (t.status === 'AVAILABLE') {
      setSelectedEmptyTable(t)
      setWalkinGuests('1')
    } else {
      setTable(t)
    }
  }

  const handleCreateWalkinOrder = async () => {
    if (!selectedEmptyTable) return
    setBusy(true)
    setErr('')
    try {
      const g = Math.max(1, parseInt(walkinGuests, 10) || 1)
      const res = await ordersApi.create({
        table_id: selectedEmptyTable.id,
        guest_count: g,
      })
      setSelectedEmptyTable(null)
      loadTables()
      const updated = (await tablesApi.list()).find((x) => x.id === selectedEmptyTable.id)
      setTable(updated || selectedEmptyTable)
      setOrder(res)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const handleAddToCart = (item: MenuItem) => {
    if (!table) return
    setCart((prev) => {
      const cur = prev[item.menu_item_id]?.quantity || 0
      return {
        ...prev,
        [item.menu_item_id]: {
          quantity: cur + 1,
          note: prev[item.menu_item_id]?.note,
        },
      }
    })
  }

  const handleIncCart = (id: number) => {
    setCart((prev) => {
      const cur = prev[id]?.quantity || 0
      return { ...prev, [id]: { ...prev[id], quantity: cur + 1 } }
    })
  }

  const handleDecCart = (id: number) => {
    setCart((prev) => {
      const cur = prev[id]?.quantity || 0
      if (cur <= 1) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: { ...prev[id], quantity: cur - 1 } }
    })
  }

  const handleSaveNote = (note: string) => {
    if (noteFor == null) return
    setCart((prev) => {
      if (!prev[noteFor]) return prev
      return { ...prev, [noteFor]: { ...prev[noteFor], note } }
    })
    setNoteFor(null)
  }

  const handleSubmitCart = async () => {
    if (!table) return
    const lines = Object.entries(cart).map(([id, l]) => ({
      menu_item_id: Number(id),
      quantity: l.quantity,
      note: l.note,
    }))
    if (lines.length === 0) return

    setBusy(true)
    setErr('')
    try {
      if (!order) {
        const res = await ordersApi.create({ table_id: table.id, order_items: lines })
        setOrder(res)
      } else {
        const res = await ordersApi.addItems(order.order_id, lines)
        setOrder(res)
      }
      setCart({})
      loadTables()
      setMobileTab('menu')
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const handleServeItem = async (itemId: number) => {
    setBusy(true)
    setErr('')
    try {
      await ordersApi.updateItemKitchenStatus(itemId, 'SERVED')
      if (table) {
        const updated = await ordersApi.getActiveForTable(table.id)
        setOrder(updated)
      }
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmCancelItem = async (reason: CancelReason, notes?: string) => {
    if (!cancelItem || !table || !order) return
    setBusy(true)
    setErr('')
    try {
      await cancelApi.request(order.order_id, cancelItem.order_item_id, {
        reason_code: reason,
        reason_note: notes,
      })
      const updated = await ordersApi.getActiveForTable(table.id)
      setOrder(updated)
      setCancelItem(null)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const noteItemName = noteFor != null ? items.find((i) => i.menu_item_id === noteFor)?.name || '' : ''

  async function handleScan(tokenStr: string) {
    if (!tokenStr.trim() || !table) return
    setBusy(true)
    setScanRes('')
    try {
      const res = await checkoutApi.scan(table.id, tokenStr.trim())
      const label = res.customerName || String(res.customerId)
      setScanRes(`Đã thêm: ${label}${res.voucherApplied ? ' + Voucher' : ''}`)
      setScanResult({
        name: label,
        type: res.voucherApplied ? 'VOUCHER' : 'MEMBER',
        voucher: res.voucherApplied ?? undefined,
      })
      setScanToken('')
      setCameraOn(false)
    } catch (e: any) {
      setScanRes(e.response?.data?.message || e.message || 'Lỗi quét mã')
    } finally {
      setBusy(false)
    }
  }

  // Camera QR reader
  useEffect(() => {
    if (!cameraOn || !scanModalOpen) return
    let cancelled = false
    let readerInstance: any = null

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        readerInstance = reader
        setCamError('')
        await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (_result: any, _error: any) => {
            if (cancelled) return
            if (_result) {
              const value = _result.getText().trim()
              const now = Date.now()
              if (!value || (value === lastScanRef.current.code && now - lastScanRef.current.at < 3000)) return
              lastScanRef.current = { code: value, at: now }
              void handleScan(value)
            }
          },
        )
      } catch (e: any) {
        if (!cancelled) {
          setCamError('Không truy cập được camera. (' + (e.message || '') + ')')
          setCameraOn(false)
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      if (readerInstance) readerInstance.reset()
    }
  }, [cameraOn, scanModalOpen])

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] overflow-hidden">
      {/* Top Mobile Bar - Header */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {table ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTable(null)}
              leftIcon={<ArrowLeft size={15} />}
              className="h-8 text-xs font-bold"
            >
              Đổi bàn
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-slate-100">
              <Zap size={18} className="text-emerald-600" />
              <span>Phục Vụ Waiter POS</span>
            </div>
          )}

          {table && (
            <Badge variant="success" className="text-xs font-extrabold px-2.5 py-0.5">
              {table.table_number}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {scanResult && (
            <div className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1">
              <User size={11} className="text-slate-500 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 max-w-[90px] truncate">
                {scanResult.name}
              </span>
              <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${
                scanResult.type === 'VOUCHER'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-violet-100 text-violet-700'
              }`}>
                {scanResult.type === 'VOUCHER' ? 'VCH' : 'MBR'}
              </span>
            </div>
          )}
          {table && (
            <button
              onClick={() => { setScanToken(''); setScanRes(''); setCameraOn(false); setScanModalOpen(true) }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors active:scale-95 ${
                scanResult
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <QrCode size={13} />
              <span>Quét</span>
            </button>
          )}
          {table && (
            <button
              onClick={() => setVatModalOpen(true)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors active:scale-95 ${
                vatSaved
                  ? 'bg-green-50 border border-green-300 text-green-700 hover:bg-green-100'
                  : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText size={13} />
              <span>VAT</span>
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={loadTables} className="h-8 w-8 p-0">
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>

      <ErrorText>{err}</ErrorText>

      {/* Mobile Tab Switcher Bar for Waiter (Visible on mobile/tablet < lg) */}
      <div className="lg:hidden flex items-center justify-around bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-3 border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setMobileTab('tables')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
            mobileTab === 'tables'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300',
          )}
        >
          <Grid3x3 size={15} />
          <span>Sơ đồ bàn</span>
        </button>

        <button
          disabled={!table}
          onClick={() => setMobileTab('menu')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
            mobileTab === 'menu'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300',
          )}
        >
          <Utensils size={15} />
          <span>Thực đơn</span>
        </button>

        <button
          disabled={!table}
          onClick={() => setMobileTab('cart')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative disabled:opacity-40 disabled:cursor-not-allowed',
            mobileTab === 'cart'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300',
          )}
        >
          <ShoppingCart size={15} />
          <span>Giỏ hàng</span>
          {cartItemCount > 0 && (
            <span className="h-4 w-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-extrabold">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      {/* View Switching (Responsive Desktop 3-Cols / Mobile Single View Tab) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!table || mobileTab === 'tables' ? (
          <div className="h-full overflow-y-auto pr-0.5">
            <TableGridView tables={tables} onSelect={handleSelectTable} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 overflow-hidden">
            {/* Menu View (Desktop Always / Mobile when tab == 'menu') */}
            <div
              className={cn(
                'lg:col-span-7 flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs overflow-hidden',
                mobileTab !== 'menu' && 'hidden lg:flex',
              )}
            >
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <MenuPanel items={items} categories={categories} onAdd={handleAddToCart} />
              </div>
            </div>

            {/* Cart & Order View (Desktop Always / Mobile when tab == 'cart') */}
            <div
              className={cn(
                'lg:col-span-5 flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs overflow-hidden',
                mobileTab !== 'cart' && 'hidden lg:flex',
              )}
            >
              <OrderPanel
                tableId={table.id}
                order={order}
                isPaid={table.status === 'SERVING' && order == null}
                cart={cart}
                items={items}
                busy={busy}
                onInc={handleIncCart}
                onDec={handleDecCart}
                onEditNote={(id) => setNoteFor(id)}
                onServe={handleServeItem}
                onRequestCancel={(item) => setCancelItem(item)}
                onSubmit={handleSubmitCart}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar for Handheld Waiter (Mobile only) */}
      {table && cartItemCount > 0 && mobileTab === 'menu' && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-emerald-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center font-extrabold text-sm">
              {cartItemCount}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold">Đã chọn {cartItemCount} món</span>
              <span className="text-[10px] text-emerald-100 font-medium">Chạm để xem chi tiết & gửi bếp</span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMobileTab('cart')}
            className="bg-white text-emerald-700 font-extrabold text-xs h-9 px-4 rounded-xl shadow-xs"
          >
            Xem giỏ hàng
          </Button>
        </div>
      )}

      {/* Modal Mở bàn cho khách vãng lai */}
      <Modal
        open={selectedEmptyTable != null}
        title={`Mở bàn ${selectedEmptyTable?.table_name || selectedEmptyTable?.table_number}`}
        onClose={() => setSelectedEmptyTable(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedEmptyTable(null)}>
              Hủy
            </Button>
            <Button onClick={handleCreateWalkinOrder} loading={busy}>
              Mở bàn & Bắt đầu order
            </Button>
          </>
        }
      >
        <Input
          label="Số lượng khách vào"
          type="number"
          min={1}
          max={50}
          value={walkinGuests}
          onChange={(e) => setWalkinGuests(e.target.value)}
          autoFocus
        />
      </Modal>

      {/* Modal Ghi chú món */}
      {noteFor != null && (
        <ItemNoteModal
          open={true}
          itemName={noteItemName}
          initialNote={cart[noteFor]?.note || ''}
          onSave={handleSaveNote}
          onClose={() => setNoteFor(null)}
        />
      )}

      {/* Modal Hủy món */}
      {cancelItem != null && (
        <CancelReasonModal
          open={true}
          itemName={cancelItem.item_name}
          onClose={() => setCancelItem(null)}
          onSubmit={handleConfirmCancelItem}
        />
      )}

      {/* Modal Quét mã khách (Voucher / Thành viên) */}
      {scanModalOpen && (
        <Modal open title="Quét mã khách (Voucher / Thành viên)" onClose={() => { setScanModalOpen(false); setCameraOn(false); setScanRes('') }}>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Dán token QR từ app khách"
                value={scanToken}
                onChange={(e) => setScanToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleScan(scanToken)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              <Button onClick={() => setCameraOn(!cameraOn)} variant={cameraOn ? 'danger' : 'secondary'}>
                {cameraOn ? <X size={16} /> : <Camera size={16} />}
              </Button>
              <Button onClick={() => void handleScan(scanToken)} disabled={busy || !scanToken.trim()}>
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
              <div className={scanRes.startsWith('Lỗi') || scanRes.startsWith('Không') ? 'text-red-600 font-medium text-sm' : 'text-emerald-600 font-medium text-sm'}>
                {scanRes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Hóa đơn VAT */}
      {vatModalOpen && (
        <Modal open title="Thông tin xuất hóa đơn VAT" onClose={() => setVatModalOpen(false)}>
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!table || !vatInfo.email.trim()) return
              setBusy(true)
              try {
                await checkoutApi.saveTableVat(table.id, vatInfo)
                setVatSaved(true)
                setVatModalOpen(false)
              } catch (ex) {
                alert(errMsg(ex))
              } finally {
                setBusy(false)
              }
            }}
          >
            <Input label="Tên công ty" value={vatInfo.companyName} onChange={(e) => setVatInfo({ ...vatInfo, companyName: e.target.value })} />
            <Input label="Mã số thuế" value={vatInfo.taxCode} onChange={(e) => setVatInfo({ ...vatInfo, taxCode: e.target.value })} />
            <Input label="Địa chỉ" value={vatInfo.address} onChange={(e) => setVatInfo({ ...vatInfo, address: e.target.value })} />
            <Input label="Email nhận hóa đơn *" type="email" required value={vatInfo.email} onChange={(e) => setVatInfo({ ...vatInfo, email: e.target.value })} />
            <div className="flex gap-2 pt-1">
              {vatSaved && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy}
                  onClick={async () => {
                    if (!table) return
                    setBusy(true)
                    try {
                      await checkoutApi.saveTableVat(table.id, { companyName: '', taxCode: '', address: '', email: '' })
                      setVatInfo({ companyName: '', taxCode: '', address: '', email: '' })
                      setVatSaved(false)
                      setVatModalOpen(false)
                    } catch (ex) {
                      alert(errMsg(ex))
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Xóa
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => setVatModalOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={busy || !vatInfo.email.trim()}>Lưu</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
