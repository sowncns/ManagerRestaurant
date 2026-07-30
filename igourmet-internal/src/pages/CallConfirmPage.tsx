import { useEffect, useState, useCallback, useMemo } from 'react'
import { Phone, PhoneCall, RefreshCw, Check, Undo2, Users, CalendarCheck, Utensils } from 'lucide-react'
import { reservationsApi, type CallListItem } from '../api/reservations'
import { useRealtime } from '../lib/useRealtime'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, ErrorText, Badge } from '../components/ui'
import { cn } from '../lib/cn'

const hhmm = (t: string) => (t ?? '').slice(0, 5)

function untilLabel(m: number) {
  if (m > 0) return `Còn ${m} phút`
  if (m === 0) return 'Đến giờ hẹn'
  return `Quá ${-m} phút`
}

export default function CallConfirmPage() {
  const [items, setItems] = useState<CallListItem[]>([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      setItems(await reservationsApi.callList())
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useRealtime('/internal/reservations/stream', load)

  const toggle = async (r: CallListItem, confirmed: boolean) => {
    try {
      await reservationsApi.confirmCall(r.id, confirmed)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const pending = useMemo(() => items.filter((r) => !r.call_confirmed_at), [items])
  const called = useMemo(() => items.filter((r) => r.call_confirmed_at), [items])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Quản Lý Cuộc Gọi Xác Nhận Đặt Bàn"
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} loading={loading} leftIcon={<RefreshCw size={14} />}>
            Làm mới
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <CalendarCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Danh Sách Gọi Đón Khách Hôm Nay</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lễ tân gọi điện xác nhận số lượng khách & thời gian đến trước 30-60 phút.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="px-3 py-1 text-xs font-bold">
            Cần gọi: {pending.length}
          </Badge>
          <Badge variant="success" className="px-3 py-1 text-xs font-bold">
            Đã xác nhận: {called.length}
          </Badge>
        </div>
      </div>

      <ErrorText>{err}</ErrorText>

      {/* Danh sách Chưa gọi */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <PhoneCall size={16} className="text-emerald-600" /> Cần Gọi Xác Nhận ({pending.length})
          </h2>
        </div>

        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900">
            <Check size={32} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Tất cả cuộc gọi hôm nay đã được xác nhận!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pending.map((r) => (
              <CallCard key={r.id} r={r} onConfirm={() => void toggle(r, true)} />
            ))}
          </div>
        )}
      </div>

      {/* Danh sách Đã gọi */}
      {called.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400">
            <Check size={16} className="text-emerald-600" /> Đã Gọi Xác Nhận ({called.length})
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {called.map((r) => (
              <CallCard key={r.id} r={r} done onUndo={() => void toggle(r, false)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CallCard({
  r,
  done,
  onConfirm,
  onUndo,
}: {
  r: CallListItem
  done?: boolean
  onConfirm?: () => void
  onUndo?: () => void
}) {
  const urgent = !done && r.minutes_until <= 30

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-150 shadow-xs',
        done
          ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-75'
          : urgent
          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500',
      )}
    >
      {/* Khung Thời gian */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="h-12 w-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center font-mono">
          <span className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none">
            {hhmm(r.reservation_time)}
          </span>
          <span className={cn('text-[10px] font-semibold mt-1', urgent ? 'text-rose-600 font-bold' : 'text-slate-400')}>
            {untilLabel(r.minutes_until)}
          </span>
        </div>

        {/* Thông tin Khách hàng */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{r.customer_name}</span>
            <Badge variant="neutral" className="text-xs font-semibold">
              <Users size={11} className="mr-1 inline" /> {r.guest_count} khách
            </Badge>
            {r.table_number && (
              <Badge variant="info" className="text-xs font-bold">
                Bàn {r.table_number}
              </Badge>
            )}
          </div>

          {/* Món đặt trước */}
          {r.preorder_items.length > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
              <Utensils size={12} />
              <span className="truncate">
                Đặt trước: {r.preorder_items.map((i) => `${i.item_name} ×${i.quantity}`).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hành động & Gọi điện */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
        <a
          href={`tel:${r.customer_phone}`}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
        >
          <Phone size={14} className="text-emerald-600" />
          <span>{r.customer_phone}</span>
        </a>

        {done ? (
          <Button variant="ghost" size="sm" onClick={onUndo} className="h-9 px-3 text-xs">
            <Undo2 size={14} /> Bỏ chọn
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={onConfirm} className="h-9 px-4 text-xs font-bold" leftIcon={<Check size={14} />}>
            Đã gọi
          </Button>
        )}
      </div>
    </div>
  )
}
