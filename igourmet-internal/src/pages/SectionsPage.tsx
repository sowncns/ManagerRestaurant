import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { tablesApi, type DiningTable, type Section } from '../api/tables'
import { branchesApi, type Branch } from '../api/branches'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, Table, Modal, Input, Select, Badge, ErrorText } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function SectionsPage() {
  const { staff } = useAuth()
  // Chi nhanh don le (BRANCH_MANAGER) khong can chon chi nhanh, chi thay bo loc khi quan ly nhieu chi nhanh.
  const canPickBranch = staff?.role === 'SUPER_ADMIN' || staff?.role === 'COMPANY_ADMIN'
  const [branches, setBranches] = useState<Branch[]>([])
  const [filterBranchId, setFilterBranchId] = useState<number | ''>('')
  const [sections, setSections] = useState<Section[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [sectionOpen, setSectionOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<DiningTable | null>(null)
  const [tableOpen, setTableOpen] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    try {
      const [secs, tbls] = await Promise.all([tablesApi.listSections(), tablesApi.list()])
      setSections(secs)
      setTables(tbls)
      if (canPickBranch) setBranches(await branchesApi.list())
    } catch (e) {
      setErr(errMsg(e))
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleSections = useMemo(() => {
    if (!filterBranchId) return sections
    return sections.filter((s) => s.branch_id === filterBranchId)
  }, [sections, filterBranchId])

  const visibleTables = useMemo(() => {
    if (!filterBranchId) return tables
    return tables.filter((t) => t.branch_id === filterBranchId)
  }, [tables, filterBranchId])

  const tableCountBySection = useMemo(() => {
    const m = new Map<number | null, number>()
    for (const t of tables) m.set(t.section_id, (m.get(t.section_id) ?? 0) + 1)
    return m
  }, [tables])

  async function removeSection(s: Section) {
    if (!confirm(`Xóa khu vực "${s.name}"?`)) return
    try {
      await tablesApi.removeSection(s.id)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  async function removeTable(t: DiningTable) {
    if (!confirm(`Xóa bàn "${t.table_name || t.table_number}"?`)) return
    try {
      await tablesApi.remove(t.id)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const branchHeader = canPickBranch ? ['Chi nhánh'] : []

  return (
    <div className="flex flex-col gap-8">
      {canPickBranch && (
        <div className="flex items-center gap-3">
          <Select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value ? Number(e.target.value) : '')}
            className="w-full sm:w-auto min-w-[220px]"
          >
            <option value="">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <PageHeader
          title="Khu vực"
          action={
            <Button
              onClick={() => {
                setEditingSection(null)
                setSectionOpen(true)
              }}
            >
              <Plus size={16} /> Thêm khu vực
            </Button>
          }
        />
        <ErrorText>{err}</ErrorText>
        <Table headers={['Tên khu vực', ...branchHeader, 'Loại', 'Số bàn', 'Trạng thái', '']}>
          {visibleSections.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
              {canPickBranch && <td className="px-4 py-3 text-slate-500">{s.branch_name || '—'}</td>}
              <td className="px-4 py-3 text-slate-500">{s.section_type || '—'}</td>
              <td className="px-4 py-3 text-slate-600">{tableCountBySection.get(s.id) ?? 0}</td>
              <td className="px-4 py-3">
                <Badge
                  className={
                    s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }
                >
                  {s.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  className="mr-3 text-slate-500 hover:text-slate-800"
                  title="Sửa"
                  onClick={() => {
                    setEditingSection(s)
                    setSectionOpen(true)
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="text-slate-500 hover:text-red-600"
                  title="Xóa"
                  onClick={() => void removeSection(s)}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      <div>
        <PageHeader
          title="Bàn"
          action={
            <Button
              onClick={() => {
                setEditingTable(null)
                setTableOpen(true)
              }}
            >
              <Plus size={16} /> Thêm bàn
            </Button>
          }
        />
        <Table headers={['Bàn', ...branchHeader, 'Khu vực', 'Sức chứa', 'Trạng thái', '']}>
          {visibleTables.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-3 font-medium text-slate-800">{t.table_name || t.table_number}</td>
              {canPickBranch && <td className="px-4 py-3 text-slate-500">{t.branch_name || '—'}</td>}
              <td className="px-4 py-3 text-slate-500">{t.section_name || 'Chưa phân khu'}</td>
              <td className="px-4 py-3 text-slate-600">{t.capacity}</td>
              <td className="px-4 py-3">
                <Badge className="bg-slate-100 text-slate-600">{t.status}</Badge>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  className="mr-3 text-slate-500 hover:text-slate-800"
                  title="Sửa"
                  onClick={() => {
                    setEditingTable(t)
                    setTableOpen(true)
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="text-slate-500 hover:text-red-600"
                  title="Xóa"
                  onClick={() => void removeTable(t)}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      {sectionOpen && (
        <SectionForm
          section={editingSection}
          defaultBranchId={staff?.branch_id ?? (filterBranchId || undefined)}
          branches={canPickBranch ? branches : []}
          onClose={() => setSectionOpen(false)}
          onSaved={() => {
            setSectionOpen(false)
            void load()
          }}
        />
      )}

      {tableOpen && (
        <TableForm
          table={editingTable}
          sections={sections}
          defaultBranchId={staff?.branch_id ?? (filterBranchId || undefined)}
          branches={canPickBranch ? branches : []}
          onClose={() => setTableOpen(false)}
          onSaved={() => {
            setTableOpen(false)
            void load()
          }}
        />
      )}
    </div>
  )
}

function SectionForm({
  section,
  defaultBranchId,
  branches,
  onClose,
  onSaved,
}: {
  section: Section | null
  defaultBranchId?: string | number
  branches: Branch[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(section?.name ?? '')
  const [sectionType, setSectionType] = useState(section?.section_type ?? '')
  const [branchId, setBranchId] = useState<string>(
    section ? String(section.branch_id) : defaultBranchId != null ? String(defaultBranchId) : ''
  )
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      if (section) {
        await tablesApi.updateSection(section.id, { name, section_type: sectionType || null })
      } else {
        await tablesApi.createSection({ branch_id: branchId, name, section_type: sectionType || null })
      }
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={section ? 'Sửa khu vực' : 'Thêm khu vực'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {!section && branches.length > 0 && (
          <label className="text-sm font-medium text-slate-700">
            Chi nhánh
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">-- Chọn chi nhánh --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Input label="Tên khu vực" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Loại khu vực (tùy chọn)"
          value={sectionType ?? ''}
          onChange={(e) => setSectionType(e.target.value)}
        />
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

function TableForm({
  table,
  sections,
  defaultBranchId,
  branches,
  onClose,
  onSaved,
}: {
  table: DiningTable | null
  sections: Section[]
  defaultBranchId?: string | number
  branches: Branch[]
  onClose: () => void
  onSaved: () => void
}) {
  const [tableNumber, setTableNumber] = useState(table?.table_number ?? '')
  const [tableName, setTableName] = useState(table?.table_name ?? '')
  const [capacity, setCapacity] = useState(String(table?.capacity ?? 4))
  const [sectionId, setSectionId] = useState(table?.section_id != null ? String(table.section_id) : '')
  const [branchId, setBranchId] = useState<string>(
    table ? String(table.branch_id) : defaultBranchId != null ? String(defaultBranchId) : ''
  )
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const sectionsInBranch = branches.length > 0 && branchId
    ? sections.filter((s) => String(s.branch_id) === branchId)
    : sections

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      const payload = {
        table_number: tableNumber,
        table_name: tableName || null,
        capacity: Number(capacity),
        section_id: sectionId ? Number(sectionId) : null,
      }
      if (table) {
        await tablesApi.update(table.id, payload)
      } else {
        await tablesApi.create({ ...payload, branch_id: branchId })
      }
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={table ? 'Sửa bàn' : 'Thêm bàn'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {!table && branches.length > 0 && (
          <label className="text-sm font-medium text-slate-700">
            Chi nhánh
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value)
                setSectionId('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">-- Chọn chi nhánh --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Input label="Số bàn" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
        <Input label="Tên bàn (tùy chọn)" value={tableName ?? ''} onChange={(e) => setTableName(e.target.value)} />
        <Input
          label="Sức chứa"
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        <label className="text-sm font-medium text-slate-700">
          Khu vực
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Chưa phân khu</option>
            {sectionsInBranch.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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
