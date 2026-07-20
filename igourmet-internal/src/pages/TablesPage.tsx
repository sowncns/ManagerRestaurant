import { useEffect, useMemo, useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { tablesApi, type DiningTable, type Section, type TableStatus } from '../api/tables'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, Modal, Input, Select, Badge, ErrorText } from '../components/ui'
import CheckoutPanel from '../components/CheckoutPanel'
import { useAuth } from '../context/AuthContext'

const ALL = 'all'
const NONE = 'none'
type SectionFilter = number | typeof ALL | typeof NONE

const STATUSES: TableStatus[] = [
  'AVAILABLE',
  'SERVING',
  'WAIT_PAYMENT',
  'RESERVED',
  'DISABLE',
]

const statusStyle: Record<TableStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  SERVING: 'bg-indigo-100 text-indigo-700',
  WAIT_PAYMENT: 'bg-amber-100 text-amber-700',
  RESERVED: 'bg-purple-100 text-purple-700',
  DISABLE: 'bg-slate-100 text-slate-400',
}

export default function TablesPage() {
  const [list, setList] = useState<DiningTable[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [activeSection, setActiveSection] = useState<SectionFilter>(ALL)
  const [open, setOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null)
  const [err, setErr] = useState('')
  const { staff } = useAuth()
  const canManageTables = staff && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER'].includes(staff.role)

  async function load() {
    try {
      const [tables, secs] = await Promise.all([tablesApi.list(), tablesApi.listSections()])
      setList(tables)
      setSections(secs)
      // Giu ban dang chon dong bo voi du lieu moi (tu dong dong neu ban bien mat).
      setSelectedTable((prev) => (prev ? tables.find((t) => t.id === prev.id) ?? null : prev))
    } catch (e) {
      setErr(errMsg(e))
    }
  }

  useEffect(() => {
    void load()
    const timer = setInterval(() => {
      void load()
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  // So ban theo tung khu (de hien badge dem tren tab).
  const countBySection = useMemo(() => {
    const m = new Map<number | null, number>()
    for (const t of list) m.set(t.section_id, (m.get(t.section_id) ?? 0) + 1)
    return m
  }, [list])

  const hasUnassigned = useMemo(() => list.some((t) => t.section_id == null), [list])

  const visibleTables = useMemo(() => {
    if (activeSection === ALL) return list
    if (activeSection === NONE) return list.filter((t) => t.section_id == null)
    return list.filter((t) => t.section_id === activeSection)
  }, [list, activeSection])

  async function changeStatus(t: DiningTable, status: TableStatus) {
    try {
      await tablesApi.changeStatus(t.id, status)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Thu ngân"
        action={
          canManageTables ? (
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> Thêm bàn
            </Button>
          ) : null
        }
      />
      <ErrorText>{err}</ErrorText>

      {/* 2 cot: trai = luoi ban, phai = bang thanh toan (khong con popup) */}
      <div className="flex flex-col gap-5 lg:h-[calc(100vh-11rem)] lg:flex-row">
        {/* LEFT: luoi ban */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Khu vuc: hien ngang, bam de loc ban theo khu */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            <SectionTab
              label="Tất cả"
              count={list.length}
              active={activeSection === ALL}
              onClick={() => setActiveSection(ALL)}
            />
            {sections.map((s) => (
              <SectionTab
                key={s.id}
                label={s.name}
                count={countBySection.get(s.id) ?? 0}
                active={activeSection === s.id}
                onClick={() => setActiveSection(s.id)}
              />
            ))}
            {hasUnassigned && (
              <SectionTab
                label="Chưa phân khu"
                count={countBySection.get(null) ?? 0}
                active={activeSection === NONE}
                onClick={() => setActiveSection(NONE)}
              />
            )}
          </div>

          {visibleTables.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Khu vực này chưa có bàn nào.</p>
          ) : (
            <div className="grid min-h-0 grid-cols-2 gap-4 overflow-y-auto pb-2 sm:grid-cols-3 lg:flex-1 lg:grid-cols-2 xl:grid-cols-3">
              {visibleTables.map((t) => {
                const isPaid = t.status === 'SERVING' && t.active_order_id == null
                const selected = selectedTable?.id === t.id
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTable(t)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedTable(t)}
                    className={`flex cursor-pointer flex-col rounded-xl border bg-white p-4 text-left transition-all ${
                      selected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                        : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="truncate text-lg font-semibold text-slate-900">
                        {t.table_name || `Bàn ${t.table_number}`}
                      </span>
                      <Badge className={isPaid ? 'bg-teal-100 text-teal-700' : statusStyle[t.status]}>
                        {isPaid ? 'ĐÃ THANH TOÁN' : t.status}
                      </Badge>
                    </div>
                    <p className="mb-3 text-sm text-slate-500">Sức chứa: {t.capacity}</p>
                    <Select
                      value={t.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => changeStatus(t, e.target.value as TableStatus)}
                      className="mt-auto py-1"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT: bang thanh toan inline */}
        <div className="w-full shrink-0 lg:h-full lg:w-[400px]">
          {selectedTable ? (
            <CheckoutPanel
              key={selectedTable.id}
              table={selectedTable}
              onClose={() => setSelectedTable(null)}
              onPaid={() => {
                setSelectedTable(null)
                void load()
              }}
            />
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Receipt size={22} />
              </div>
              <p className="text-sm font-medium text-slate-500">Chọn một bàn để thanh toán</p>
            </div>
          )}
        </div>
      </div>

      {open && (
        <TableForm
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

function SectionTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function TableForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [tableNumber, setTableNumber] = useState('')
  const [tableName, setTableName] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      await tablesApi.create({
        table_number: tableNumber,
        table_name: tableName || null,
        capacity: Number(capacity),
      })
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title="Thêm bàn" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input label="Số bàn" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
        <Input label="Tên bàn (tùy chọn)" value={tableName} onChange={(e) => setTableName(e.target.value)} />
        <Input
          label="Sức chứa"
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
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
