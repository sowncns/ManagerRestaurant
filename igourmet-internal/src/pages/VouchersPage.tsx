import { useEffect, useState } from 'react'
import { Plus, Pencil, Ban, Gift } from 'lucide-react'
import {
  vouchersApi,
  type Voucher,
  type VoucherInput,
  type AssignInput,
  type DiscountType,
  type ApplyScope,
} from '../api/vouchers'
import { companiesApi, type Company } from '../api/companies'
import { branchesApi, type Branch } from '../api/branches'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, Table, Modal, Input, Select, Badge, ErrorText } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-slate-100 text-slate-500',
  expired: 'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<string, string> = { active: 'Hoạt động', inactive: 'Ngừng', expired: 'Hết hạn' }

function fmtDiscount(v: Voucher) {
  return v.discount_type === 'percent'
    ? `${v.discount_value}%`
    : `${Number(v.discount_value).toLocaleString('vi-VN')}đ`
}

export default function VouchersPage() {
  const { staff } = useAuth()
  const isSuperAdmin = staff?.role === 'SUPER_ADMIN'

  const [list, setList] = useState<Voucher[]>([])
  const [editing, setEditing] = useState<Voucher | null>(null)
  const [assigning, setAssigning] = useState<Voucher | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    try {
      setErr('')
      setList(await vouchersApi.list())
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => {
    void load()
  }, [])

  async function deactivate(v: Voucher) {
    if (!confirm(`Ngừng sử dụng voucher "${v.code}"?`)) return
    try {
      await vouchersApi.deactivate(v.id)
      await load()
    } catch (e) {
      setErr(errMsg(e))
    }
  }

  return (
    <div>
      <PageHeader
        title="Voucher"
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus size={16} /> Thêm voucher
          </Button>
        }
      />
      <ErrorText>{err}</ErrorText>
      <Table headers={['Mã', 'Tên', 'Giảm', 'Hiệu lực', 'Dùng', 'Trạng thái', '']}>
        {list.map((v) => (
          <tr key={v.id}>
            <td className="px-4 py-3 font-mono font-medium text-slate-800">{v.code}</td>
            <td className="px-4 py-3 text-slate-700">{v.name}</td>
            <td className="px-4 py-3 text-slate-600">{fmtDiscount(v)}</td>
            <td className="px-4 py-3 text-xs text-slate-500">
              {new Date(v.start_date).toLocaleDateString('vi-VN')} –{' '}
              {new Date(v.end_date).toLocaleDateString('vi-VN')}
            </td>
            <td className="px-4 py-3 text-slate-600">
              {v.used_count}
              {v.usage_limit > 0 ? `/${v.usage_limit}` : ''}
            </td>
            <td className="px-4 py-3">
              <Badge className={STATUS_STYLE[v.status]}>{STATUS_LABEL[v.status] ?? v.status}</Badge>
            </td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-3 text-slate-500">
                <button title="Cấp cho khách" className="hover:text-slate-800" onClick={() => setAssigning(v)}>
                  <Gift size={16} />
                </button>
                <button
                  title="Sửa"
                  className="hover:text-slate-800"
                  onClick={() => {
                    setEditing(v)
                    setFormOpen(true)
                  }}
                >
                  <Pencil size={16} />
                </button>
                {v.status === 'active' && (
                  <button title="Ngừng dùng" className="hover:text-red-600" onClick={() => void deactivate(v)}>
                    <Ban size={16} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {formOpen && (
        <VoucherForm
          voucher={editing}
          showCompany={isSuperAdmin}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            void load()
          }}
        />
      )}
      {assigning && (
        <AssignForm 
          voucher={assigning} 
          isSuperAdmin={isSuperAdmin}
          onClose={() => setAssigning(null)} 
          onDone={() => setAssigning(null)} 
        />
      )}
    </div>
  )
}

// datetime ISO -> value cho input datetime-local (YYYY-MM-DDTHH:mm, gio dia phuong)
function toLocalInput(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function VoucherForm({
  voucher,
  showCompany,
  onClose,
  onSaved,
}: {
  voucher: Voucher | null
  showCompany: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [f, setF] = useState({
    company_id: voucher?.company_id ? String(voucher.company_id) : '',
    code: voucher?.code ?? '',
    name: voucher?.name ?? '',
    type: voucher?.type ?? 'food',
    discount_type: (voucher?.discount_type ?? 'percent') as DiscountType,
    discount_value: voucher ? String(voucher.discount_value) : '',
    min_order_amount: voucher ? String(voucher.min_order_amount) : '0',
    max_discount_amount: voucher ? String(voucher.max_discount_amount) : '0',
    start_date: toLocalInput(voucher?.start_date),
    end_date: toLocalInput(voucher?.end_date),
    usage_limit: voucher ? String(voucher.usage_limit) : '0',
    per_customer_limit: voucher ? String(voucher.per_customer_limit) : '1',
    apply_scope: (voucher?.apply_scope ?? 'all_branches') as ApplyScope,
    description: voucher?.description ?? '',
    image_url: (voucher as any)?.image_url ?? '',
    branchIds: voucher?.branchIds ?? ([] as number[]),
  })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    if (showCompany) companiesApi.list().then(setCompanies).catch(() => {})
    branchesApi.list().then(setBranches).catch(() => {})
  }, [showCompany])

  const visibleBranches = branches.filter((b) => {
    if (showCompany && f.company_id) return b.company_id === Number(f.company_id)
    return true
  })

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      const body: VoucherInput = {
        code: f.code.trim(),
        name: f.name.trim(),
        type: f.type.trim(),
        discount_type: f.discount_type,
        discount_value: Number(f.discount_value),
        min_order_amount: Number(f.min_order_amount),
        max_discount_amount: Number(f.max_discount_amount),
        start_date: new Date(f.start_date).toISOString(),
        end_date: new Date(f.end_date).toISOString(),
        usage_limit: Number(f.usage_limit),
        per_customer_limit: Number(f.per_customer_limit),
        apply_scope: f.apply_scope,
        branchIds: f.apply_scope === 'selected_branches' ? f.branchIds : undefined,
        description: f.description.trim() || undefined,
        image_url: (f as any).image_url?.trim() || undefined,
      }
      if (showCompany && f.company_id) body.company_id = Number(f.company_id)
      if (voucher) await vouchersApi.update(voucher.id, body)
      else await vouchersApi.create(body)
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={voucher ? 'Sửa voucher' : 'Thêm voucher'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {showCompany && (
          <Select label="Công ty" value={f.company_id} onChange={(e) => set('company_id', e.target.value)}>
            <option value="">— Chọn công ty —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mã voucher" value={f.code} onChange={(e) => set('code', e.target.value)} />
          <Input label="Loại (food/drink)" value={f.type} onChange={(e) => set('type', e.target.value)} />
        </div>
        <Input label="Tên" value={f.name} onChange={(e) => set('name', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Kiểu giảm"
            value={f.discount_type}
            onChange={(e) => set('discount_type', e.target.value)}
          >
            <option value="percent">Phần trăm (%)</option>
            <option value="fixed">Số tiền (đ)</option>
          </Select>
          <Input
            label="Giá trị giảm"
            type="number"
            value={f.discount_value}
            onChange={(e) => set('discount_value', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Đơn tối thiểu (đ)"
            type="number"
            value={f.min_order_amount}
            onChange={(e) => set('min_order_amount', e.target.value)}
          />
          <Input
            label="Giảm tối đa (đ, 0 = không giới hạn)"
            type="number"
            value={f.max_discount_amount}
            onChange={(e) => set('max_discount_amount', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Bắt đầu"
            type="datetime-local"
            value={f.start_date}
            onChange={(e) => set('start_date', e.target.value)}
          />
          <Input
            label="Kết thúc"
            type="datetime-local"
            value={f.end_date}
            onChange={(e) => set('end_date', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Giới hạn lượt dùng (0 = ∞)"
            type="number"
            value={f.usage_limit}
            onChange={(e) => set('usage_limit', e.target.value)}
          />
          <Input
            label="Mỗi khách tối đa"
            type="number"
            value={f.per_customer_limit}
            onChange={(e) => set('per_customer_limit', e.target.value)}
          />
        </div>
        <Select label="Phạm vi" value={f.apply_scope} onChange={(e) => set('apply_scope', e.target.value)}>
          <option value="all_branches">Tất cả chi nhánh</option>
          <option value="selected_branches">Chi nhánh chọn lọc</option>
        </Select>
        {f.apply_scope === 'selected_branches' && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Chọn chi nhánh áp dụng</label>
            <div className="max-h-40 overflow-y-auto border border-slate-300 rounded-md p-2 flex flex-col gap-1">
              {visibleBranches.length === 0 ? (
                <span className="text-sm text-slate-500 italic">Không có chi nhánh nào</span>
              ) : (
                visibleBranches.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={f.branchIds.includes(b.id)}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setF((p) => ({
                          ...p,
                          branchIds: checked
                            ? [...p.branchIds, b.id]
                            : p.branchIds.filter((id) => id !== b.id),
                        }))
                      }}
                    />
                    {b.name}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
        <div>
          <Input
            label="URL ảnh voucher"
            placeholder="https://example.com/voucher.jpg"
            value={(f as any).image_url ?? ''}
            onChange={(e) => setF((p: any) => ({ ...p, image_url: e.target.value }))}
          />
          {(f as any).image_url && (
            <img src={(f as any).image_url} alt="preview" className="mt-2 w-full h-32 object-cover rounded-lg border border-slate-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
          )}
        </div>
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

function AssignForm({
  voucher,
  isSuperAdmin,
  onClose,
  onDone,
}: {
  voucher: Voucher
  isSuperAdmin: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [mode, setMode] = useState<'rank' | 'ids' | 'birthday' | 'all'>('rank')
  const [rank, setRank] = useState('gold')
  const [birthMonth, setBirthMonth] = useState('1')
  const [ids, setIds] = useState('')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [result, setResult] = useState<{ issued: number; skipped: number } | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    setErr('')
    setResult(null)
    try {
      let body: AssignInput
      if (mode === 'rank') {
        body = { rank, reason: reason.trim() || undefined }
      } else if (mode === 'birthday') {
        body = { birthMonth: Number(birthMonth), reason: reason.trim() || undefined }
      } else if (mode === 'all') {
        body = { all_customers: true, reason: reason.trim() || undefined }
      } else {
        const customerIds = ids
          .split(/[\s,]+/)
          .filter(Boolean)
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0)
        if (customerIds.length === 0) {
          setErr('Nhập ít nhất một ID khách hàng hợp lệ')
          setSaving(false)
          return
        }
        body = { customerIds, reason: reason.trim() || undefined }
      }
      setResult(await vouchersApi.assign(voucher.id, body))
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={`Cấp voucher "${voucher.code}"`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Select
          label="Cách cấp"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'rank' | 'ids' | 'birthday' | 'all')}
        >
          <option value="rank">Theo hạng thành viên</option>
          <option value="birthday">Theo tháng sinh nhật</option>
          <option value="ids">Theo danh sách ID khách</option>
          {isSuperAdmin && <option value="all">Toàn bộ khách hàng</option>}
        </Select>
        {mode === 'rank' && (
          <Select label="Hạng" value={rank} onChange={(e) => setRank(e.target.value)}>
            <option value="normal">Thường</option>
            <option value="silver">Bạc</option>
            <option value="gold">Vàng</option>
            <option value="platinum">Bạch kim</option>
          </Select>
        )}
        {mode === 'birthday' && (
          <Select label="Tháng sinh" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </Select>
        )}
        {mode === 'ids' && (
          <Input
            label="ID khách (cách nhau bởi dấu phẩy)"
            value={ids}
            onChange={(e) => setIds(e.target.value)}
            placeholder="12, 34, 56"
          />
        )}
        <Input label="Lý do (tuỳ chọn)" value={reason} onChange={(e) => setReason(e.target.value)} />
        {result && (
          <p className="text-sm text-green-600">
            Đã cấp {result.issued}, bỏ qua {result.skipped} (đã đạt giới hạn).
          </p>
        )}
        <ErrorText>{err}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={result ? onDone : onClose}>
            {result ? 'Đóng' : 'Hủy'}
          </Button>
          {!result && (
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Đang cấp...' : 'Cấp voucher'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
