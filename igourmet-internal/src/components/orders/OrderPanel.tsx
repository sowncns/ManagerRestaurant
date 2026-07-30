import { useState, useEffect, useMemo } from 'react'
import { Plus, Minus, Send, StickyNote, Check, X, Clock, ReceiptText } from 'lucide-react'
import type { MenuItem } from '../../api/menu'
import type { Order, KitchenStatus, OrderItem } from '../../api/orders'
import { Button, Badge } from '../ui'
import { cn } from '../../lib/cn'

export interface CartLine {
  quantity: number
  note?: string
}

const kitchenMeta: Record<KitchenStatus, { label: string; badge: string }> = {
  WAITING: { label: 'Chờ nấu', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' },
  READY: { label: 'Xong', badge: 'bg-emerald-600 text-white animate-pulse' },
  SERVED: { label: 'Đã phục vụ', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  CANCELLED: { label: 'Đã hủy', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300' },
}

export default function OrderPanel({
  order,
  isPaid,
  cart,
  items,
  busy,
  onInc,
  onDec,
  onEditNote,
  onServe,
  onRequestCancel,
  onSubmit,
}: {
  tableId?: number
  order: Order | null
  isPaid?: boolean
  cart: Record<number, CartLine>
  items: MenuItem[]
  busy: boolean
  onInc: (id: number) => void
  onDec: (id: number) => void
  onEditNote: (id: number) => void
  onServe: (itemId: number) => void
  onRequestCancel: (item: OrderItem) => void
  onSubmit: () => void
}) {
  const cartLines = useMemo(() => {
    return Object.entries(cart).map(([id, line]) => ({ id: Number(id), ...line }))
  }, [cart])

  const cartTotal = useMemo(() => {
    return cartLines.reduce((acc, line) => {
      const it = items.find((i) => i.menu_item_id === line.id)
      return acc + (it ? Number(it.price) * line.quantity : 0)
    }, 0)
  }, [cartLines, items])

  const sentItems = useMemo(() => {
    return [...(order?.items ?? [])]
      .filter((i) => i.kitchen_status !== 'CANCELLED')
      .sort((a, b) => {
        if (a.kitchen_status === 'SERVED' && b.kitchen_status !== 'SERVED') return 1
        if (a.kitchen_status !== 'SERVED' && b.kitchen_status === 'SERVED') return -1
        if (a.kitchen_status === 'READY' && b.kitchen_status !== 'READY') return -1
        if (a.kitchen_status !== 'READY' && b.kitchen_status === 'READY') return 1
        return a.order_item_id - b.order_item_id
      })
  }, [order])

  const empty = sentItems.length === 0 && cartLines.length === 0

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex h-full flex-col justify-between w-full">
      {/* Scrollable Items List */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-0.5 custom-scrollbar">
        {empty && (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            {isPaid ? (
              <>
                <ReceiptText size={40} className="mb-2 text-emerald-500" />
                <Badge variant="success" className="mb-1 text-xs px-3 py-1 font-bold">ĐÃ THANH TOÁN</Badge>
                <p className="text-xs text-slate-400">Khách có thể tiếp tục gọi thêm món</p>
              </>
            ) : (
              <p className="text-xs font-medium text-slate-400 py-6">Chưa có món nào được chọn.</p>
            )}
          </div>
        )}

        {/* Món đã gửi xuống bếp */}
        {sentItems.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Đã gửi bếp ({sentItems.length})
            </div>
            {sentItems.map((it) => {
              const isReady = it.kitchen_status === 'READY'
              const isServed = it.kitchen_status === 'SERVED'
              const diffMs = now - new Date(it.created_at || now).getTime()
              const diffMins = Math.max(0, Math.floor(diffMs / 60000))

              return (
                <div
                  key={it.order_item_id}
                  className={cn(
                    'rounded-xl border p-3 transition-all',
                    isReady
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                      : isServed
                      ? 'border-slate-200 dark:border-slate-800 opacity-75'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {it.item_name} <span className="text-emerald-600 font-extrabold ml-1">× {it.quantity}</span>
                      </div>
                      {it.note && <div className="text-[11px] text-slate-500 mt-0.5">📝 {it.note}</div>}
                      {!isServed && !it.is_mistake && !it.has_pending_cancel && (
                        <div
                          className={cn(
                            'mt-1 flex items-center gap-1 text-[10px] font-semibold',
                            isReady
                              ? 'text-emerald-600'
                              : diffMins >= 15
                              ? 'text-rose-600'
                              : 'text-slate-500',
                          )}
                        >
                          <Clock size={11} />
                          {isReady ? 'Vừa nấu xong' : `${diffMins} phút`}
                        </div>
                      )}
                    </div>

                    {it.is_mistake ? (
                      <Badge variant="danger">Nhầm lẫn</Badge>
                    ) : (
                      it.kitchen_status && (
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', kitchenMeta[it.kitchen_status].badge)}>
                          {kitchenMeta[it.kitchen_status].label}
                        </span>
                      )
                    )}
                  </div>

                  {/* Actions */}
                  {!it.is_mistake && !it.has_pending_cancel && it.kitchen_status !== 'CANCELLED' && (
                    <div className="mt-2 flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {isReady && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 h-8 text-xs font-bold"
                          disabled={busy}
                          onClick={() => onServe(it.order_item_id)}
                        >
                          <Check size={14} /> Phục vụ
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-8 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        disabled={busy}
                        onClick={() => onRequestCancel(it)}
                      >
                        <X size={14} /> {it.kitchen_status === 'WAITING' ? 'Hủy món' : 'Báo nhầm'}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Món mới chờ gửi bếp */}
        {cartLines.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 px-1">
              Đang chọn ({cartLines.length})
            </div>
            {cartLines.map((line) => {
              const it = items.find((i) => i.menu_item_id === line.id)
              return (
                <div
                  key={line.id}
                  className="rounded-xl border border-dashed border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{it?.name}</div>
                    <div className="text-[11px] font-semibold text-emerald-600">
                      {it ? `${(Number(it.price) * line.quantity).toLocaleString('vi-VN')}đ` : ''}
                    </div>
                    {line.note && <div className="text-[10px] text-slate-500 truncate">📝 {line.note}</div>}
                  </div>

                  {/* Stepper Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditNote(line.id)}
                      className={cn(
                        'p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                        line.note && 'text-emerald-600 font-bold',
                      )}
                      title="Ghi chú"
                    >
                      <StickyNote size={15} />
                    </button>
                    <button
                      onClick={() => onDec(line.id)}
                      className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold active:scale-90"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold">{line.quantity}</span>
                    <button
                      onClick={() => onInc(line.id)}
                      className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold active:scale-90 shadow-xs"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar for Handheld Waiter */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {cartLines.length > 0 && (
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-500 font-medium">Tạm tính giỏ hàng:</span>
            <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
              {cartTotal.toLocaleString('vi-VN')}đ
            </span>
          </div>
        )}
        <Button
          variant="primary"
          size="lg"
          className="w-full h-12 text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-[0.98]"
          onClick={onSubmit}
          disabled={busy || cartLines.length === 0}
          loading={busy}
          leftIcon={<Send size={18} />}
        >
          {order ? 'Gửi món mới xuống bếp' : 'Tạo đơn & Gửi bếp'}
        </Button>
      </div>
    </div>
  )
}
