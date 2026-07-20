import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { companiesApi, type Company, type CompanyInput } from '../api/companies'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, Table, Modal, Input, Badge, ErrorText } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function CompaniesPage() {
  const { staff } = useAuth()
  const isSuperAdmin = staff?.role === 'SUPER_ADMIN'

  const [list, setList] = useState<Company[]>([])
  const [editing, setEditing] = useState<Company | null>(null)
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    try {
      setErr('')
      setList(await companiesApi.list())
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => {
    void load()
  }, [])

  return (
    <div>
      <PageHeader
        title={isSuperAdmin ? 'Công ty' : 'Công ty của tôi'}
        action={
          isSuperAdmin ? (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus size={16} /> Thêm công ty
            </Button>
          ) : undefined
        }
      />
      <ErrorText>{err}</ErrorText>
      <Table headers={['', 'Tên công ty', 'Liên hệ', 'Mô tả', 'Trạng thái', '']}>
        {list.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-semibold text-slate-500">{c.name.charAt(0)}</span>
                )}
              </div>
            </td>
            <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
            <td className="px-4 py-3 text-slate-600">
              <div>{c.phone || '—'}</div>
              <div className="text-xs text-slate-400">{c.email}</div>
            </td>
            <td className="max-w-xs px-4 py-3 text-slate-500">
              <p className="line-clamp-2">{c.description}</p>
            </td>
            <td className="px-4 py-3">
              <Badge
                className={c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}
              >
                {c.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'}
              </Badge>
            </td>
            <td className="px-4 py-3 text-right">
              <button
                className="text-slate-500 hover:text-slate-800"
                title="Sửa"
                onClick={() => {
                  setEditing(c)
                  setOpen(true)
                }}
              >
                <Pencil size={16} />
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {open && (
        <CompanyForm
          company={editing}
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

function CompanyForm({
  company,
  onClose,
  onSaved,
}: {
  company: Company | null
  onClose: () => void
  onSaved: () => void
}) {
  const [f, setF] = useState({
    name: company?.name ?? '',
    description: company?.description ?? '',
    logo_url: company?.logo_url ?? '',
    phone: company?.phone ?? '',
    email: company?.email ?? '',
  })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      const clean = (v: string) => (v.trim() ? v.trim() : undefined)
      const body: CompanyInput = {
        name: f.name.trim(),
        description: clean(f.description),
        logo_url: clean(f.logo_url),
        phone: clean(f.phone),
        email: clean(f.email),
      }
      if (company) await companiesApi.update(company.id, body)
      else await companiesApi.create(body)
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={company ? 'Sửa công ty' : 'Thêm công ty'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input label="Tên công ty" value={f.name} onChange={(e) => set('name', e.target.value)} />
        <Input label="Logo (URL)" value={f.logo_url} onChange={(e) => set('logo_url', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Số điện thoại" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          <Input label="Email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Mô tả</span>
          <textarea
            rows={3}
            value={f.description}
            onChange={(e) => set('description', e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>
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
