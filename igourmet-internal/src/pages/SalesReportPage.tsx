import { useEffect, useMemo, useState } from 'react'
import { Table, Select, Input, ErrorText, PageHeader } from '../components/ui'
import { companiesApi, type Company } from '../api/companies'
import { branchesApi, type Branch } from '../api/branches'
import { useAuth } from '../context/AuthContext'
import { reportsApi, type TopItem } from '../api/reports'
import { errMsg } from '../lib/errMsg'

const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + '₫'
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SalesReportPage() {
  const { staff } = useAuth()
  const isSuperAdmin = staff?.role === 'SUPER_ADMIN'
  const isCompanyAdmin = staff?.role === 'COMPANY_ADMIN'

  const [from, setFrom] = useState(todayStr())
  const [to, setTo] = useState(todayStr())
  const [companyId, setCompanyId] = useState<number | ''>('')
  const [branchId, setBranchId] = useState<number | ''>('')

  const [companies, setCompanies] = useState<Company[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [items, setItems] = useState<TopItem[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    async function loadMeta() {
      try {
        if (isSuperAdmin) setCompanies(await companiesApi.list())
        if (isSuperAdmin || isCompanyAdmin) setBranches(await branchesApi.list())
      } catch {
        // meta khong bat buoc
      }
    }
    loadMeta()
  }, [isSuperAdmin, isCompanyAdmin])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setErr('')
      try {
        const rows = await reportsApi.topItems({ from, to, companyId, branchId })
        if (!cancelled) setItems(rows)
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
  }, [from, to, companyId, branchId])

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, it) => ({
          qty: acc.qty + Number(it.total_quantity),
          revenue: acc.revenue + Number(it.total_revenue),
        }),
        { qty: 0, revenue: 0 },
      ),
    [items],
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Món đã bán" />

      <div className="flex flex-wrap items-end gap-3">
        <Input label="Từ ngày" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Đến ngày" type="date" value={to} min={from} max={todayStr()} onChange={(e) => setTo(e.target.value)} />
        {isSuperAdmin && (
          <Select
            label="Công ty"
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value ? Number(e.target.value) : '')
              setBranchId('')
            }}
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
            label="Chi nhánh"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
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

      <ErrorText>{err}</ErrorText>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Tổng số phần đã bán</div>
            <div className="text-xl font-semibold text-slate-900">{totals.qty.toLocaleString('vi-VN')}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <div className="text-xs text-emerald-600">Tổng doanh thu (chỉ đơn đã hoàn tất)</div>
            <div className="text-xl font-semibold text-emerald-700">{vnd(totals.revenue)}</div>
          </div>
        </div>

        {loading ? (
          <p className="py-10 text-center text-slate-400">Đang tải…</p>
        ) : !items.length ? (
          <p className="py-10 text-center text-sm text-slate-400">Không có món nào bán trong khoảng ngày này.</p>
        ) : (
          <Table headers={['#', 'Món', 'Số lượng', 'Doanh thu']}>
            {items.map((it, i) => (
              <tr key={it.menu_item_id ?? i} className="text-slate-700">
                <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{it.item_name}</td>
                <td className="px-4 py-3">{Number(it.total_quantity).toLocaleString('vi-VN')}</td>
                <td className="px-4 py-3 font-medium">{vnd(Number(it.total_revenue))}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  )
}
