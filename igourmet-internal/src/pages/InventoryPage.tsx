import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Power, FileInput, ArrowUpDown } from 'lucide-react'
import { inventoryApi, type Ingredient, type IngredientInput, type StockTxnType } from '../api/inventory'
import { procurementApi } from '../api/procurement'
import { api } from '../lib/api'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, Table, Modal, Input, Select, Badge, ErrorText } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const num = (v: number | string) => new Intl.NumberFormat('vi-VN').format(Number(v || 0))
const isLow = (i: Ingredient) => Number(i.current_stock) <= Number(i.minimum_stock)

export default function InventoryPage() {
  const { staff } = useAuth()
  const isSuperAdmin = staff?.role === 'SUPER_ADMIN'
  const isCompanyAdmin = staff?.role === 'COMPANY_ADMIN'
  const canDoTxn = staff?.role !== 'KITCHEN'
  const canManageIngredient = isSuperAdmin || isCompanyAdmin

  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([])
  const [branches, setBranches] = useState<{ id: number; company_id: number; name: string }[]>([])
  const [companyId, setCompanyId] = useState<number | undefined>(undefined)
  const [branchId, setBranchId] = useState<number | undefined>(undefined)
  const [list, setList] = useState<Ingredient[]>([])
  const [onlyLow, setOnlyLow] = useState(false)
  const [editing, setEditing] = useState<Ingredient | null>(null)
  const [adjusting, setAdjusting] = useState<Ingredient | null>(null)
  const [openForm, setOpenForm] = useState(false)
  const [openImport, setOpenImport] = useState(false)
  const [err, setErr] = useState('')

  // Super admin chon cong ty de xem kho.
  useEffect(() => {
    if (!isSuperAdmin) return
    api.get('/public/companies').then(({ data }) => setCompanies(data.companies ?? [])).catch(() => {})
  }, [isSuperAdmin])

  useEffect(() => {
    if (!isSuperAdmin && !isCompanyAdmin) return
    api.get('/internal/branches').then(({ data }) => setBranches(data.branches ?? [])).catch(() => {})
  }, [isSuperAdmin, isCompanyAdmin])

  // Da co chi nhanh (hoac khong phai SA/CA) thi tai duoc.
  const ready = (!isSuperAdmin && !isCompanyAdmin) || branchId !== undefined

  async function load() {
    if (!ready) return
    try {
      setErr('')
      setList(await inventoryApi.listIngredients(companyId, branchId))
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, branchId, isSuperAdmin, isCompanyAdmin])

  const visible = useMemo(() => (onlyLow ? list.filter(isLow) : list), [list, onlyLow])
  const lowCount = useMemo(() => list.filter(isLow).length, [list])

  async function toggleStatus(i: Ingredient) {
    try {
      await inventoryApi.update(i.id, { status: i.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }, companyId, branchId)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div>
      <PageHeader
        title="Kho nguyên liệu"
        action={
          ready && canDoTxn ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setOpenImport(true)}>
                <FileInput size={16} /> Nhập từ phiếu
              </Button>
              {canManageIngredient && (
                <Button
                  onClick={() => {
                    setEditing(null)
                    setOpenForm(true)
                  }}
                >
                  <Plus size={16} /> Thêm nguyên liệu
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {isSuperAdmin && (
          <Select
            value={companyId ?? ''}
            onChange={(e) => {
              setCompanyId(e.target.value ? Number(e.target.value) : undefined)
              setBranchId(undefined)
            }}
            className="w-64 py-1"
          >
            <option value="">-- Chọn công ty --</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        {(isSuperAdmin || isCompanyAdmin) && (
          <Select
            value={branchId ?? ''}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-64 py-1"
            disabled={isSuperAdmin && !companyId}
          >
            <option value="">-- Chọn chi nhánh --</option>
            {branches
              .filter((b) => !companyId || b.company_id === companyId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </Select>
        )}
        {ready && (
          <button
            onClick={() => setOnlyLow((v) => !v)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              onlyLow ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 text-slate-600 hover:border-red-300'
            }`}
          >
            Tồn thấp ({lowCount})
          </button>
        )}
      </div>

      <ErrorText>{err}</ErrorText>

      {!ready ? (
        <p className="py-10 text-center text-sm text-slate-400">Vui lòng chọn công ty và chi nhánh để xem kho.</p>
      ) : (
        <Table headers={['Mã', 'Tên nguyên liệu', 'Tồn kho', 'Tối thiểu', 'Giá vốn', 'Trạng thái', '']}>
          {visible.map((i) => (
            <tr key={i.id} className={isLow(i) && i.status === 'ACTIVE' ? 'bg-red-50/60' : ''}>
              <td className="px-4 py-3 text-slate-500">{i.ingredient_code}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{i.ingredient_name}</td>
              <td className="px-4 py-3">
                <span className={isLow(i) && i.status === 'ACTIVE' ? 'font-semibold text-red-600' : ''}>
                  {num(i.current_stock)} {i.unit}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">
                {num(i.minimum_stock)} {i.unit}
              </td>
              <td className="px-4 py-3 text-slate-600">{num(i.cost_price)}₫</td>
              <td className="px-4 py-3">
                <Badge
                  className={i.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}
                >
                  {i.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {canDoTxn && (
                  <button
                    className="mr-3 text-slate-500 hover:text-blue-600"
                    title="Điều chỉnh số lượng"
                    onClick={() => setAdjusting(i)}
                  >
                    <ArrowUpDown size={16} />
                  </button>
                )}
                {canManageIngredient && (
                  <>
                    <button
                      className="mr-3 text-slate-500 hover:text-slate-800"
                      title="Sửa"
                      onClick={() => {
                        setEditing(i)
                        setOpenForm(true)
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="text-slate-500 hover:text-amber-600"
                      title={i.status === 'ACTIVE' ? 'Ngừng dùng' : 'Dùng lại'}
                      onClick={() => void toggleStatus(i)}
                    >
                      <Power size={16} />
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {openForm && (
        <IngredientForm
          ingredient={editing}
          companyId={companyId}
          branchId={branchId}
          onClose={() => setOpenForm(false)}
          onSaved={() => {
            setOpenForm(false)
            void load()
          }}
        />
      )}
      {adjusting && (
        <AdjustStockModal
          ingredient={adjusting}
          companyId={companyId}
          branchId={branchId}
          onClose={() => setAdjusting(null)}
          onSaved={() => {
            setAdjusting(null)
            void load()
          }}
        />
      )}
      {openImport && (
        <ImportReceiptModal
          companyId={companyId}
          branchId={branchId}
          onClose={() => setOpenImport(false)}
          onImported={() => {
            setOpenImport(false)
            void load()
          }}
        />
      )}
    </div>
  )
}

function IngredientForm({
  ingredient,
  companyId,
  branchId,
  onClose,
  onSaved,
}: {
  ingredient: Ingredient | null
  companyId?: number
  branchId?: number
  onClose: () => void
  onSaved: () => void
}) {
  const [f, setF] = useState({
    ingredient_code: ingredient?.ingredient_code ?? '',
    ingredient_name: ingredient?.ingredient_name ?? '',
    unit: ingredient?.unit ?? '',
    current_stock: ingredient ? String(ingredient.current_stock) : '0',
    minimum_stock: ingredient ? String(ingredient.minimum_stock) : '0',
    cost_price: ingredient ? String(ingredient.cost_price) : '0',
    note: ingredient?.note ?? '',
  })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      if (ingredient) {
        await inventoryApi.update(
          ingredient.id,
          {
            ingredient_code: f.ingredient_code,
            ingredient_name: f.ingredient_name,
            unit: f.unit,
            minimum_stock: Number(f.minimum_stock),
            cost_price: Number(f.cost_price),
            note: f.note || undefined,
          },
          companyId,
          branchId,
        )
      } else {
        const body: IngredientInput = {
          ingredient_code: f.ingredient_code,
          ingredient_name: f.ingredient_name,
          unit: f.unit,
          current_stock: Number(f.current_stock),
          minimum_stock: Number(f.minimum_stock),
          cost_price: Number(f.cost_price),
          note: f.note || undefined,
        }
        await inventoryApi.create(body, companyId, branchId)
      }
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={ingredient ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mã" value={f.ingredient_code} onChange={(e) => set('ingredient_code', e.target.value)} />
          <Input label="Đơn vị (kg, lít...)" value={f.unit} onChange={(e) => set('unit', e.target.value)} />
        </div>
        <Input label="Tên nguyên liệu" value={f.ingredient_name} onChange={(e) => set('ingredient_name', e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Tồn hiện tại"
            type="number"
            value={f.current_stock}
            onChange={(e) => set('current_stock', e.target.value)}
            disabled={!!ingredient}
          />
          <Input label="Tồn tối thiểu" type="number" value={f.minimum_stock} onChange={(e) => set('minimum_stock', e.target.value)} />
          <Input label="Giá vốn" type="number" value={f.cost_price} onChange={(e) => set('cost_price', e.target.value)} />
        </div>
        <Input label="Ghi chú" value={f.note} onChange={(e) => set('note', e.target.value)} />
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

function ImportReceiptModal({
  companyId,
  branchId,
  onClose,
  onImported,
}: {
  companyId?: number
  branchId?: number
  onClose: () => void
  onImported: () => void
}) {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<{ receipt_code: string; supplier_name: string; status: string; items: { ingredient_name?: string; unit?: string; quantity: number | string }[] } | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  async function lookup() {
    if (!code.trim()) return
    setLoading(true); setErr(''); setPreview(null)
    try {
      const r = await procurementApi.getReceiptByCode(code.trim(), companyId)
      if (r.status === 'CONFIRMED') {
        setErr('Phiếu này đã được nhập kho, không thể nhập lại.')
        return
      }
      if (r.status === 'CANCELLED') {
        setErr('Phiếu này đã bị hủy.')
        return
      }
      setPreview(r)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  async function doImport() {
    setImporting(true); setErr('')
    try {
      await procurementApi.importByCode(code.trim(), companyId, branchId)
      onImported()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal open title="Nhập kho từ phiếu nhập" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 items-end">
          <Input
            label="Mã phiếu nhập"
            placeholder="VD: PN-1234567890"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookup()}
            className="flex-1"
          />
          <Button variant="secondary" onClick={lookup} disabled={loading || !code.trim()}>
            {loading ? 'Đang tìm...' : 'Tra cứu'}
          </Button>
        </div>
        <ErrorText>{err}</ErrorText>
        {preview && (
          <>
            <div className="text-sm space-y-1">
              <div><span className="text-slate-500">Mã phiếu:</span> <b>{preview.receipt_code}</b></div>
              <div><span className="text-slate-500">NCC:</span> {preview.supplier_name}</div>
            </div>
            <Table headers={['Nguyên liệu', 'ĐVT', 'SL']}>
              {preview.items.map((it, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{it.ingredient_name}</td>
                  <td className="px-4 py-2 text-slate-500">{it.unit}</td>
                  <td className="px-4 py-2">{num(it.quantity)}</td>
                </tr>
              ))}
            </Table>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Hủy</Button>
              <Button onClick={doImport} disabled={importing}>
                {importing ? 'Đang nhập...' : 'Xác nhận nhập kho'}
              </Button>
            </div>
          </>
        )}
        {!preview && !err && (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>Đóng</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

const ADJUST_TYPES: { value: StockTxnType; label: string }[] = [
  { value: 'STOCK_ADJUSTMENT', label: 'Điều chỉnh' },
  { value: 'WASTE', label: 'Hao hụt' },
  { value: 'STOCK_COUNT', label: 'Kiểm kê' },
  { value: 'PURCHASE', label: 'Nhập kho' },
  { value: 'RETURN_SUPPLIER', label: 'Trả NCC' },
]

function AdjustStockModal({
  ingredient,
  companyId,
  branchId,
  onClose,
  onSaved,
}: {
  ingredient: Ingredient
  companyId?: number
  branchId?: number
  onClose: () => void
  onSaved: () => void
}) {
  const [txnType, setTxnType] = useState<StockTxnType>('STOCK_ADJUSTMENT')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const currentStock = Number(ingredient.current_stock || 0)

  async function submit() {
    const qty = Number(quantity)
    if (!qty) { setErr('Vui lòng nhập số lượng'); return }
    if (!note.trim()) { setErr('Vui lòng nhập lý do'); return }
    setSaving(true)
    setErr('')
    try {
      await inventoryApi.createTransaction(
        { ingredientId: ingredient.id, type: txnType, quantity: qty, note: note.trim() },
        companyId,
        branchId,
      )
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  const previewStock = quantity ? currentStock + Number(quantity) : null

  return (
    <Modal open title={`Điều chỉnh · ${ingredient.ingredient_name}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <span className="text-slate-500">Tồn hiện tại:</span>{' '}
          <b>{new Intl.NumberFormat('vi-VN').format(currentStock)} {ingredient.unit}</b>
          {previewStock != null && (
            <span className="ml-3">
              → <b className={previewStock < 0 ? 'text-red-600' : 'text-green-600'}>{new Intl.NumberFormat('vi-VN').format(previewStock)} {ingredient.unit}</b>
            </span>
          )}
        </div>
        <Select label="Loại điều chỉnh" value={txnType} onChange={(e) => setTxnType(e.target.value as StockTxnType)}>
          {ADJUST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
        <Input
          label={`Số lượng (${ingredient.unit}) — số âm = giảm, số dương = tăng`}
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="VD: -5 hoặc 10"
        />
        <Input label="Lý do *" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Kiểm kê cuối ngày, hao hụt do hỏng..." />
        <ErrorText>{err}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Đang lưu...' : 'Xác nhận'}</Button>
        </div>
      </div>
    </Modal>
  )
}
