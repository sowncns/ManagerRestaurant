import { useState, useMemo } from 'react'
import { Clock, User, Armchair } from 'lucide-react'
import type { DiningTable, TableStatus } from '../../api/tables'
import { cn } from '../../lib/cn'



interface CardMeta {
  label: string
  card: string
  badge: string
}

const statusMeta: Record<TableStatus, CardMeta> = {
  AVAILABLE: {
    label: 'TRỐNG',
    card: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 active:scale-[0.98]',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
  SERVING: {
    label: 'ĐANG PHỤC VỤ',
    card: 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 active:scale-[0.98]',
    badge: 'bg-emerald-600 text-white',
  },
  RESERVED: {
    label: 'ĐẶT TRƯỚC',
    card: 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 active:scale-[0.98]',
    badge: 'bg-amber-600 text-white',
  },
  WAIT_PAYMENT: {
    label: 'CHỜ THANH TOÁN',
    card: 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 active:scale-[0.98]',
    badge: 'bg-purple-600 text-white',
  },
  DISABLE: {
    label: 'NGƯNG DÙNG',
    card: 'bg-slate-100 dark:bg-slate-900 border-slate-200 opacity-50 cursor-not-allowed',
    badge: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
  },
}

interface Group {
  key: string
  name: string
  tables: DiningTable[]
}

function groupBySection(tables: DiningTable[]): Group[] {
  const groups: Group[] = []
  const index = new Map<string, Group>()
  for (const t of tables) {
    const key = t.section_id != null ? String(t.section_id) : 'none'
    let g = index.get(key)
    if (!g) {
      g = { key, name: t.section_name || 'Khu vực khác', tables: [] }
      index.set(key, g)
      groups.push(g)
    }
    g.tables.push(t)
  }
  return groups
}

export default function TableGridView({
  tables,
  onSelect,
  onCheckin,
}: {
  tables: DiningTable[]
  onSelect: (t: DiningTable) => void
  onCheckin?: (reservationId: number) => void
}) {
  const [active, setActive] = useState<string>('all')

  const groups = useMemo(() => groupBySection(tables), [tables])

  if (tables.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">Chưa có bàn nào trong hệ thống.</p>
  }

  const displayedGroups = active === 'all' ? groups : groups.filter((g) => g.key === active)

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Section Filter Pills - Horizontal Scrollable */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-200/60 dark:border-slate-800">
        <button
          onClick={() => setActive('all')}
          className={cn(
            'shrink-0 h-9 px-4 rounded-full text-xs font-semibold transition-all select-none cursor-pointer',
            active === 'all'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100',
          )}
        >
          Tất cả ({tables.length})
        </button>
        {groups.map((g) => (
          <button
            key={g.key}
            onClick={() => setActive(g.key)}
            className={cn(
              'shrink-0 h-9 px-4 rounded-full text-xs font-semibold transition-all select-none cursor-pointer',
              active === g.key
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100',
            )}
          >
            {g.name} ({g.tables.length})
          </button>
        ))}
      </div>

      {/* Grouped Sections List matching User UI Design */}
      {displayedGroups.map((g) => (
        <div key={g.key} className="space-y-3">
          {/* Section Header with Green Vertical Accent */}
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {g.name} <span className="text-xs font-normal text-slate-400">({g.tables.length} bàn)</span>
            </h2>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {g.tables.map((t) => {
              const meta = statusMeta[t.status]
              const disabled = t.status === 'DISABLE'
              const isPaid = t.status === 'SERVING' && t.active_order_id == null

              const tableName = t.table_number

              return (
                <button
                  key={t.id}
                  disabled={disabled}
                  onClick={() => onSelect(t)}
                  className={cn(
                    'flex flex-col justify-between min-h-[110px] p-3.5 rounded-2xl border text-left transition-all duration-150 select-none cursor-pointer shadow-xs',
                    meta.card,
                  )}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between w-full">
                    <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider', meta.badge)}>
                      {isPaid ? 'ĐÃ XONG' : meta.label}
                    </span>
                  </div>

                  {/* Armchair Icon & Table Name + Capacity */}
                  <div className="my-2 flex items-center gap-2">
                    <Armchair size={18} className="text-slate-700 dark:text-slate-300 shrink-0" />
                    <div className="flex items-baseline gap-1 truncate">
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                        {tableName}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">({t.capacity} chỗ)</span>
                    </div>
                  </div>

                  {/* Subtitle / Order Amount */}
                  <div className="flex items-center justify-between w-full text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      {t.active_order_amount > 0
                        ? `${Number(t.active_order_amount).toLocaleString('vi-VN')}đ`
                        : t.status === 'AVAILABLE'
                        ? 'Trống'
                        : isPaid
                        ? 'Khách đang ngồi'
                        : meta.label}
                    </span>

                    {t.upcoming_reservation && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onCheckin) onCheckin(t.upcoming_reservation!.id)
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 px-1.5 py-0.5 rounded"
                      >
                        <Clock size={10} />
                        {t.upcoming_reservation.reservation_time?.slice(0, 5)}
                      </span>
                    )}
                  </div>

                  {t.active_waiter_name && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      <User size={10} />
                      <span className="truncate">{t.active_waiter_name}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
