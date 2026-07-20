import { useEffect, useState } from 'react'
import { Plus, Wand2, LogIn, RefreshCw, AlertTriangle } from 'lucide-react'
import {
  reservationsApi,
  type Reservation,
  type ReservationStatus,
  type ReservationAlert,
  type AlertState,
} from '../api/reservations'
import { tablesApi, type DiningTable } from '../api/tables'
import { useRealtime } from '../lib/useRealtime'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, Table, Modal, Input, Select, Badge, ErrorText } from '../components/ui'

const STATUSES: ReservationStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]

const statusStyle: Record<ReservationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  CHECKED_IN: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-red-100 text-red-700',
}

const alertStyle: Record<AlertState, string> = {
  READY: 'border-green-300 bg-green-50 text-green-800',
  NO_TABLE: 'border-amber-300 bg-amber-50 text-amber-800',
  CONFLICT: 'border-orange-300 bg-orange-50 text-orange-800',
  OVERDUE: 'border-red-300 bg-red-50 text-red-800',
}

export default function ReservationsPage() {
  const [list, setList] = useState<Reservation[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [alerts, setAlerts] = useState<ReservationAlert[]>([])
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    try {
      const [rs, ts, al] = await Promise.all([
        reservationsApi.list(),
        tablesApi.list(),
        reservationsApi.getAlerts().catch(() => []),
      ])
      setList(rs)
      setTables(ts)
      setAlerts(al)
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => {
    void load()
  }, [])
  // Khach dat ban / doi trang thai -> refetch ngay (chi chi nhanh cua le tan nay).
  useRealtime('/internal/reservations/stream', load)

  async function act<T>(fn: () => Promise<T>) {
    try {
      await fn()
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  async function suggestAndAssign(r: Reservation) {
    try {
      const t = await reservationsApi.suggestTable(r.id)
      if (!t) return alert('Không còn bàn trống phù hợp.')
      if (!confirm(`Gợi ý bàn ${t.table_number} (${t.capacity} chỗ). Gán bàn này?`)) return
      await reservationsApi.assignTable(r.id, t.id)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div>
      <PageHeader
        title="Đặt bàn"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void load()}>
              <RefreshCw size={16} /> Làm mới
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> Tạo phiếu (khách vãng lai)
            </Button>
          </div>
        }
      />

      {/* Canh bao truoc gio hen */}
      {alerts.length > 0 && (
        <div className="mb-5 space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${alertStyle[a.state]}`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={15} /> {a.message}
              </span>
              {a.state === 'NO_TABLE' && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const r = list.find((x) => x.id === a.id)
                    if (r) void suggestAndAssign(r)
                  }}
                >
                  Gợi ý bàn
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <ErrorText>{err}</ErrorText>

      <Table headers={['Mã', 'Khách', 'SĐT', 'Ngày giờ', 'Số khách', 'Bàn', 'Trạng thái', 'Thao tác']}>
        {list.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-medium text-slate-800">{r.reservation_code}</td>
            <td className="px-4 py-3">{r.customer_name}</td>
            <td className="px-4 py-3">{r.customer_phone}</td>
            <td className="px-4 py-3">
              {r.reservation_date} {r.reservation_time?.slice(0, 5)}
            </td>
            <td className="px-4 py-3">{r.guest_count}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <Select
                  value={r.table_id ?? ''}
                  onChange={(e) => e.target.value && act(() => reservationsApi.assignTable(r.id, Number(e.target.value)))}
                  className="py-1"
                >
                  <option value="">-- Chưa gán --</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.table_name || t.table_number}
                    </option>
                  ))}
                </Select>
                <button
                  title="Gợi ý bàn trống"
                  className="text-slate-500 hover:text-slate-800"
                  onClick={() => void suggestAndAssign(r)}
                >
                  <Wand2 size={16} />
                </button>
              </div>
            </td>
            <td className="px-4 py-3">
              <Badge className={statusStyle[r.status]}>{r.status}</Badge>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <Select
                  value={r.status}
                  onChange={(e) => act(() => reservationsApi.changeStatus(r.id, e.target.value as ReservationStatus))}
                  className="py-1"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  onClick={() => act(() => reservationsApi.checkin(r.id, r.table_id ?? undefined))}
                >
                  <LogIn size={14} /> Check-in
                </Button>
                <Button variant="danger" onClick={() => act(() => reservationsApi.cancel(r.id))}>
                  Hủy
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {open && (
        <ReservationForm
          tables={tables}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void load()
          }}
        />
      )}
    </div>
  )
}

function ReservationForm({
  tables,
  onClose,
  onSaved,
}: {
  tables: DiningTable[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [guests, setGuests] = useState('2')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [tableId, setTableId] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      await reservationsApi.create({
        customer_name: name,
        customer_phone: phone,
        customer_email: email || undefined,
        guest_count: Number(guests),
        reservation_date: date,
        reservation_time: time,
        table_id: tableId ? Number(tableId) : undefined,
        note: note || undefined,
      })
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title="Tạo phiếu đặt bàn (khách vãng lai)" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input label="Tên khách" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Email (tùy chọn)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Số khách" type="number" value={guests} onChange={(e) => setGuests(e.target.value)} />
        <Input label="Ngày (YYYY-MM-DD)" value={date} onChange={(e) => setDate(e.target.value)} placeholder="2026-07-08" />
        <Input label="Giờ (HH:mm)" value={time} onChange={(e) => setTime(e.target.value)} placeholder="19:00" />
        <Select label="Bàn (tùy chọn)" value={tableId} onChange={(e) => setTableId(e.target.value)}>
          <option value="">-- Chưa gán --</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.table_name || `Bàn ${t.table_number}`}
            </option>
          ))}
        </Select>
        <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
        <ErrorText>{err}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
