import { useEffect, useState, useCallback, useMemo } from 'react'
import { ArrowLeft, RefreshCw, Zap, Grid3x3, Utensils, ShoppingCart } from 'lucide-react'
import { tablesApi, type DiningTable } from '../api/tables'
import { menuApi, type MenuItem, type Category } from '../api/menu'
import { ordersApi, cancelApi, type Order, type OrderItem, type CancelReason } from '../api/orders'

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

  // Đổi bàn -> switch mobile view sang menu
  useEffect(() => {
    setCart({})
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
              {table.table_name || `Bàn ${table.table_number}`}
            </Badge>
          )}
        </div>

        <Button variant="ghost" size="sm" onClick={loadTables} className="h-8 w-8 p-0">
          <RefreshCw size={15} />
        </Button>
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
    </div>
  )
}
