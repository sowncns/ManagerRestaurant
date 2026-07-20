import { useEffect, useState } from 'react'
import { Plus, Pencil, Power } from 'lucide-react'
import { branchesApi, type Branch, type BranchInput } from '../api/branches'
import { api } from '../lib/api'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, Table, Modal, Input, Badge, ErrorText, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { companiesApi, type Company } from '../api/companies'

const hhmm = (t?: string | null) => (t ? String(t).slice(0, 5) : '')

export default function BranchesPage() {
  const { staff } = useAuth()
  const isSuperAdmin = staff?.role === 'SUPER_ADMIN'
  // Tao/xoa chi nhanh: chi cap cong ty tro len.
  const canManageCompanyLevel = staff?.role === 'SUPER_ADMIN' || staff?.role === 'COMPANY_ADMIN'

  const [list, setList] = useState<Branch[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [filterCompanyId, setFilterCompanyId] = useState<number | ''>('')
  
  const [editing, setEditing] = useState<Branch | null>(null)
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    try {
      setList(await branchesApi.list())
      if (isSuperAdmin) {
        setCompanies(await companiesApi.list())
      }
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => {
    void load()
  }, [isSuperAdmin])

  async function toggleStatus(b: Branch) {
    try {
      await branchesApi.changeStatus(b.id, b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  async function remove(b: Branch) {
    if (!confirm(`Ngừng hoạt động chi nhánh "${b.name}"?`)) return
    try {
      await branchesApi.remove(b.id)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const filteredList = list.filter((b) => {
    if (filterCompanyId && b.company_id !== filterCompanyId) return false
    return true
  })

  const headers = ['Chi nhánh', 'Mã', ...(isSuperAdmin ? ['Công ty'] : []), 'Địa chỉ', 'Giờ mở cửa', 'Trạng thái', '']

  return (
    <div>
      <PageHeader
        title="Chi nhánh"
        action={
          canManageCompanyLevel ? (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus size={16} /> Thêm chi nhánh
            </Button>
          ) : undefined
        }
      />
      {isSuperAdmin && (
        <div className="mb-4 flex items-center gap-3">
          <Select
            value={filterCompanyId}
            onChange={(e) => setFilterCompanyId(e.target.value ? Number(e.target.value) : '')}
            className="w-full sm:w-auto min-w-[200px]"
          >
            <option value="">Tất cả công ty</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      <ErrorText>{err}</ErrorText>
      <Table headers={headers}>
        {filteredList.map((b) => (
          <tr key={b.id}>
            <td className="px-4 py-3 font-medium text-slate-800">{b.name}</td>
            <td className="px-4 py-3 text-slate-500">{b.code}</td>
            {isSuperAdmin && <td className="px-4 py-3">{b.company_name}</td>}
            <td className="px-4 py-3 text-slate-600">
              {[b.address, b.district, b.city].filter(Boolean).join(', ')}
            </td>
            <td className="px-4 py-3 text-slate-600">
              {b.opening_time ? `${hhmm(b.opening_time)} – ${hhmm(b.closing_time)}` : '—'}
            </td>
            <td className="px-4 py-3">
              <Badge
                className={
                  b.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }
              >
                {b.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'}
              </Badge>
            </td>
            <td className="px-4 py-3 text-right whitespace-nowrap">
              <button
                className="mr-3 text-slate-500 hover:text-slate-800"
                title="Sửa"
                onClick={() => {
                  setEditing(b)
                  setOpen(true)
                }}
              >
                <Pencil size={16} />
              </button>
              <button
                className="mr-3 text-slate-500 hover:text-amber-600"
                title={b.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Mở lại'}
                onClick={() => void toggleStatus(b)}
              >
                <Power size={16} />
              </button>
              {canManageCompanyLevel && (
                <button
                  className="text-slate-500 hover:text-red-600"
                  title="Xóa"
                  onClick={() => void remove(b)}
                >
                  ✕
                </button>
              )}
            </td>
          </tr>
        ))}
      </Table>
      {open && (
        <BranchForm
          branch={editing}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void load()
          }}
        />
      )}
    </div>
  )
}

function BranchForm({
  branch,
  isSuperAdmin,
  onClose,
  onSaved,
}: {
  branch: Branch | null
  isSuperAdmin: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [f, setF] = useState<BranchInput>({
    name: branch?.name ?? '',
    code: branch?.code ?? '',
    address: branch?.address ?? '',
    phone: branch?.phone ?? '',
    email: branch?.email ?? '',
    ward: branch?.ward ?? '',
    district: branch?.district ?? '',
    city: branch?.city ?? '',
    opening_time: hhmm(branch?.opening_time),
    closing_time: hhmm(branch?.closing_time),
    company_id: branch?.company_id,
    image_url: branch?.image_url ?? '',
  })
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([])
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  // Super admin tao moi -> can chon cong ty.
  useEffect(() => {
    if (isSuperAdmin && !branch) {
      api
        .get('/public/companies')
        .then(({ data }) => setCompanies(data.companies ?? []))
        .catch(() => setCompanies([]))
    }
  }, [isSuperAdmin, branch])

  const set = (k: keyof BranchInput, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      // Bo cac field rong de khop validate (optional).
      const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined)
      const payload: BranchInput = {
        name: f.name.trim(),
        code: f.code.trim(),
        address: f.address.trim(),
        phone: clean(f.phone),
        email: clean(f.email),
        ward: clean(f.ward),
        district: clean(f.district),
        city: clean(f.city),
        opening_time: clean(f.opening_time),
        closing_time: clean(f.closing_time),
        image_url: clean(f.image_url),
      }
      if (branch) {
        await branchesApi.update(branch.id, payload)
      } else {
        if (isSuperAdmin) payload.company_id = f.company_id ? Number(f.company_id) : undefined
        await branchesApi.create(payload)
      }
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={branch ? 'Sửa chi nhánh' : 'Thêm chi nhánh'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {isSuperAdmin && !branch && (
          <label className="text-sm font-medium text-slate-700">
            Công ty
            <select
              value={f.company_id ?? ''}
              onChange={(e) => setF((p) => ({ ...p, company_id: Number(e.target.value) || undefined }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">-- Chọn công ty --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tên chi nhánh" value={f.name} onChange={(e) => set('name', e.target.value)} />
          <Input label="Mã chi nhánh" value={f.code} onChange={(e) => set('code', e.target.value)} />
        </div>
        <Input label="Địa chỉ" value={f.address} onChange={(e) => set('address', e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Phường" value={f.ward ?? ''} onChange={(e) => set('ward', e.target.value)} />
          <Input label="Quận/Huyện" value={f.district ?? ''} onChange={(e) => set('district', e.target.value)} />
          <Input label="Tỉnh/TP" value={f.city ?? ''} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Số điện thoại" value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          <Input label="Email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Giờ mở cửa" type="time" value={f.opening_time ?? ''} onChange={(e) => set('opening_time', e.target.value)} />
          <Input label="Giờ đóng cửa" type="time" value={f.closing_time ?? ''} onChange={(e) => set('closing_time', e.target.value)} />
        </div>
        <div>
          <Input
            label="URL ảnh chi nhánh"
            placeholder="https://example.com/branch.jpg"
            value={f.image_url ?? ''}
            onChange={(e) => set('image_url', e.target.value)}
          />
          {f.image_url && (
            <img src={f.image_url} alt="preview" className="mt-2 w-full h-32 object-cover rounded-lg border border-slate-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
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
