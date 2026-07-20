import { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ReceiptText,
  Building2,
  MapPin,
  Users,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Table, Badge, ErrorText, Select } from '../components/ui'
import { companiesApi, type Company } from '../api/companies'
import { branchesApi, type Branch } from '../api/branches'
import { useAuth } from '../context/AuthContext'
import { reportsApi, type DashboardData, type AdminOverview } from '../api/reports'
import { errMsg } from '../lib/errMsg'

const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + '₫'
const compact = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1).replace('.0', '') + 'M₫' : new Intl.NumberFormat('vi-VN').format(Math.round(n)) + '₫'

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const dayLabel = (period: string) => {
  const d = new Date(period + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? period.slice(5) : WEEKDAY[d.getDay()]
}
const growthOf = (cur: number, prev: number) =>
  prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0

export default function Dashboard() {
  const { staff } = useAuth()
  const isSuperAdmin = staff?.role === 'SUPER_ADMIN'

  const isCompanyAdmin = staff?.role === 'COMPANY_ADMIN'

  const [data, setData] = useState<DashboardData | null>(null)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [companyId, setCompanyId] = useState<number | ''>('')
  const [branchId, setBranchId] = useState<number | ''>('')

  const [companies, setCompanies] = useState<Company[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  // Load companies and branches metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        if (isSuperAdmin) {
          const cs = await companiesApi.list()
          setCompanies(cs)
        }
        if (isSuperAdmin || isCompanyAdmin) {
          const bs = await branchesApi.list()
          setBranches(bs)
        }
      } catch (e) {
        console.error('Failed to load meta', e)
      }
    }
    loadMeta()
  }, [isSuperAdmin, isCompanyAdmin])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const d = await reportsApi.dashboard(companyId, branchId)
        if (!cancelled) setData(d)
        if (isSuperAdmin && !companyId && !branchId) {
          const o = await reportsApi.adminOverview()
          if (!cancelled) setOverview(o)
        } else {
          if (!cancelled) setOverview(null) // Hide overview if filtered
        }
      } catch (e) {
        if (!cancelled) setErr(errMsg(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isSuperAdmin, companyId, branchId])

  const guestsToday = useMemo(
    () => Number(data?.today.total_guests ?? 0),
    [data],
  )

  const totalRevenue = useMemo(
    () => (overview?.companies ?? []).reduce((s, c) => s + c.revenue_month, 0),
    [overview],
  )
  const monthGrowth = useMemo(() => {
    if (!overview) return undefined
    const prev = overview.companies.reduce((s, c) => s + c.revenue_prev, 0)
    return Math.round(growthOf(totalRevenue, prev) * 10) / 10
  }, [overview, totalRevenue])

  if (loading) {
    return <p className="py-16 text-center text-slate-400">Đang tải số liệu…</p>
  }

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Tổng quan hệ thống</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isSuperAdmin
                ? 'Toàn bộ công ty trong hệ thống iGourmet'
                : staff?.company_name
                  ? `Phạm vi: ${staff.company_name}`
                  : 'Bảng điều khiển quản lý'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isSuperAdmin && (
              <Select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value ? Number(e.target.value) : '')
                  setBranchId('') // Reset branch when company changes
                }}
                className="w-full sm:w-auto"
              >
                <option value="">Tất cả công ty</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
            {(isSuperAdmin || isCompanyAdmin) && (
              <Select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
                className="w-full sm:w-auto"
              >
                <option value="">Tất cả chi nhánh</option>
                {branches
                  .filter((b) => !companyId || b.company_id === companyId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </Select>
            )}
          </div>
        </div>

      <ErrorText>{err}</ErrorText>

      {/* KPI chinh (so lieu that) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Wallet} label="Doanh thu hôm nay" value={compact(data?.today.revenue ?? 0)} tint="emerald" />
        <KpiCard
          icon={TrendingUp}
          label="Doanh thu tháng"
          value={compact(data?.month.revenue ?? 0)}
          tint="indigo"
          growth={monthGrowth}
        />
        <KpiCard icon={ReceiptText} label="Đơn hôm nay" value={String(data?.today.total_orders ?? 0)} tint="amber" />
        <KpiCard icon={Users} label="Khách hôm nay" value={String(guestsToday)} tint="rose" />
      </div>

      {/* The he thong - chi SUPER_ADMIN */}
      {isSuperAdmin && overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MiniStat icon={Building2} label="Công ty" value={overview.system.companies} />
          <MiniStat icon={MapPin} label="Chi nhánh" value={overview.system.branches} />
          <MiniStat icon={Users} label="Nhân viên" value={overview.system.employees} />
        </div>
      )}

      {/* Hieu suat theo cong ty - chi SUPER_ADMIN */}
      {isSuperAdmin && overview && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Hiệu suất theo công ty</h2>
          <Table headers={['Công ty', 'Chi nhánh', 'Nhân viên', 'Doanh thu tháng', 'Tăng trưởng', 'Tỉ trọng', 'Trạng thái']}>
            {overview.companies.map((c) => {
              const share = totalRevenue ? Math.round((c.revenue_month / totalRevenue) * 100) : 0
              return (
                <tr key={c.id} className="text-slate-700">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3">{c.branches}</td>
                  <td className="px-4 py-3">{c.employees}</td>
                  <td className="px-4 py-3 font-medium">{vnd(c.revenue_month)}</td>
                  <td className="px-4 py-3">
                    <GrowthTag value={Math.round(growthOf(c.revenue_month, c.revenue_prev) * 10) / 10} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{share}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="bg-green-100 text-green-700">{c.status}</Badge>
                  </td>
                </tr>
              )
            })}
          </Table>
        </section>
      )}

      {/* Bieu do doanh thu + mon ban chay (so lieu that) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Doanh thu 7 ngày (triệu ₫)</h2>
          <RevenueBars
            data={(data?.revenue_7d ?? []).map((d) => ({
              label: dayLabel(d.period),
              value: Math.round((d.revenue / 1_000_000) * 10) / 10,
            }))}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">Món bán chạy tháng này</h2>
          </div>
          {!data?.top_items.length ? (
            <p className="py-6 text-center text-sm text-slate-400">Chưa có dữ liệu bán hàng.</p>
          ) : (
            <ul className="space-y-3">
              {data.top_items.map((it, i) => (
                <li key={it.menu_item_id ?? i} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{it.item_name}</p>
                    <p className="text-xs text-slate-400">Đã bán {Number(it.total_quantity).toLocaleString('vi-VN')}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{compact(Number(it.total_revenue))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

const TINTS: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tint,
  growth,
}: {
  icon: LucideIcon
  label: string
  value: string
  tint: keyof typeof TINTS | string
  growth?: number
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${TINTS[tint] ?? TINTS.indigo}`}>
          <Icon size={20} />
        </div>
        {growth !== undefined && <GrowthTag value={growth} />}
      </div>
      <div className="mt-4 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  )
}

function GrowthTag({ value }: { value: number }) {
  const up = value >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
      }`}
    >
      <Icon size={12} />
      {up ? '+' : ''}
      {value}%
    </span>
  )
}

function RevenueBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const MAX_H = 150
  if (!data.length) {
    return <p className="py-6 text-center text-sm text-slate-400">Chưa có dữ liệu doanh thu.</p>
  }
  return (
    <div className="flex items-end justify-between gap-3">
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-medium text-slate-500">{d.value}</span>
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-indigo-400 transition-all"
            style={{ height: `${Math.round((d.value / max) * MAX_H)}px` }}
          />
          <span className="text-xs text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
