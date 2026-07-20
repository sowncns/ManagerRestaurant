import { useState, useEffect } from 'react'
import { Plus, Minus, Send, StickyNote, Check, X, AlertTriangle, Clock, ReceiptText } from 'lucide-react'
import type { MenuItem } from '../../api/menu'
import type { Order, KitchenStatus, OrderItem } from '../../api/orders'
import { Button, Badge } from '../ui'
import { cn } from '../../lib/cn'

export interface CartLine {
  quantity: number
  note?: string
}

const kitchenMeta: Record<KitchenStatus, { label: string; cls: string }> = {
  WAITING: { label: 'Chờ nấu', cls: 'bg-slate-100 text-slate-600' },
  READY: { label: 'Xong', cls: 'bg-green-100 text-green-700' },
  SERVED: { label: 'Đã phục vụ', cls: 'bg-emerald-50 text-emerald-600' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-red-100 text-red-700' },
}

export default function OrderPanel({
  tableId: _tableId,
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
  const cartLines = Object.entries(cart).map(([id, line]) => ({ id: Number(id), ...line }))
  const sentItems = [...(order?.items ?? [])]
    .filter((i) => i.kitchen_status !== 'CANCELLED')
    .sort((a, b) => {
      // Dua SERVED xuong cuoi cung
      if (a.kitchen_status === 'SERVED' && b.kitchen_status !== 'SERVED') return 1
      if (a.kitchen_status !== 'SERVED' && b.kitchen_status === 'SERVED') return -1
      
      // READY len dau
      if (a.kitchen_status === 'READY' && b.kitchen_status !== 'READY') return -1
      if (a.kitchen_status !== 'READY' && b.kitchen_status === 'READY') return 1
      
      // Con lai giu nguyen thu tu (hoac xep theo id)
      return a.order_item_id - b.order_item_id
    })
  const empty = sentItems.length === 0 && cartLines.length === 0

  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex h-full flex-col">


      <div className="flex-1 space-y-2 overflow-y-auto">
        {empty && (
          <div className="flex flex-col items-center justify-center p-4 text-center py-6">
            {isPaid ? (
              <>
                <ReceiptText size={48} className="mb-3 text-teal-200" />
                <Badge className="mb-2 bg-teal-100 text-teal-700 font-semibold text-[13px] px-3 py-1">ĐÃ THANH TOÁN</Badge>
                <p className="mt-1 text-sm text-slate-400">Khách có thể tiếp tục gọi thêm món</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">Chưa có món nào</p>
            )}
          </div>
        )}

        {/* Mon da gui bep */}
        {sentItems.map((it) => {
          const isReady = it.kitchen_status === 'READY'
          const isServed = it.kitchen_status === 'SERVED'
          const diffMs = now - new Date(it.created_at || now).getTime()
          const diffMins = Math.max(0, Math.floor(diffMs / 60000))
          
          let cardCls = 'border-slate-200/80 bg-white'
          if (isReady) cardCls = 'border-green-300 bg-green-50/70'
          else if (isServed) cardCls = 'border-emerald-100 bg-emerald-50/40 opacity-70'

          return (
          <div key={it.order_item_id} className={cn("rounded-2xl border p-3 shadow-sm transition-all hover:shadow-md", cardCls)}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800">
                  {it.item_name} <span className="text-slate-400">× {it.quantity}</span>
                </div>
                {it.note && <div className="truncate text-xs text-slate-500">📝 {it.note}</div>}
                
                {/* Time */}
                {(!isServed && !it.is_mistake && !it.has_pending_cancel && it.kitchen_status !== 'CANCELLED') && (
                  <div className={cn("mt-1 flex items-center gap-1 text-[11px] font-medium", isReady ? "text-green-600" : diffMins >= 30 ? "text-red-600" : diffMins >= 15 ? "text-amber-600" : "text-slate-500")}>
                    <Clock size={12} /> 
                    {isReady ? 'Vừa xong' : `${diffMins} phút`}
                  </div>
                )}
              </div>
              {it.is_mistake ? (
                <Badge className="bg-red-100 text-red-700">Nhầm lẫn</Badge>
              ) : (
                it.kitchen_status && (
                  <Badge className={kitchenMeta[it.kitchen_status].cls}>
                    {kitchenMeta[it.kitchen_status].label}
                  </Badge>
                )
              )}
            </div>
            {it.is_mistake ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                <AlertTriangle size={13} /> Món đã làm — thu ngân sẽ bỏ khỏi bill khi thanh toán
              </div>
            ) : it.has_pending_cancel ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                <Clock size={13} /> Đang chờ bếp duyệt yêu cầu hủy
              </div>
            ) : (
              (() => {
                const st = it.kitchen_status ?? 'WAITING'
                const isWaiting = st === 'WAITING'
                const canServe = st === 'READY'
                if (st === 'CANCELLED') return null
                return (
                  <div className="mt-2 flex gap-2">
                    {canServe && (
                      <Button
                        variant="secondary"
                        className="flex-1 py-1.5 text-xs"
                        disabled={busy}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onServe(it.order_item_id)}
                      >
                        <Check size={14} /> Đã phục vụ
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="flex-1 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      disabled={busy}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onRequestCancel(it)}
                    >
                      <X size={14} /> {isWaiting ? 'Yêu cầu hủy' : 'Báo nhầm'}
                    </Button>
                  </div>
                )
              })()
            )}
          </div>
        )})}

        {/* Gio cho gui */}
        {cartLines.map((line) => {
          const it = items.find((i) => i.menu_item_id === line.id)
          return (
            <div
              key={line.id}
              className="rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/50 p-3 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800">{it?.name}</div>
                  {line.note && <div className="truncate text-xs text-slate-500">📝 {line.note}</div>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onEditNote(line.id)}
                    className={cn(
                      'rounded-md p-1.5 hover:bg-white',
                      line.note ? 'text-indigo-600' : 'text-slate-400',
                    )}
                    title="Ghi chú"
                  >
                    <StickyNote size={15} />
                  </button>
                  <Button variant="secondary" className="px-2 py-1" onClick={() => onDec(line.id)}>
                    <Minus size={13} />
                  </Button>
                  <span className="w-5 text-center text-sm">{line.quantity}</span>
                  <Button variant="secondary" className="px-2 py-1" onClick={() => onInc(line.id)}>
                    <Plus size={13} />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 border-t border-slate-200/60 pt-4">
        <Button 
          className="w-full py-3.5 text-[15px] font-semibold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all" 
          onClick={() => onSubmit()} 
          disabled={busy || cartLines.length === 0}
        >
          <Send size={18} className={cn(busy && "animate-pulse")} /> {order ? 'Thêm món vào đơn' : 'Tạo đơn & gửi bếp'}
        </Button>
      </div>
    </div>
  )
}
