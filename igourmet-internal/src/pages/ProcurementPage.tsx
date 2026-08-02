import { useEffect, useState } from 'react'
import { Plus, Pencil, Power, Eye, Check, X, Truck } from 'lucide-react'
import {
  procurementApi,
  type Supplier,
  type SupplierInput,
  type Receipt,
  type ReceiptItem,
} from '../api/procurement'
import { inventoryApi, type Ingredient } from '../api/inventory'
import { api } from '../lib/api'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, Table, Modal, Input, Select, Badge, ErrorText } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const num = (v: number | string) => new Intl.NumberFormat('vi-VN').format(Number(v || 0))

type Tab = 'suppliers' | 'receipts'

export default function ProcurementPage() {
  const { staff } = useAuth()
  const isSuperAdmin = staff?.role === 'SUPER_ADMIN'
  const isCompanyAdmin = staff?.role === 'COMPANY_ADMIN'

  const [tab, setTab] = useState<Tab>('suppliers')
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([])
  const [companyId, setCompanyId] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!isSuperAdmin) return
    api.get('/public/companies').then(({ data }) => setCompanies(data.companies ?? [])).catch(() => {})
  }, [isSuperAdmin])

  const ready = !isSuperAdmin || companyId !== undefined

  return (
    <div>
      <PageHeader title="Nhà cung cấp" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {isSuperAdmin && (
          <Select
            value={companyId ?? ''}
            onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-64 py-1"
          >
            <option value="">-- Chọn công ty --</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        )}

        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-sm">
          {(['suppliers', 'receipts'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 transition-colors ${
                tab === t
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t === 'suppliers' ? 'Nhà cung cấp' : 'Phiếu nhập kho'}
            </button>
          ))}
        </div>
      </div>

      {!ready ? (
        <p className="py-10 text-center text-sm text-slate-400">Vui lòng chọn công ty.</p>
      ) : tab === 'suppliers' ? (
        <SuppliersTab companyId={companyId} />
      ) : (
        <ReceiptsTab companyId={companyId} />
      )}
    </div>
  )
}

// ==================== SUPPLIERS TAB ====================
function SuppliersTab({ companyId }: { companyId?: number }) {
  const [list, setList] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [openForm, setOpenForm] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    try {
      setErr('')
      setList(await procurementApi.listSuppliers(companyId, search || undefined))
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => { void load() }, [companyId])

  async function handleSearch() {
    void load()
  }

  async function toggleStatus(s: Supplier) {
    try {
      await procurementApi.updateSupplier(s.id, { status: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }, companyId)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="Tìm mã, tên, SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-72"
        />
        <Button variant="secondary" onClick={handleSearch}>Tìm</Button>
        <div className="flex-1" />
        <Button onClick={() => { setEditing(null); setOpenForm(true) }}>
          <Plus size={16} /> Thêm NCC
        </Button>
      </div>

      <ErrorText>{err}</ErrorText>

      <Table headers={['Mã', 'Tên NCC', 'Liên hệ', 'SĐT', 'Trạng thái', '']}>
        {list.map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-3 text-slate-500">{s.supplier_code}</td>
            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{s.supplier_name}</td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.contact_name || '—'}</td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.phone || '—'}</td>
            <td className="px-4 py-3">
              <Badge className={s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                {s.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'}
              </Badge>
            </td>
            <td className="px-4 py-3 text-right whitespace-nowrap">
              <button className="mr-3 text-slate-500 hover:text-slate-800" title="Sửa" onClick={() => { setEditing(s); setOpenForm(true) }}>
                <Pencil size={16} />
              </button>
              <button className="text-slate-500 hover:text-amber-600" title={s.status === 'ACTIVE' ? 'Ngừng' : 'Kích hoạt'} onClick={() => void toggleStatus(s)}>
                <Power size={16} />
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {openForm && (
        <SupplierForm
          supplier={editing}
          companyId={companyId}
          onClose={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); void load() }}
        />
      )}
    </>
  )
}

function SupplierForm({ supplier, companyId, onClose, onSaved }: {
  supplier: Supplier | null; companyId?: number; onClose: () => void; onSaved: () => void
}) {
  const [f, setF] = useState<SupplierInput>({
    supplier_code: supplier?.supplier_code ?? '',
    supplier_name: supplier?.supplier_name ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    address: supplier?.address ?? '',
    tax_code: supplier?.tax_code ?? '',
    contact_name: supplier?.contact_name ?? '',
    note: supplier?.note ?? '',
  })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: keyof SupplierInput, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function submit() {
    setSaving(true); setErr('')
    try {
      const body: SupplierInput = {
        supplier_code: f.supplier_code,
        supplier_name: f.supplier_name,
        phone: f.phone || undefined,
        email: f.email || undefined,
        address: f.address || undefined,
        tax_code: f.tax_code || undefined,
        contact_name: f.contact_name || undefined,
        note: f.note || undefined,
      }
      if (supplier) {
        await procurementApi.updateSupplier(supplier.id, body, companyId)
      } else {
        await procurementApi.createSupplier(body, companyId)
      }
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={supplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mã NCC" value={f.supplier_code} onChange={(e) => set('supplier_code', e.target.value)} />
          <Input label="Mã số thuế" value={f.tax_code} onChange={(e) => set('tax_code', e.target.value)} />
        </div>
        <Input label="Tên nhà cung cấp" value={f.supplier_name} onChange={(e) => set('supplier_name', e.target.value)} />
        <Input label="Người liên hệ" value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="SĐT" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          <Input label="Email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <Input label="Địa chỉ" value={f.address} onChange={(e) => set('address', e.target.value)} />
        <Input label="Ghi chú" value={f.note} onChange={(e) => set('note', e.target.value)} />
        <ErrorText>{err}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ==================== RECEIPTS TAB ====================
function ReceiptsTab({ companyId }: { companyId?: number }) {
  const [list, setList] = useState<Receipt[]>([])
  const [openForm, setOpenForm] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const [err, setErr] = useState('')

  async function load() {
    try {
      setErr('')
      setList(await procurementApi.listReceipts(companyId))
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => { void load() }, [companyId])

  async function confirm(id: number) {
    if (!window.confirm('Xác nhận phiếu nhập? Tồn kho sẽ được cập nhật.')) return
    try {
      await procurementApi.confirmReceipt(id, companyId)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  async function cancel(id: number) {
    if (!window.confirm('Hủy phiếu nhập này?')) return
    try {
      await procurementApi.cancelReceipt(id, companyId)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const statusColor = (s: string) => {
    if (s === 'CONFIRMED') return 'bg-green-100 text-green-700'
    if (s === 'CANCELLED') return 'bg-red-100 text-red-600'
    return 'bg-amber-100 text-amber-700'
  }
  const statusLabel = (s: string) => {
    if (s === 'CONFIRMED') return 'Đã nhập'
    if (s === 'CANCELLED') return 'Đã hủy'
    return 'Nháp'
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpenForm(true)}>
          <Plus size={16} /> Tạo phiếu nhập
        </Button>
      </div>

      <ErrorText>{err}</ErrorText>

      <Table headers={['Mã phiếu', 'NCC', 'Chi nhánh', 'Tổng tiền', 'Ngày', 'Trạng thái', '']}>
        {list.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{r.receipt_code}</td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.supplier_name}</td>
            <td className="px-4 py-3 text-slate-500">{r.branch_name || '—'}</td>
            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{num(r.total_amount)}₫</td>
            <td className="px-4 py-3 text-slate-500">{r.receipt_date?.slice(0, 10) || r.created_at?.slice(0, 10)}</td>
            <td className="px-4 py-3">
              <Badge className={statusColor(r.status)}>{statusLabel(r.status)}</Badge>
            </td>
            <td className="px-4 py-3 text-right whitespace-nowrap">
              <button className="mr-2 text-slate-500 hover:text-indigo-600" title="Xem chi tiết" onClick={() => setViewing(r.id)}>
                <Eye size={16} />
              </button>
              {r.status === 'DRAFT' && (
                <>
                  <button className="mr-2 text-slate-500 hover:text-green-600" title="Xác nhận nhập kho" onClick={() => void confirm(r.id)}>
                    <Check size={16} />
                  </button>
                  <button className="text-slate-500 hover:text-red-600" title="Hủy phiếu" onClick={() => void cancel(r.id)}>
                    <X size={16} />
                  </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </Table>

      {openForm && (
        <ReceiptForm
          companyId={companyId}
          onClose={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); void load() }}
        />
      )}
      {viewing !== null && (
        <ReceiptDetail id={viewing} companyId={companyId} onClose={() => setViewing(null)} />
      )}
    </>
  )
}

function ReceiptDetail({ id, companyId, onClose }: { id: number; companyId?: number; onClose: () => void }) {
  const [receipt, setReceipt] = useState<(Receipt & { items: ReceiptItem[] }) | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    procurementApi.getReceipt(id, companyId).then(setReceipt).catch((e) => setErr(errMsg(e)))
  }, [id, companyId])

  return (
    <Modal open title={`Phiếu nhập ${receipt?.receipt_code ?? ''}`} onClose={onClose}>
      {err && <ErrorText>{err}</ErrorText>}
      {!receipt ? (
        <p className="text-sm text-slate-400">Đang tải...</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-500">NCC:</span> {receipt.supplier_name}</div>
            <div><span className="text-slate-500">Chi nhánh:</span> {receipt.branch_name || '—'}</div>
            <div><span className="text-slate-500">Ngày:</span> {receipt.receipt_date?.slice(0, 10)}</div>
            <div><span className="text-slate-500">Người tạo:</span> {receipt.created_by_name || '—'}</div>
            <div><span className="text-slate-500">Tổng:</span> <b>{num(receipt.total_amount)}₫</b></div>
            <div><span className="text-slate-500">Trạng thái:</span> {receipt.status}</div>
          </div>
          {receipt.note && <p className="text-sm text-slate-500">Ghi chú: {receipt.note}</p>}

          <Table headers={['Nguyên liệu', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền']}>
            {receipt.items.map((it, i) => (
              <tr key={i}>
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{it.ingredient_name}</td>
                <td className="px-4 py-2 text-slate-500">{it.unit}</td>
                <td className="px-4 py-2">{num(it.quantity)}</td>
                <td className="px-4 py-2">{num(it.unit_price)}₫</td>
                <td className="px-4 py-2">{num(it.line_amount)}₫</td>
              </tr>
            ))}
          </Table>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>Đóng</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ReceiptForm({ companyId, onClose, onSaved }: {
  companyId?: number; onClose: () => void; onSaved: () => void
}) {
  const { staff } = useAuth()
  const isSuperAdmin = staff?.role === 'SUPER_ADMIN'
  const isCompanyAdmin = staff?.role === 'COMPANY_ADMIN'

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [branches, setBranches] = useState<{ id: number; company_id: number; name: string }[]>([])
  const [supplierId, setSupplierId] = useState<number>(0)
  const [branchId, setBranchId] = useState<number | undefined>(undefined)
  const [receiptCode, setReceiptCode] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [items, setItems] = useState<{ ingredient_id: number; quantity: string; unit_price: string; note: string }[]>([
    { ingredient_id: 0, quantity: '', unit_price: '', note: '' },
  ])
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    procurementApi.listSuppliers(companyId).then(setSuppliers).catch(() => {})
    inventoryApi.listIngredients(companyId, branchId).then(setIngredients).catch(() => {})
    if (isSuperAdmin || isCompanyAdmin) {
      api.get('/internal/branches').then(({ data }) => setBranches(data.branches ?? [])).catch(() => {})
    }
  }, [companyId])

  function addLine() {
    setItems((p) => [...p, { ingredient_id: 0, quantity: '', unit_price: '', note: '' }])
  }
  function removeLine(i: number) {
    setItems((p) => p.filter((_, idx) => idx !== i))
  }
  function setLine(i: number, k: string, v: string | number) {
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))
  }

  const total = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0)

  async function submit() {
    setSaving(true); setErr('')
    try {
      if (!supplierId) throw new Error('Chọn nhà cung cấp')
      const validItems = items.filter((it) => it.ingredient_id && Number(it.quantity) > 0)
      if (validItems.length === 0) throw new Error('Thêm ít nhất 1 nguyên liệu')
      await procurementApi.createReceipt({
        supplier_id: supplierId,
        branch_id: branchId,
        receipt_code: receiptCode || undefined,
        receipt_date: receiptDate || undefined,
        note: note || undefined,
        items: validItems.map((it) => ({
          ingredient_id: it.ingredient_id,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price) || undefined,
          note: it.note || undefined,
        })),
      }, companyId)
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title="Tạo phiếu nhập kho" onClose={onClose}>
      <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Nhà cung cấp" value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))}>
            <option value={0}>-- Chọn NCC --</option>
            {suppliers.filter((s) => s.status === 'ACTIVE').map((s) => (
              <option key={s.id} value={s.id}>{s.supplier_name}</option>
            ))}
          </Select>
          {(isSuperAdmin || isCompanyAdmin) && (
            <Select label="Chi nhánh" value={branchId ?? ''} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">-- Chọn --</option>
              {branches.filter((b) => !companyId || b.company_id === companyId).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mã phiếu (tự sinh nếu trống)" value={receiptCode} onChange={(e) => setReceiptCode(e.target.value)} />
          <Input label="Ngày nhập" type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
        </div>

        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-2">Chi tiết nguyên liệu</div>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-end">
            <Select value={it.ingredient_id} onChange={(e) => setLine(i, 'ingredient_id', Number(e.target.value))}>
              <option value={0}>-- Nguyên liệu --</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>{ing.ingredient_code} - {ing.ingredient_name} ({ing.unit})</option>
              ))}
            </Select>
            <Input placeholder="SL" type="number" value={it.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} />
            <Input placeholder="Đơn giá" type="number" value={it.unit_price} onChange={(e) => setLine(i, 'unit_price', e.target.value)} />
            <button className="text-red-500 hover:text-red-700 pb-2" onClick={() => removeLine(i)} title="Xóa dòng">
              <X size={16} />
            </button>
          </div>
        ))}
        <button onClick={addLine} className="text-sm text-indigo-600 hover:text-indigo-800 self-start">+ Thêm dòng</button>

        <div className="text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
          Tổng: {num(total)}₫
        </div>

        <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
        <ErrorText>{err}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo phiếu'}</Button>
        </div>
      </div>
    </Modal>
  )
}
