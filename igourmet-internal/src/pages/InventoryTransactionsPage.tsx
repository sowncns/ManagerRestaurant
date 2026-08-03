import { useEffect, useMemo, useState } from 'react'
import { inventoryApi, type Ingredient, type StockTxn, type StockTxnType } from '../api/inventory'
import { api } from '../lib/api'
import { errMsg } from '../lib/errMsg'
import { PageHeader, Table, Select, ErrorText } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const num = (v: number | string) => new Intl.NumberFormat('vi-VN').format(Number(v || 0))

const TXN_LABELS: Record<string, string> = {
  PURCHASE: 'Nhập kho',
  SALE_CONSUMPTION: 'Bán hàng',
  INTERNAL_TRANSFER: 'Chuyển kho',
  RETURN_SUPPLIER: 'Trả NCC',
  WASTE: 'Hao hụt',
  STOCK_ADJUSTMENT: 'Điều chỉnh',
  STOCK_COUNT: 'Kiểm kê',
}

const TXN_COLORS: Record<string, string> = {
  PURCHASE: 'text-green-600',
  SALE_CONSUMPTION: 'text-red-600',
  WASTE: 'text-red-600',
  RETURN_SUPPLIER: 'text-red-600',
  STOCK_ADJUSTMENT: 'text-amber-600',
  STOCK_COUNT: 'text-blue-600',
  INTERNAL_TRANSFER: 'text-blue-600',
}

function fmtDate(s: string) {
  const d = new Date(s)
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function InventoryTransactionsPage() {
  const { staff } = useAuth()
  const isSuperAdmin = staff?.role === 'SUPER_ADMIN'
  const isCompanyAdmin = staff?.role === 'COMPANY_ADMIN'

  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([])
  const [branches, setBranches] = useState<{ id: number; company_id: number; name: string }[]>([])
  const [companyId, setCompanyId] = useState<number | undefined>(undefined)
  const [branchId, setBranchId] = useState<number | undefined>(undefined)

  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [txns, setTxns] = useState<StockTxn[]>([])
  const [filterIngredient, setFilterIngredient] = useState<number | undefined>(undefined)
  const [filterType, setFilterType] = useState<StockTxnType | ''>('')
  const [err, setErr] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!isSuperAdmin) return
    api.get('/public/companies').then(({ data }) => setCompanies(data.companies ?? [])).catch(() => {})
  }, [isSuperAdmin])

  useEffect(() => {
    if (!isSuperAdmin && !isCompanyAdmin) return
    api.get('/internal/branches').then(({ data }) => setBranches(data.branches ?? [])).catch(() => {})
  }, [isSuperAdmin, isCompanyAdmin])

  const ready = (!isSuperAdmin && !isCompanyAdmin) || branchId !== undefined

  useEffect(() => {
    if (!ready) return
    inventoryApi.listIngredients(companyId, branchId).then(setIngredients).catch(() => {})
  }, [ready, companyId, branchId])

  useEffect(() => { setPage(1) }, [companyId, branchId, filterIngredient])

  useEffect(() => {
    if (!ready) return
    setErr('')
    inventoryApi
      .transactions(companyId, branchId, filterIngredient, page)
      .then(({ transactions, pagination }) => { setTxns(transactions); setTotalPages(pagination?.totalPages || 1) })
      .catch((e) => setErr(errMsg(e)))
  }, [ready, companyId, branchId, filterIngredient, page])

  const visible = useMemo(() => {
    if (!filterType) return txns
    return txns.filter((t) => (t.transaction_type || t.type) === filterType)
  }, [txns, filterType])

  return (
    <div>
      <PageHeader title="Lịch sử kho" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {isSuperAdmin && (
          <Select
            value={companyId ?? ''}
            onChange={(e) => { setCompanyId(e.target.value ? Number(e.target.value) : undefined); setBranchId(undefined) }}
            className="w-56 py-1"
          >
            <option value="">-- Chọn công ty --</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        {(isSuperAdmin || isCompanyAdmin) && (
          <Select
            value={branchId ?? ''}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-56 py-1"
            disabled={isSuperAdmin && !companyId}
          >
            <option value="">-- Chọn chi nhánh --</option>
            {branches.filter((b) => !companyId || b.company_id === companyId).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        )}
        {ready && (
          <>
            <Select
              value={filterIngredient ?? ''}
              onChange={(e) => setFilterIngredient(e.target.value ? Number(e.target.value) : undefined)}
              className="w-56 py-1"
            >
              <option value="">-- Tất cả nguyên liệu --</option>
              {ingredients.map((i) => <option key={i.id} value={i.id}>{i.ingredient_name}</option>)}
            </Select>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as StockTxnType | '')}
              className="w-44 py-1"
            >
              <option value="">-- Tất cả loại --</option>
              {Object.entries(TXN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </>
        )}
      </div>

      <ErrorText>{err}</ErrorText>

      {!ready ? (
        <p className="py-10 text-center text-sm text-slate-400">Vui lòng chọn công ty và chi nhánh để xem lịch sử kho.</p>
      ) : (
        <>
        {totalPages > 1 && (
          <div className="mb-3 flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-40">← Trước</button>
            <span className="text-sm text-slate-600">Trang {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-40">Sau →</button>
          </div>
        )}

        <Table headers={['Thời gian', 'Nguyên liệu', 'Loại', 'Số lượng', 'Trước', 'Sau', 'Người thực hiện', 'Ghi chú']}>
          {visible.map((t, idx) => {
            const txType = (t.transaction_type || t.type) as string
            const qty = Number(t.quantity)
            return (
              <tr key={t.id ?? idx}>
                <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{t.ingredient_name}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${TXN_COLORS[txType] || 'text-slate-600'}`}>
                    {TXN_LABELS[txType] || txType}
                  </span>
                </td>
                <td className={`px-4 py-3 font-semibold ${qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {qty > 0 ? '+' : ''}{num(qty)} {t.unit}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{t.stock_before != null ? num(t.stock_before) : '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{t.stock_after != null ? num(t.stock_after) : '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{t.created_by_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate" title={t.note || ''}>{t.note || '-'}</td>
              </tr>
            )
          })}
          {visible.length === 0 && (
            <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">Không có dữ liệu</td></tr>
          )}
        </Table>
        </>
      )}
    </div>
  )
}
