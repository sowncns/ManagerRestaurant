import { useEffect, useState, useCallback, useMemo } from 'react'
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
  CalendarCheck,
  FileText,
} from 'lucide-react'
import { tablesApi, type DiningTable, type Section, type TableStatus } from '../api/tables'
import { reservationsApi, type ReservationAlert, type Reservation } from '../api/reservations'
import { ordersApi } from '../api/orders'
import { checkoutApi, type VatInfo } from '../api/checkout'
import { errMsg } from '../lib/errMsg'
import { Button, Modal, Input, Select, ErrorText, Badge } from '../components/ui'
import { cn } from '../lib/cn'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const SLOT_MIN = 120

function toMin(t?: string | null) {
  if (!t) return 0
  const [h, m] = t.split(':')
  return Number(h) * 60 + Number(m)
}

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
  chip: string
  card: string
  accent: string
}

const statusMeta: Record<TableStatus, Meta> = {
  AVAILABLE: {
    label: 'Trống',
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    card: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500',
    accent: 'text-slate-800 dark:text-slate-200',
  },
  SERVING: {
    label: 'Đang phục vụ',
    chip: 'bg-emerald-600 text-white',
    card: 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 hover:border-emerald-500',
    accent: 'text-emerald-700 dark:text-emerald-400',
  },
  RESERVED: {
    label: 'Giữ chỗ',
    chip: 'bg-sky-600 text-white',
    card: 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 hover:border-sky-500',
    accent: 'text-sky-700 dark:text-sky-400',
  },
  WAIT_PAYMENT: {
    label: 'Chờ thanh toán',
    chip: 'bg-amber-600 text-white',
    card: 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 hover:border-amber-500',
    accent: 'text-amber-700 dark:text-amber-400',
  },
  DISABLE: {
    label: 'Ngưng',
    chip: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
    card: 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 opacity-60 cursor-not-allowed',
    accent: 'text-slate-400',
  },
}

const CONFLICT_META: Meta = {
  label: 'Sắp tới giờ hẹn',
  chip: 'bg-rose-600 text-white animate-pulse',
  card: 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-400 ring-2 ring-rose-300 dark:ring-rose-900',
  accent: 'text-rose-700 dark:text-rose-400',
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

  const load = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 60000)
    return () => clearInterval(timer)
  }, [load])

  const switchTable = async (reservationId: number, tableId: number) => {
    try {
      await reservationsApi.assignTable(reservationId, tableId)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const confirmReservation = async (r: Reservation, tableId: number) => {
    try {
      await reservationsApi.assignTable(r.id, tableId)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const rejectReservation = async (r: Reservation) => {
    if (!confirm(`Từ chối phiếu đặt của ${r.customer_name}?`)) return
    try {
      await reservationsApi.cancel(r.id)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const checkinReservation = async (id: number) => {
    try {
      await reservationsApi.checkin(id)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const cancelReservation = async (id: number, label: string) => {
    if (!confirm(`Hủy phiếu đặt trước${label ? ` của ${label}` : ''}?`)) return
    try {
      await reservationsApi.cancel(id)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const pending = useMemo(() => reservations.filter((r) => r.status === 'PENDING'), [reservations])

  const q = search.trim().toLowerCase()
  const bookedResults = useMemo(() => {
    if (!q) return []
    return reservations.filter(
      (r) =>
        r.status !== 'CANCELLED' &&
        r.status !== 'COMPLETED' &&
        [r.customer_name, r.customer_phone, r.table_number, r.reservation_code].some((f) =>
          (f ?? '').toString().toLowerCase().includes(q),
        ),
    )
  }, [reservations, q])

  const conflictByTable = useMemo(() => {
    const map = new Map<string, ReservationAlert>()
    for (const a of alerts) {
      if ((a.state === 'CONFLICT' || a.state === 'OVERDUE') && a.table_number) {
        map.set(a.table_number, a)
      }
    }
    return map
  }, [alerts])

  const today = todayStr()
  const upcomingByTableId = useMemo(() => {
    const map = new Map<number, Reservation>()
    for (const r of reservations) {
      if (r.status === 'CONFIRMED' && r.table_id && r.reservation_date?.startsWith(today)) {
        const existing = map.get(r.table_id)
        if (!existing || (r.reservation_time ?? '') < (existing.reservation_time ?? '')) {
          map.set(r.table_id, r)
        }
      }
    }
    return map
  }, [reservations, today])

  const noSection = useMemo(() => tables.filter((t) => !t.section_id), [tables])
  const countTrong = useMemo(
    () => tables.filter((t) => t.status === 'AVAILABLE' && !t.upcoming_reservation && !upcomingByTableId.has(t.id)).length,
    [tables, upcomingByTableId],
  )
  const countServing = useMemo(() => tables.filter((t) => t.status === 'SERVING').length, [tables])
  const countHeld = useMemo(() => reservations.filter((r) => r.status === 'CONFIRMED').length, [reservations])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarCheck size={22} className="text-emerald-600" /> Sơ Đồ Bàn Lễ Tân
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Chạm vào bàn để mở bàn, giữ chỗ hoặc nhận khách đến</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} loading={loading} leftIcon={<RefreshCw size={14} />}>
          Làm mới
        </Button>
      </div>

      {/* Thống Kê Nhanh (Stat Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Bàn trống" value={countTrong} tone="bg-emerald-500 text-white" />
        <StatTile label="Đang phục vụ" value={countServing} tone="bg-emerald-600 text-white" />
        <StatTile label="Đã giữ chỗ" value={countHeld} tone="bg-sky-600 text-white" />
        <StatTile label="App chờ xác nhận" value={pending.length} tone="bg-amber-500 text-white" />
      </div>

      {/* Thông báo đặt bàn từ App */}
      <section className="overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-xs">
        <button
          onClick={() => setPendingExpanded(!pendingExpanded)}
          className="flex w-full items-center gap-2 bg-emerald-600 dark:bg-emerald-700 px-4 py-3 text-white transition-colors cursor-pointer select-none"
        >
          <BellRing size={18} />
          <span className="text-sm font-bold">Đặt Bàn Từ App Chờ Duyệt</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-extrabold">
              {pending.length}
            </span>
            <ChevronDown
              size={18}
              className={cn('transition-transform duration-200', pendingExpanded && 'rotate-180')}
            />
          </span>
        </button>
        {pendingExpanded && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-4">
            {pending.length === 0 ? (
              <p className="py-2 text-center text-xs font-medium text-slate-400">
                Chưa có đơn đặt bàn mới từ App · Tự động cập nhật mỗi phút
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

      {/* Tim Kiem Phieu Dat */}
      <div className="relative w-full max-w-md">
        <Input
          placeholder="Tìm bàn đã đặt: tên khách, SĐT, số bàn..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={16} />}
        />
        {q && (
          <div className="absolute top-12 left-0 right-0 z-30 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl max-h-60 overflow-y-auto">
            {bookedResults.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-400">Không tìm thấy thông tin phù hợp.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {bookedResults.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={15} className="text-slate-400" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {r.table_number || 'Chưa gán'}
                        </span>
                        <span className="ml-2 text-slate-500">
                          {r.customer_name} ({r.customer_phone}) · {r.reservation_time?.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                    {r.status !== 'CHECKED_IN' && (
                      <button
                        title="Hủy phiếu đặt"
                        onClick={() => void cancelReservation(r.id, r.customer_name)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Cảnh Báo Xung Đột Bàn */}
      {conflictByTable.size > 0 && (
        <div className="space-y-2">
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

      {/* Horizontal Tabs - Section Selector */}
      {(sections.length > 0 || noSection.length > 0) && (
        <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-200/60 dark:border-slate-800">
          <button
            onClick={() => setActiveSectionId('all')}
            className={cn(
              'shrink-0 h-9 px-4 rounded-full text-xs font-semibold transition-all select-none cursor-pointer',
              activeSectionId === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100',
            )}
          >
            Tất cả khu vực ({tables.length})
          </button>
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSectionId(sec.id)}
              className={cn(
                'shrink-0 h-9 px-4 rounded-full text-xs font-semibold transition-all select-none cursor-pointer',
                activeSectionId === sec.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100',
              )}
            >
              {sec.name} ({tables.filter((t) => t.section_id === sec.id).length})
            </button>
          ))}
          {noSection.length > 0 && (
            <button
              onClick={() => setActiveSectionId('none')}
              className={cn(
                'shrink-0 h-9 px-4 rounded-full text-xs font-semibold transition-all select-none cursor-pointer',
                activeSectionId === 'none'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100',
              )}
            >
              Chưa gán khu vực ({noSection.length})
            </button>
          )}
        </div>
      )}

      {/* Grid Danh Sách Khu Vực & Bàn */}
      <div className="space-y-8">
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
      </div>

      {/* Modal Thao tác Bàn */}
      {selected && (
        <TableActionModal
          table={selected}
          tableReservations={reservations
            .filter(
              (r) =>
                r.table_id === selected.id &&
                r.status !== 'CANCELLED' &&
                r.status !== 'COMPLETED',
            )
            .sort((x, y) => (x.reservation_time ?? '').localeCompare(y.reservation_time ?? ''))}
          onCancelReservation={(id, name) => void cancelReservation(id, name)}
          onCheckinReservation={async (id) => {
            await checkinReservation(id)
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
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex items-center gap-3">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-xs', tone)}>
        {value}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-base font-bold text-slate-900 dark:text-slate-100">{value} bàn</span>
      </div>
    </div>
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
    <section className="space-y-3">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <span className="h-4 w-1 rounded bg-emerald-600" />
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{name}</h2>
        <span className="text-xs font-semibold text-slate-400">({tables.length} bàn)</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
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
  upcoming?: Pick<Reservation, 'customer_name' | 'reservation_time'>
  onSelect: (t: DiningTable) => void
}) {
  const displayStatus: TableStatus =
    t.status === 'AVAILABLE' && upcoming ? 'RESERVED' : t.status
  const baseMeta = conflict ? CONFLICT_META : statusMeta[displayStatus] ?? statusMeta.AVAILABLE

  const isPaid = t.status === 'SERVING' && t.active_order_id == null
  const meta = {
    ...baseMeta,
    label: isPaid ? 'Đã thanh toán' : baseMeta.label,
    chip: isPaid ? 'bg-emerald-600 text-white' : baseMeta.chip,
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(t)}
      className={cn(
        'relative flex flex-col justify-between min-h-[100px] p-3 rounded-xl border transition-all duration-150 text-left cursor-pointer select-none shadow-xs',
        meta.card,
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider', meta.chip)}>
          {meta.label}
        </span>
        {(upcoming || conflict) && <BellRing size={13} className="text-rose-500 animate-pulse" />}
      </div>

      <div className="my-2 flex items-center gap-1.5">
        <Armchair size={16} className={meta.accent} />
        <span className={cn('text-xl font-bold tracking-tight', meta.accent)}>{t.table_number}</span>
        <span className="text-xs text-slate-400">({t.capacity} chỗ)</span>
      </div>

      <div className="text-[11px] font-medium leading-tight">
        {conflict ? (
          <span className="text-rose-600 font-bold">
            Hẹn {conflict.reservation_time?.slice(0, 5)} · {conflict.customer_name}
          </span>
        ) : t.status === 'SERVING' && t.active_order_amount > 0 ? (
          <span className="text-emerald-600 font-bold">
            {Number(t.active_order_amount).toLocaleString('vi-VN')}đ
          </span>
        ) : isPaid ? (
          <span className="text-emerald-600 font-semibold">Khách đang ngồi</span>
        ) : upcoming ? (
          <span className="flex items-center gap-1 text-sky-600 font-semibold">
            <Clock size={10} />
            {upcoming.reservation_time?.slice(0, 5)} · {upcoming.customer_name}
          </span>
        ) : (
          <span className="text-slate-400">Trống</span>
        )}
      </div>
    </button>
  )
}

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
  const free = tables.filter(
    (t) =>
      t.status === 'AVAILABLE' &&
      t.capacity >= (a.guest_count ?? 1) &&
      !hasTimeConflict(reservations, t.id, a.reservation_date, a.reservation_time, a.id),
  )
  const [tableId, setTableId] = useState<string>('')

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-200">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle size={16} className="text-rose-600 shrink-0" />
        <span>{a.message}</span>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Select value={tableId} onChange={(e) => setTableId(e.target.value)} className="h-8 text-xs bg-white dark:bg-slate-900">
          <option value="">-- Chọn bàn trống thay thế --</option>
          {free.map((t) => (
            <option key={t.id} value={t.id}>
              {t.table_number} ({t.capacity} chỗ)
            </option>
          ))}
        </Select>
        <Button variant="danger" size="sm" disabled={!tableId} onClick={() => tableId && onSwitch(Number(tableId))} className="h-8 text-xs shrink-0">
          <ArrowLeftRight size={13} /> Chuyển bàn
        </Button>
      </div>
    </div>
  )
}

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
  const options = tables.filter(
    (t) =>
      t.capacity >= (r.guest_count ?? 1) &&
      !hasTimeConflict(reservations, t.id, r.reservation_date, r.reservation_time, r.id),
  )
  const [tableId, setTableId] = useState<string>('')

  return (
    <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
          <Users size={15} />
        </div>
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            {r.customer_name} <span className="text-emerald-600 font-semibold">({r.guest_count} khách)</span>
          </div>
          <div className="text-slate-500 font-medium mt-0.5">
            {r.customer_phone} · {r.reservation_time?.slice(0, 5)} {r.reservation_date?.slice(0, 10)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Select value={tableId} onChange={(e) => setTableId(e.target.value)} className="h-8 text-xs bg-white dark:bg-slate-900">
          <option value="">-- Xếp bàn --</option>
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.table_number} ({t.capacity} chỗ)
            </option>
          ))}
        </Select>
        <Button size="sm" disabled={!tableId} onClick={() => tableId && onConfirm(Number(tableId))} className="h-8 text-xs font-bold" leftIcon={<Check size={14} />}>
          Duyệt
        </Button>
        <button onClick={onReject} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

function TableActionModal({
  table,
  tableReservations,
  onCancelReservation,
  onCheckinReservation,
  onClose,
  onSaved,
}: {
  table: DiningTable
  tableReservations: Reservation[]
  onCancelReservation: (id: number, name: string) => void
  onCheckinReservation: (id: number) => Promise<void>
  onClose: () => void
  onSaved: () => void
}) {
  const [mode, setMode] = useState<'menu' | 'hold' | 'open' | 'vat'>('menu')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [guests, setGuests] = useState(String(table.capacity))
  const [walkinGuests, setWalkinGuests] = useState(String(table.capacity))
  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  // VAT info state
  const [vatCompany, setVatCompany] = useState('')
  const [vatTax, setVatTax] = useState('')
  const [vatAddress, setVatAddress] = useState('')
  const [vatEmail, setVatEmail] = useState('')
  const [vatSaved, setVatSaved] = useState(false)
  const [vatLoading, setVatLoading] = useState(false)

  const openTable = async () => {
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

  const hold = async () => {
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

  const openVatMode = async () => {
    setMode('vat')
    setVatLoading(true)
    try {
      const existing = await checkoutApi.getTableVat(table.id)
      if (existing) {
        setVatCompany(existing.companyName ?? '')
        setVatTax(existing.taxCode ?? '')
        setVatAddress(existing.address ?? '')
        setVatEmail(existing.email ?? '')
      }
    } catch {
      // ignore — form will be blank if no prior data
    } finally {
      setVatLoading(false)
    }
  }

  const saveVat = async () => {
    if (!vatTax.trim() || !vatCompany.trim()) {
      setErr('Vui lòng nhập Tên công ty và Mã số thuế.')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const payload: VatInfo = {
        companyName: vatCompany.trim(),
        taxCode: vatTax.trim(),
        address: vatAddress.trim(),
        email: vatEmail.trim(),
      }
      await checkoutApi.saveTableVat(table.id, payload)
      setVatSaved(true)
      setTimeout(() => setMode('menu'), 1200)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open title={`Thao Tác Bàn ${table.table_name || table.table_number}`} onClose={onClose}>
      <div className="flex flex-col gap-4 text-xs">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
          <span className="font-bold text-slate-700 dark:text-slate-200">
            Sức chứa: {table.capacity} chỗ · {table.section_name || 'Khu vực chung'}
          </span>
          <Badge variant="success" className="font-bold">
            {table.status}
          </Badge>
        </div>

        {tableReservations.length > 0 && (
          <div className="space-y-2 border border-sky-200 dark:border-sky-800 p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/30">
            <div className="font-bold text-sky-800 dark:text-sky-300">Lịch Đặt Bàn Đang Có ({tableReservations.length})</div>
            <div className="space-y-1.5">
              {tableReservations.map((r) => {
                return (
                  <div key={r.id} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {r.reservation_time?.slice(0, 5)} · {r.customer_name} ({r.guest_count} khách)
                      </span>
                      {r.status !== 'CHECKED_IN' && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={() => onCheckinReservation(r.id)}
                            disabled={table.status === 'SERVING'}
                            className="h-7 text-[11px] font-bold"
                          >
                            Nhận khách
                          </Button>
                          <button
                            onClick={() => onCancelReservation(r.id, r.customer_name)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {mode === 'menu' ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={busy || table.status === 'SERVING'}
              onClick={() => setMode('open')}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-100 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <DoorOpen size={24} />
              <span>Mở Bàn Vãng Lai</span>
            </button>

            <button
              onClick={() => setMode('hold')}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-sky-300 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-bold hover:bg-sky-100 cursor-pointer select-none"
            >
              <BookmarkPlus size={24} />
              <span>Giữ Bàn / Đặt Trước</span>
            </button>

            {/* VAT button — chỉ hiển thị khi bàn đang phục vụ hoặc chờ thanh toán */}
            {(table.status === 'SERVING' || table.status === 'WAIT_PAYMENT') && (
              <button
                onClick={() => void openVatMode()}
                className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-violet-300 bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 font-bold hover:bg-violet-100 cursor-pointer select-none"
              >
                <FileText size={20} />
                <span>Xuất Hóa Đơn VAT (Hóa Đơn Đỏ)</span>
              </button>
            )}
          </div>
        ) : mode === 'hold' ? (
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Giữ chỗ đặt trước</h4>
            <Input label="Tên khách hàng" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Số lượng khách" type="number" value={guests} onChange={(e) => setGuests(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Ngày" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input label="Giờ (HH:mm)" value={time} onChange={(e) => setTime(e.target.value)} placeholder="19:00" />
            </div>
            <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
            <ErrorText>{err}</ErrorText>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setMode('menu')}>
                Quay lại
              </Button>
              <Button onClick={hold} loading={busy}>
                Lưu giữ bàn
              </Button>
            </div>
          </div>
        ) : mode === 'open' ? (
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Mở bàn cho khách vãng lai</h4>
            <Input label="Số lượng khách" type="number" value={walkinGuests} onChange={(e) => setWalkinGuests(e.target.value)} autoFocus />
            <ErrorText>{err}</ErrorText>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setMode('menu')}>
                Quay lại
              </Button>
              <Button onClick={openTable} loading={busy}>
                Xác nhận mở bàn
              </Button>
            </div>
          </div>
        ) : (
          /* VAT Form */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-violet-600" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Thông Tin Xuất Hóa Đơn VAT</h4>
            </div>

            <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-3 text-xs text-violet-700 dark:text-violet-300">
              Thông tin này sẽ được gắn với bill của bàn <strong>{table.table_name || table.table_number}</strong> và chuyển cho thu ngân xuất hóa đơn.
            </div>

            {vatLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
              </div>
            ) : (
              <>
                <Input
                  label="Tên công ty *"
                  placeholder="VD: Công ty TNHH ABC"
                  value={vatCompany}
                  onChange={(e) => setVatCompany(e.target.value)}
                  autoFocus
                />
                <Input
                  label="Mã số thuế *"
                  placeholder="VD: 0123456789"
                  value={vatTax}
                  onChange={(e) => setVatTax(e.target.value)}
                />
                <Input
                  label="Địa chỉ công ty"
                  placeholder="VD: 123 Nguyễn Văn A, Q.1, TP.HCM"
                  value={vatAddress}
                  onChange={(e) => setVatAddress(e.target.value)}
                />
                <Input
                  label="Email nhận hóa đơn"
                  type="email"
                  placeholder="VD: ketoan@congtyabc.vn"
                  value={vatEmail}
                  onChange={(e) => setVatEmail(e.target.value)}
                />
              </>
            )}

            <ErrorText>{err}</ErrorText>

            {vatSaved && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
                <Check size={14} /> Đã lưu thông tin VAT thành công!
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setMode('menu'); setErr(''); setVatSaved(false) }}>
                Quay lại
              </Button>
              <Button
                onClick={saveVat}
                loading={busy}
                disabled={vatLoading || vatSaved}
                className="bg-violet-600 hover:bg-violet-700 text-white border-violet-600"
              >
                <FileText size={14} /> Lưu thông tin VAT
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
