import { useEffect, useState } from 'react'
import {
  RefreshCw,
  Users,
  Clock,
  AlertTriangle,
  ArrowLeftRight,
  DoorOpen,
  BookmarkPlus,
  BellRing,
  Check,
  Search,
  Armchair,
  CalendarClock,
  Trash2,
  ChevronDown,
} from 'lucide-react'
import { tablesApi, type DiningTable, type Section, type TableStatus } from '../api/tables'
import { reservationsApi, type ReservationAlert, type Reservation } from '../api/reservations'
import { ordersApi } from '../api/orders'
import { errMsg } from '../lib/errMsg'
import { Button, Modal, Input, Select, ErrorText } from '../components/ui'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const SLOT_MIN = 120 // 2 lich cung ban phai cach nhau >= 2h

function toMin(t?: string | null) {
  if (!t) return 0
  const [h, m] = t.split(':')
  return Number(h) * 60 + Number(m)
}

// Ban co bi trung khung gio (<2h) voi lich khac tren cung ban khong.
function hasTimeConflict(
  reservations: Reservation[],
  tableId: number,
  date: string,
  time: string,
  excludeId = 0,
) {
  const t = toMin(time)
  const d = (date ?? '').slice(0, 10)
  return reservations.some(
    (r) =>
      r.table_id === tableId &&
      r.id !== excludeId &&
      (r.reservation_date ?? '').slice(0, 10) === d &&
      r.status !== 'CANCELLED' &&
      r.status !== 'COMPLETED' &&
      Math.abs(toMin(r.reservation_time) - t) < SLOT_MIN,
  )
}

interface Meta {
  label: string
  chip: string // mau pill nho
  card: string // mau nen the ban
  accent: string // mau chu so ban
}

const statusMeta: Record<TableStatus, Meta> = {
  AVAILABLE: {
    label: 'Trống',
    chip: 'bg-slate-100 text-slate-600',
    card: 'bg-white border-slate-200 hover:border-slate-300',
    accent: 'text-slate-700',
  },
  SERVING: {
    label: 'Đang phục vụ',
    chip: 'bg-green-100 text-green-700',
    card: 'bg-green-50 border-green-300 hover:border-green-400',
    accent: 'text-green-700',
  },
  RESERVED: {
    label: 'Giữ chỗ',
    chip: 'bg-blue-100 text-blue-700',
    card: 'bg-blue-50 border-blue-300 hover:border-blue-400',
    accent: 'text-blue-700',
  },
  WAIT_PAYMENT: {
    label: 'Chờ thanh toán',
    chip: 'bg-amber-100 text-amber-700',
    card: 'bg-amber-50 border-amber-300 hover:border-amber-400',
    accent: 'text-amber-700',
  },

  DISABLE: {
    label: 'Ngưng',
    chip: 'bg-slate-100 text-slate-400',
    card: 'bg-slate-50 border-slate-200 opacity-60',
    accent: 'text-slate-400',
  },
}

const CONFLICT_META: Meta = {
  label: 'Sắp tới giờ hẹn',
  chip: 'bg-red-100 text-red-700',
  card: 'bg-red-50 border-red-400 ring-2 ring-red-200 animate-pulse',
  accent: 'text-red-700',
}

export default function FloorMapPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [alerts, setAlerts] = useState<ReservationAlert[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<DiningTable | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingExpanded, setPendingExpanded] = useState(true)
  const [activeSectionId, setActiveSectionId] = useState<number | 'none' | 'all'>('all')

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const [secs, tbs, al, rs] = await Promise.all([
        tablesApi.listSections(),
        tablesApi.list(),
        reservationsApi.getAlerts().catch(() => []),
        reservationsApi.list().catch(() => []),
      ])
      setSections(secs.filter((s) => s.status === 'ACTIVE'))
      setTables(tbs)
      setAlerts(al)
      setReservations(rs)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 60000)
    return () => clearInterval(timer)
  }, [])

  async function switchTable(reservationId: number, tableId: number) {
    try {
      await reservationsApi.assignTable(reservationId, tableId)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  async function setTableStatus(t: DiningTable, status: TableStatus) {
    try {
      await tablesApi.changeStatus(t.id, status)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  async function confirmReservation(r: Reservation, tableId: number) {
    try {
      await reservationsApi.assignTable(r.id, tableId)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  async function rejectReservation(r: Reservation) {
    if (!confirm(`Từ chối phiếu đặt của ${r.customer_name}?`)) return
    try {
      await reservationsApi.cancel(r.id)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  async function checkinReservation(id: number) {
    try {
      await reservationsApi.checkin(id)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  // Le tan huy/xoa mot phieu dat truoc.
  async function cancelReservation(id: number, label: string) {
    if (!confirm(`Hủy phiếu đặt trước${label ? ` của ${label}` : ''}?`)) return
    try {
      await reservationsApi.cancel(id)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const pending = reservations.filter((r) => r.status === 'PENDING')

  const q = search.trim().toLowerCase()
  const bookedResults = q
    ? reservations.filter(
        (r) =>
          r.status !== 'CANCELLED' &&
          r.status !== 'COMPLETED' &&
          [r.customer_name, r.customer_phone, r.table_number, r.reservation_code].some((f) =>
            (f ?? '').toString().toLowerCase().includes(q),
          ),
      )
    : []

  const conflictByTable = new Map<string, ReservationAlert>()
  for (const a of alerts) {
    if ((a.state === 'CONFLICT' || a.state === 'OVERDUE') && a.table_number) {
      conflictByTable.set(a.table_number, a)
    }
  }

  const today = todayStr()
  const upcomingByTableId = new Map<number, Reservation>()
  for (const r of reservations) {
    if (r.status === 'CONFIRMED' && r.table_id && r.reservation_date?.startsWith(today)) {
      const existing = upcomingByTableId.get(r.table_id)
      if (!existing || (r.reservation_time ?? '') < (existing.reservation_time ?? '')) {
        upcomingByTableId.set(r.table_id, r)
      }
    }
  }

  const noSection = tables.filter((t) => !t.section_id)
  const countTrong = tables.filter((t) => t.status === 'AVAILABLE' && !t.upcoming_reservation && !upcomingByTableId.has(t.id)).length
  const countServing = tables.filter((t) => t.status === 'SERVING').length
  // Giu cho = so phieu dat da xac nhan (CONFIRMED) dang cho khach den, moi ngay.
  const countHeld = reservations.filter((r) => r.status === 'CONFIRMED').length

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sơ đồ bàn</h1>
          <p className="text-sm text-slate-500">Chạm vào bàn để mở bàn hoặc giữ chỗ</p>
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading} className="w-full justify-center sm:w-auto">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
        </Button>
      </div>

      {/* Thong ke nhanh */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Bàn trống" value={countTrong} tone="bg-slate-100 text-slate-700" />
        <StatTile label="Đang phục vụ" value={countServing} tone="bg-green-100 text-green-700" />
        <StatTile label="Giữ chỗ" value={countHeld} tone="bg-blue-100 text-blue-700" />
        <StatTile label="App chờ xác nhận" value={pending.length} tone="bg-indigo-100 text-indigo-700" />
      </div>

      {/* Thong bao dat ban tu app */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
        <button
          onClick={() => setPendingExpanded(!pendingExpanded)}
          className="flex w-full items-center gap-2 bg-indigo-600 px-4 py-2.5 text-white transition-colors hover:bg-indigo-700"
        >
          <BellRing size={17} />
          <span className="text-sm font-semibold">Đặt bàn từ app chờ xác nhận</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">
              {pending.length}
            </span>
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${pendingExpanded ? 'rotate-180' : ''}`}
            />
          </span>
        </button>
        {pendingExpanded && (
          <div className="border-t border-indigo-100 p-3">
            {pending.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">
                Chưa có đặt bàn mới từ app · tự cập nhật mỗi phút
              </p>
            ) : (
              <div className="space-y-2">
                {pending.map((r) => (
                  <PendingRow
                    key={r.id}
                    r={r}
                    tables={tables}
                    reservations={reservations}
                    onConfirm={(tableId) => void confirmReservation(r, tableId)}
                    onReject={() => void rejectReservation(r)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Tim kiem */}
      <div className="mb-6">
        <div className="relative w-full sm:max-w-md">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm bàn đã đặt: tên khách, SĐT, số bàn, mã phiếu..."
            className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        {q && (
          <div className="mt-2 max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {bookedResults.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400">Không tìm thấy bàn đặt nào khớp.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {bookedResults.map((r) => (
                  <li key={r.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-start gap-2 text-slate-700 sm:items-center">
                      <CalendarClock size={16} className="mt-0.5 shrink-0 text-slate-400 sm:mt-0" />
                      <span className="leading-tight">
                        <span className="font-semibold">
                          {r.table_number ? `Bàn ${r.table_number}` : 'Chưa gán bàn'}
                        </span>
                        <span className="block text-xs text-slate-500 sm:inline sm:text-sm sm:text-slate-700">
                          <span className="hidden sm:inline"> · </span>
                          {r.customer_name} · {r.customer_phone} · {r.reservation_date?.slice(0, 10)}{' '}
                          {r.reservation_time?.slice(0, 5)}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center justify-between sm:shrink-0 sm:justify-end gap-3">
                      <StatusPill status={r.status} />
                      {r.status !== 'CHECKED_IN' && (
                        <button
                          title="Hủy phiếu đặt"
                          onClick={() => void cancelReservation(r.id, r.customer_name)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Canh bao chuyen ban */}
      {conflictByTable.size > 0 && (
        <div className="mb-6 space-y-2">
          {[...conflictByTable.values()].map((a) => (
            <ConflictRow
              key={a.id}
              a={a}
              tables={tables}
              reservations={reservations}
              onSwitch={(tableId) => void switchTable(a.id, tableId)}
            />
          ))}
        </div>
      )}

      <ErrorText>{err}</ErrorText>

      {/* Tab khu vuc */}
      {(sections.length > 0 || noSection.length > 0) && (
        <div className="sticky top-0 z-30 -mx-4 mb-6 flex gap-2.5 overflow-x-auto bg-white/95 px-4 py-3.5 backdrop-blur-xl shadow-sm border-b border-slate-200/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => setActiveSectionId('all')}
            className={`shrink-0 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium transition-colors ${
              activeSectionId === 'all'
                ? 'bg-indigo-600 text-white border-transparent'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả
          </button>
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSectionId(sec.id)}
              className={`shrink-0 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium transition-colors ${
                activeSectionId === sec.id
                  ? 'bg-indigo-600 text-white border-transparent'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {sec.name}
            </button>
          ))}
          {noSection.length > 0 && (
            <button
              onClick={() => setActiveSectionId('none')}
              className={`shrink-0 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium transition-colors ${
                activeSectionId === 'none'
                  ? 'bg-indigo-600 text-white border-transparent'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Chưa gán khu vực
            </button>
          )}
        </div>
      )}

      {/* Cac khu vuc */}
      <div className="flex flex-col gap-8">
        {sections
          .filter((sec) => activeSectionId === 'all' || activeSectionId === sec.id)
          .map((sec) => (
            <SectionBlock
              key={sec.id}
              name={sec.name}
              tables={tables.filter((t) => t.section_id === sec.id)}
              conflicts={conflictByTable}
              upcoming={upcomingByTableId}
              onSelect={setSelected}
            />
          ))}
        {noSection.length > 0 && (activeSectionId === 'all' || activeSectionId === 'none') && (
          <SectionBlock
            name="Chưa gán khu vực"
            tables={noSection}
            conflicts={conflictByTable}
            upcoming={upcomingByTableId}
            onSelect={setSelected}
          />
        )}
        {sections.length === 0 && noSection.length === 0 && !loading && (
          <p className="text-sm text-slate-400">Chi nhánh chưa có khu vực / bàn nào.</p>
        )}
      </div>

      {/* Chu thich (Legends) moved to bottom */}
      <div className="mt-8 mb-4 border-t border-slate-100 pt-6">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Chú thích trạng thái</h4>
        <div className="flex flex-wrap gap-3 text-xs">
          {(['AVAILABLE', 'SERVING', 'RESERVED', 'WAIT_PAYMENT'] as TableStatus[]).map((s) => (
            <span key={s} className={`rounded-full px-2.5 py-1 font-medium ${statusMeta[s].chip}`}>
              {statusMeta[s].label}
            </span>
          ))}
          <span className={`rounded-full px-2.5 py-1 font-medium ${CONFLICT_META.chip}`}>
            Sắp tới giờ, chưa trống
          </span>
        </div>
      </div>

      {selected && (
        <TableActionModal
          table={selected}
          allTables={tables}
          allReservations={reservations}
          tableReservations={reservations
            .filter(
              (r) =>
                r.table_id === selected.id &&
                r.status !== 'CANCELLED' &&
                r.status !== 'COMPLETED',
            )
            .sort((x, y) => (x.reservation_time ?? '').localeCompare(y.reservation_time ?? ''))}
          onSetStatus={async (status) => {
            await setTableStatus(selected, status)
            setSelected(null)
          }}
          onCancelReservation={(id, name) => void cancelReservation(id, name)}
          onCheckinReservation={async (id) => {
            await checkinReservation(id)
            setSelected(null)
          }}
          onChangeTable={async (rId, tId) => {
            await switchTable(rId, tId)
            setSelected(null)
          }}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null)
            void load()
          }}
        />
      )}
    </div>
  )
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold ${tone}`}>
        {value}
      </div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    CHECKED_IN: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-slate-100 text-slate-500',
    CANCELLED: 'bg-red-100 text-red-700',
    NO_SHOW: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

function SectionBlock({
  name,
  tables,
  conflicts,
  upcoming,
  onSelect,
}: {
  name: string
  tables: DiningTable[]
  conflicts: Map<string, ReservationAlert>
  upcoming: Map<number, Reservation>
  onSelect: (t: DiningTable) => void
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">
        <span className="inline-block h-4 w-1 shrink-0 rounded bg-indigo-500" />
        <span className="truncate">{name}</span>
        <span className="text-sm font-normal text-slate-400">({tables.length} bàn)</span>
      </h2>
      {tables.length === 0 ? (
        <p className="text-sm text-slate-400">Không có bàn.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {tables.map((t) => (
            <TableCard
              key={t.id}
              t={t}
              conflict={t.table_number ? conflicts.get(t.table_number) : undefined}
              upcoming={upcoming.get(t.id) ?? t.upcoming_reservation ?? undefined}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TableCard({
  t,
  conflict,
  upcoming,
  onSelect,
}: {
  t: DiningTable
  conflict?: ReservationAlert
  // Chi can ten khach + gio: nhan ca Reservation (day du) lan upcoming_reservation (rut gon).
  upcoming?: Pick<Reservation, 'customer_name' | 'reservation_time'>
  onSelect: (t: DiningTable) => void
}) {
  // Ban trong nhung da co lich dat -> hien nhu "Giu cho".
  const displayStatus: TableStatus =
    t.status === 'AVAILABLE' && upcoming ? 'RESERVED' : t.status
  const baseMeta = conflict ? CONFLICT_META : statusMeta[displayStatus] ?? statusMeta.AVAILABLE
  
  const isPaid = t.status === 'SERVING' && t.active_order_id == null
  const meta = {
    ...baseMeta,
    label: isPaid ? 'Đã thanh toán' : baseMeta.label,
    chip: isPaid ? 'bg-teal-100 text-teal-700' : baseMeta.chip,
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(t)}
      className={`relative flex aspect-[4/3] flex-col justify-between rounded-2xl border-2 p-3 text-left shadow-sm transition-all hover:shadow-md ${meta.card}`}
    >
      <div className="flex items-start justify-between">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}>
          {meta.label}
        </span>
        {(upcoming || conflict) && <BellRing size={14} className="text-red-500 animate-pulse" />}
      </div>

      <div className="flex items-center gap-1.5">
        <Armchair size={18} className={meta.accent} />
        <span className={`text-2xl font-bold leading-none ${meta.accent}`}>{t.table_number}</span>
        <span className="text-xs text-slate-400">· {t.capacity} chỗ</span>
      </div>

      <div className="min-h-[16px] text-[11px] leading-tight">
        {conflict ? (
          <span className="font-medium text-red-700">
            Hẹn {conflict.reservation_time?.slice(0, 5)} · {conflict.customer_name}
          </span>
        ) : t.status === 'SERVING' && t.active_order_amount > 0 ? (
          <span className="text-green-700">
            {Number(t.active_order_amount).toLocaleString('vi-VN')}đ
          </span>
        ) : isPaid ? (
          <span className="font-semibold text-teal-600">Khách vẫn đang ngồi</span>
        ) : upcoming ? (
          <span className="flex items-center gap-1 text-blue-700">
            <Clock size={11} />
            {upcoming.reservation_time?.slice(0, 5)} · {upcoming.customer_name}
          </span>
        ) : (
          <span className="text-slate-400">Chạm để thao tác</span>
        )}
      </div>
    </button>
  )
}

// Canh bao sap toi gio hen ma ban chua trong -> le tan chon ban trong khac de chuyen.
function ConflictRow({
  a,
  tables,
  reservations,
  onSwitch,
}: {
  a: ReservationAlert
  tables: DiningTable[]
  reservations: Reservation[]
  onSwitch: (tableId: number) => void
}) {
  // Ban dang trong, du cho, va khong trung khung gio (<2h) voi lich khac tren ban do.
  const free = tables.filter(
    (t) =>
      t.status === 'AVAILABLE' &&
      t.capacity >= (a.guest_count ?? 1) &&
      !hasTimeConflict(reservations, t.id, a.reservation_date, a.reservation_time, a.id),
  )
  const [tableId, setTableId] = useState<string>('')

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-start gap-2 font-medium sm:items-center">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 sm:mt-0" /> <span className="leading-tight">{a.message}</span>
      </span>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <Select value={tableId} onChange={(e) => setTableId(e.target.value)} className="w-full py-2 sm:w-auto sm:py-1.5">
          <option value="">
            {free.length ? '-- Chọn bàn trống --' : 'Hết bàn trống phù hợp'}
          </option>
          {free.map((t) => (
            <option key={t.id} value={t.id}>
              Bàn {t.table_number} ({t.capacity} chỗ)
            </option>
          ))}
        </Select>
        <Button className="w-full justify-center sm:w-auto" variant="danger" disabled={!tableId} onClick={() => tableId && onSwitch(Number(tableId))}>
          <ArrowLeftRight size={15} /> Chuyển
        </Button>
      </div>
    </div>
  )
}

// Mot phieu app cho xac nhan: le tan tu chon ban roi xac nhan.
function PendingRow({
  r,
  tables,
  reservations,
  onConfirm,
  onReject,
}: {
  r: Reservation
  tables: DiningTable[]
  reservations: Reservation[]
  onConfirm: (tableId: number) => void
  onReject: () => void
}) {
  // Bàn du cho va khong trung khung gio (<2h) voi lich khac tren bàn do.
  const options = tables.filter(
    (t) =>
      t.capacity >= (r.guest_count ?? 1) &&
      !hasTimeConflict(reservations, t.id, r.reservation_date, r.reservation_time, r.id),
  )
  const [tableId, setTableId] = useState<string>('')

  return (
    <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 p-3.5 shadow-sm transition-shadow hover:shadow-md sm:p-4">
      {/* Accent Line */}
      <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500" />
      
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <Users size={18} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-1.5">
            <h3 className="text-base font-semibold text-slate-900">{r.customer_name}</h3>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {r.guest_count} khách
            </span>
          </div>
          <div className="mt-0.5 text-sm text-slate-500">{r.customer_phone}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-indigo-400" />
              {r.reservation_time?.slice(0, 5)} · {r.reservation_date?.slice(0, 10)}
            </span>
            {r.table_number && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                Y/C Bàn {r.table_number}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-indigo-100/60 pt-3">
        <Select 
          value={tableId} 
          onChange={(e) => setTableId(e.target.value)} 
          className="flex-1 border-indigo-200 bg-white py-1.5 text-sm focus:border-indigo-400 focus:ring-indigo-100"
        >
          <option value="">-- Xếp bàn --</option>
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              Bàn {t.table_number} ({t.capacity} chỗ)
            </option>
          ))}
        </Select>
        <Button 
          disabled={!tableId} 
          onClick={() => tableId && onConfirm(Number(tableId))}
          className="shrink-0 px-4 py-2"
        >
          <Check size={16} className="sm:mr-1" /> <span className="hidden sm:inline">Duyệt</span>
        </Button>
        <button
          onClick={onReject}
          className="shrink-0 rounded-lg border border-red-200 bg-white p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Từ chối"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

// Le tan: MO BAN (nhan khach ngay) hoac GIU BAN (giu cho - nhap thong tin khach).
function TableActionModal({
  table,
  allTables,
  allReservations,
  tableReservations,
  onCancelReservation,
  onCheckinReservation,
  onChangeTable,
  onClose,
  onSaved,
}: {
  table: DiningTable
  allTables: DiningTable[]
  allReservations: Reservation[]
  tableReservations: Reservation[]
  onSetStatus: (status: TableStatus) => Promise<void>
  onCancelReservation: (id: number, name: string) => void
  onCheckinReservation: (id: number) => Promise<void>
  onChangeTable: (rId: number, tId: number) => Promise<void>
  onClose: () => void
  onSaved: () => void
}) {
  const [mode, setMode] = useState<'menu' | 'hold' | 'open'>('menu')
  const [switchResId, setSwitchResId] = useState<number | null>(null)
  const [newTableId, setNewTableId] = useState<string>('')
  const [rescheduleResId, setRescheduleResId] = useState<number | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [guests, setGuests] = useState(String(table.capacity))
  const [walkinGuests, setWalkinGuests] = useState(String(table.capacity))
  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  const meta = statusMeta[table.status] ?? statusMeta.AVAILABLE

  async function openTable() {
    setBusy(true)
    setErr('')
    try {
      await ordersApi.create({
        table_id: table.id,
        guest_count: Number(walkinGuests),
      })
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function hold() {
    setBusy(true)
    setErr('')
    try {
      await reservationsApi.create({
        customer_name: name,
        customer_phone: phone,
        guest_count: Number(guests),
        reservation_date: date,
        reservation_time: time,
        table_id: table.id,
        note: note,
      })
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open title={`Bàn ${table.table_number}${table.table_name ? ` · ${table.table_name}` : ''}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <Armchair size={16} /> {table.capacity} chỗ
          {table.section_name && ` · ${table.section_name}`}
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${meta.chip}`}>
            {meta.label}
          </span>
        </div>

        {tableReservations.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
            <div className="mb-1 px-1 text-xs font-semibold text-blue-800">
              Lịch đặt của bàn ({tableReservations.length})
            </div>
            <ul className="space-y-1">
              {tableReservations.map((r) => {
                // Tinh cac ban trong de chuyen
                const freeTables = allTables.filter(
                  (t) =>
                    t.id !== table.id &&
                    t.status === 'AVAILABLE' &&
                    t.capacity >= (r.guest_count ?? 1) &&
                    !hasTimeConflict(allReservations, t.id, r.reservation_date, r.reservation_time, r.id)
                )

                return (
                  <li
                    key={r.id}
                    className="flex flex-col gap-2 rounded-md bg-white px-2 py-1.5 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-700">
                        <Clock size={12} className="mr-1 inline text-blue-500" />
                        <span className="font-medium">{r.reservation_time?.slice(0, 5)}</span> ·{' '}
                        {r.reservation_date?.slice(0, 10)} · {r.customer_name} ({r.guest_count}){' '}
                        <StatusPill status={r.status} />
                      </span>
                      {r.status !== 'CHECKED_IN' && (
                        <div className="flex gap-1 items-center">
                          <button
                            title="Đổi bàn"
                            onClick={() => {
                              setSwitchResId(switchResId === r.id ? null : r.id)
                              setNewTableId('')
                              setRescheduleResId(null)
                            }}
                            className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                              switchResId === r.id
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                            }`}
                          >
                            Đổi bàn
                          </button>
                          <button
                            title="Đổi lịch"
                            onClick={() => {
                              if (rescheduleResId === r.id) {
                                setRescheduleResId(null)
                              } else {
                                setRescheduleResId(r.id)
                                setNewDate(r.reservation_date || todayStr())
                                setNewTime(r.reservation_time?.slice(0, 5) || '')
                              }
                              setSwitchResId(null)
                            }}
                            className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                              rescheduleResId === r.id
                                ? 'bg-orange-100 text-orange-700'
                                : 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                            }`}
                          >
                            Đổi lịch
                          </button>
                          <button
                            title="Nhận khách (Check-in)"
                            onClick={() => onCheckinReservation(r.id)}
                            disabled={table.status === 'SERVING' || table.status === 'WAIT_PAYMENT'}
                            className={`rounded px-2 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                              table.status === 'SERVING' || table.status === 'WAIT_PAYMENT'
                                ? 'text-slate-400 bg-slate-100 cursor-not-allowed'
                                : 'text-green-600 bg-green-50 hover:bg-green-100'
                            }`}
                          >
                            Nhận khách
                          </button>
                          <button
                            title="Hủy lịch này"
                            onClick={() => onCancelReservation(r.id, r.customer_name)}
                            className="rounded p-1 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Hien thi chon ban neu dang bat mode Doi ban */}
                    {switchResId === r.id && (
                      <div className="flex items-center gap-2 mt-1 border-t border-slate-100 pt-2">
                        <Select 
                          value={newTableId} 
                          onChange={(e) => setNewTableId(e.target.value)} 
                          className="flex-1 py-1.5 text-xs bg-slate-50 border-slate-200"
                        >
                          <option value="">
                            {freeTables.length ? '-- Chọn bàn trống --' : 'Hết bàn trống phù hợp'}
                          </option>
                          {freeTables.map((t) => (
                            <option key={t.id} value={t.id}>
                              Bàn {t.table_number} ({t.capacity} chỗ)
                            </option>
                          ))}
                        </Select>
                        <Button 
                          disabled={!newTableId || busy} 
                          onClick={async () => {
                            setBusy(true)
                            await onChangeTable(r.id, Number(newTableId))
                            setBusy(false)
                          }}
                          className="shrink-0 py-1.5 px-3 text-xs"
                        >
                          Lưu thay đổi
                        </Button>
                      </div>
                    )}
                    
                    {/* Hien thi form doi lich neu dang bat mode Doi lich */}
                    {rescheduleResId === r.id && (
                      <div className="flex items-center gap-2 mt-1 border-t border-slate-100 pt-2">
                        <input 
                          type="date"
                          value={newDate} 
                          onChange={(e) => setNewDate(e.target.value)}
                          className="flex-1 rounded-md border-slate-200 py-1 px-2 text-xs bg-white shadow-sm focus:border-indigo-400 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                        <input 
                          type="time"
                          value={newTime} 
                          onChange={(e) => setNewTime(e.target.value)} 
                          className="w-24 rounded-md border-slate-200 py-1 px-2 text-xs bg-white shadow-sm focus:border-indigo-400 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                        <Button 
                          disabled={!newDate || !newTime || busy} 
                          onClick={async () => {
                            setBusy(true)
                            try {
                              await reservationsApi.update(r.id, {
                                reservation_date: newDate,
                                reservation_time: newTime,
                              })
                              onSaved()
                            } catch (e) {
                              alert(errMsg(e))
                            } finally {
                              setBusy(false)
                            }
                          }}
                          className="shrink-0 py-1.5 px-3 text-xs"
                        >
                          Lưu
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {mode === 'menu' ? (
          <>
            <button
              disabled={busy || table.status === 'SERVING'}
              onClick={() => setMode('open')}
              className="flex items-center gap-3 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3 text-left transition-colors hover:bg-green-100 disabled:opacity-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
                <DoorOpen size={20} />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">Mở bàn (Khách vãng lai)</span>
                <span className="block text-xs text-slate-500">Mở bàn trống cho khách vãng lai</span>
              </span>
            </button>

            <button
              onClick={() => setMode('hold')}
              className="flex items-center gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-left transition-colors hover:bg-blue-100"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                <BookmarkPlus size={20} />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">Giữ bàn</span>
                <span className="block text-xs text-slate-500">Giữ chỗ cho khách (nhập thông tin)</span>
              </span>
            </button>
          </>
        ) : mode === 'hold' ? (
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-slate-700">Giữ chỗ — thông tin khách</h4>
            <Input label="Tên khách" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Số khách" type="number" value={guests} onChange={(e) => setGuests(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Ngày" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input label="Giờ (HH:mm)" value={time} onChange={(e) => setTime(e.target.value)} placeholder="19:00" />
            </div>
            <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Ghế trẻ em, sinh nhật..." />
            <ErrorText>{err}</ErrorText>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMode('menu')}>
                Quay lại
              </Button>
              <Button onClick={hold} disabled={busy}>
                {busy ? 'Đang lưu...' : 'Giữ bàn'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-slate-700">Mở bàn cho khách vãng lai</h4>
            <Input label="Số lượng khách" type="number" value={walkinGuests} onChange={(e) => setWalkinGuests(e.target.value)} autoFocus />
            <ErrorText>{err}</ErrorText>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="secondary" onClick={() => setMode('menu')}>
                Quay lại
              </Button>
              <Button onClick={openTable} disabled={busy || !walkinGuests}>
                {busy ? 'Đang mở...' : 'Mở bàn'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
