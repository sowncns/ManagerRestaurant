import { useState } from 'react'
import { Clock } from 'lucide-react'
import type { DiningTable, TableStatus } from '../../api/tables'
import { cn } from '../../lib/cn'

interface CardMeta {
  label: string
  card: string
  accent: string
}

const statusMeta: Record<TableStatus, CardMeta> = {
  AVAILABLE: { label: 'Trống', card: 'bg-white/80 backdrop-blur border-slate-200/60 hover:border-slate-300 hover:shadow-lg active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-300', accent: 'text-slate-500' },
  SERVING: { label: 'Đang phục vụ', card: 'bg-emerald-50/90 backdrop-blur border-emerald-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-300', accent: 'text-emerald-700' },
  RESERVED: { label: 'Giữ chỗ', card: 'bg-indigo-50/90 backdrop-blur border-indigo-200 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-300', accent: 'text-indigo-700' },
  WAIT_PAYMENT: { label: 'Chờ thanh toán', card: 'bg-orange-50/90 backdrop-blur border-orange-200 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/20 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-300', accent: 'text-orange-700' },
  DISABLE: { label: 'Ngưng', card: 'bg-slate-100/50 border-slate-200 opacity-60', accent: 'text-slate-400' },
}

interface Group {
  key: string
  name: string
  tables: DiningTable[]
}

// Gom ban theo khu vuc (section), giu thu tu xuat hien.
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

  if (tables.length === 0) {
    return <p className="text-sm text-slate-400">Chưa có bàn nào.</p>
  }
  const groups = groupBySection(tables)
  const shown = active === 'all' ? tables : (groups.find((g) => g.key === active)?.tables ?? tables)

  return (
    <div>
      <div className="sticky top-[49px] md:top-[45px] z-30 -mx-4 mb-6 flex gap-2.5 overflow-x-auto bg-white/95 px-4 py-3.5 backdrop-blur-xl shadow-sm border-b border-slate-200/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Tab active={active === 'all'} onClick={() => setActive('all')}>
          Tất cả
        </Tab>
        {groups.map((g) => (
          <Tab key={g.key} active={active === g.key} onClick={() => setActive(g.key)}>
            {g.name} ({g.tables.length})
          </Tab>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {shown.map((t) => {
          const meta = statusMeta[t.status]
          const disabled = t.status === 'DISABLE'
          const isPaid = t.status === 'SERVING' && t.active_order_id == null
          return (
            <button
              key={t.id}
              disabled={disabled}
              onClick={() => onSelect(t)}
              className={cn(
                'flex min-h-[110px] flex-col items-start rounded-2xl border p-4 text-left shadow-sm disabled:cursor-not-allowed',
                isPaid ? 'bg-teal-50/90 backdrop-blur border-teal-200 hover:border-teal-400 hover:shadow-lg hover:shadow-teal-500/20 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-300' : meta.card,
              )}
            >
              <span className="text-lg font-semibold text-slate-900">
                {t.table_name || `Bàn ${t.table_number}`}
              </span>
              <span className={cn('mt-0.5 text-xs font-medium', isPaid ? 'text-teal-700' : meta.accent)}>
                {isPaid ? 'Đã thanh toán' : meta.label}
              </span>
              <div className="mt-auto pt-2 flex items-center justify-between w-full text-xs text-slate-500">
                <span>
                  {t.active_order_amount > 0
                    ? `${Number(t.active_order_amount).toLocaleString('vi-VN')}đ`
                    : isPaid
                    ? 'Khách đang ngồi'
                    : `${t.capacity} chỗ`}
                </span>
                {t.upcoming_reservation && (
                  <button 
                    className="flex items-center gap-1 font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md transition-colors" 
                    title={`Nhận khách đặt lúc ${t.upcoming_reservation.reservation_time?.slice(0, 5)}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onCheckin) onCheckin(t.upcoming_reservation!.id)
                    }}
                  >
                    <Clock size={12} />
                    {t.upcoming_reservation.reservation_time?.slice(0, 5)}
                  </button>
                )}
              </div>
              {t.active_waiter_name && (
                <span className="truncate text-[11px] text-slate-400">{t.active_waiter_name}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ease-out active:scale-95',
        active
          ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md shadow-slate-900/20'
          : 'bg-white/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-sm border border-slate-200/60 hover:border-slate-300/80',
      )}
    >
      {children}
    </button>
  )
}
