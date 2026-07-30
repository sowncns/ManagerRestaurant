import { useEffect, useState } from 'react'
import { Phone, PhoneCall, RefreshCw, Check, Undo2, Clock, Users } from 'lucide-react'
import { reservationsApi, type CallListItem } from '../api/reservations'
import { useRealtime } from '../lib/useRealtime'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, ErrorText } from '../components/ui'

const hhmm = (t: string) => (t ?? '').slice(0, 5)

// "Con X phut" / "Qua Y phut" tu minutes_until (am = qua gio).
function untilLabel(m: number) {
  if (m > 0) return `còn ${m} phút`
  if (m === 0) return 'đến giờ'
  return `quá ${-m} phút`
}

export default function CallConfirmPage() {
  const [items, setItems] = useState<CallListItem[]>([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    setErr('')
    try {
      setItems(await reservationsApi.callList())
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  useRealtime('/internal/reservations/stream', load)

  async function toggle(r: CallListItem, confirmed: boolean) {
    try {
      await reservationsApi.confirmCall(r.id, confirmed)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const pending = items.filter((r) => !r.call_confirmed_at)
  const called = items.filter((r) => r.call_confirmed_at)

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Gọi xác nhận"
        action={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
          </Button>
        }
      />
      <p className="-mt-2 mb-5 text-sm text-slate-500">
        Lịch đặt bàn hôm nay — gọi khách xác nhận lần cuối trước giờ nhận bàn.
      </p>

      <ErrorText>{err}</ErrorText>

      {/* Chua goi */}
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <PhoneCall size={16} className="text-indigo-600" /> Chưa gọi
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">{pending.length}</span>
      </h2>
      {pending.length === 0 ? (
        <p className="mb-6 rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
          Đã gọi hết lịch hôm nay 🎉
        </p>
      ) : (
        <div className="mb-8 space-y-2">
          {pending.map((r) => (
            <CallRow key={r.id} r={r} onConfirm={() => void toggle(r, true)} />
          ))}
        </div>
      )}

      {/* Da goi */}
      {called.length > 0 && (
        <>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Check size={16} className="text-green-600" /> Đã gọi
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{called.length}</span>
          </h2>
          <div className="space-y-2">
            {called.map((r) => (
              <CallRow key={r.id} r={r} done onUndo={() => void toggle(r, false)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CallRow({
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
  // Trong 30' toi (ngưỡng cảnh báo) va chua goi -> nhan manh do.
  const urgent = !done && r.minutes_until <= 30

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center ${
        done
          ? 'border-slate-200 bg-slate-50 text-slate-500'
          : urgent
            ? 'border-red-300 bg-red-50'
            : 'border-slate-200 bg-white'
      }`}
    >
      {/* Gio + con bao lau */}
      <div className="flex w-full items-center gap-3 sm:w-40 sm:shrink-0">
        <div className="text-lg font-bold tabular-nums text-slate-800">{hhmm(r.reservation_time)}</div>
        <span className={`flex items-center gap-1 text-xs ${urgent ? 'font-semibold text-red-600' : 'text-slate-400'}`}>
          <Clock size={12} /> {untilLabel(r.minutes_until)}
        </span>
      </div>

      {/* Khach + ban + mon */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-slate-800">{r.customer_name}</span>
          <span className="flex items-center gap-1 text-sm text-slate-500">
            <Users size={13} /> {r.guest_count}
          </span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
            {r.table_number || 'Chưa gán bàn'}
          </span>
        </div>
        {r.preorder_items.length > 0 && (
          <div className="mt-1 text-xs text-slate-500">
            <span className="font-medium text-amber-700">Đặt trước:</span>{' '}
            {r.preorder_items.map((i) => `${i.item_name} ×${i.quantity}`).join(', ')}
          </div>
        )}
      </div>

      {/* SDT + thao tac */}
      <div className="flex items-center gap-2 sm:shrink-0">
        <a
          href={`tel:${r.customer_phone}`}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <Phone size={14} /> {r.customer_phone}
        </a>
        {done ? (
          <Button variant="secondary" onClick={onUndo}>
            <Undo2 size={14} /> Bỏ đánh dấu
          </Button>
        ) : (
          <Button onClick={onConfirm}>
            <Check size={14} /> Đã gọi
          </Button>
        )}
      </div>
    </div>
  )
}
