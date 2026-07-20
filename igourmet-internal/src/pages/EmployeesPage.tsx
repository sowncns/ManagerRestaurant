import { useEffect, useState } from 'react'
import { Plus, Pencil, KeyRound } from 'lucide-react'
import {
  employeesApi,
  type Employee,
  type RoleOption,
  type EmployeeStatus,
  type KitchenTypeOption,
} from '../api/employees'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, Table, Modal, Input, Select, ErrorText } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { companiesApi, type Company } from '../api/companies'
import { branchesApi, type Branch } from '../api/branches'

const STATUSES: EmployeeStatus[] = ['ACTIVE', 'INACTIVE', 'LOCKED']

const ROLE_RANK: Record<string, number> = {
  SUPER_ADMIN: 100,
  COMPANY_ADMIN: 80,
  BRANCH_MANAGER: 60,
  RECEPTIONIST: 40,
  WAITER: 40,
  CASHIER: 40,
  KITCHEN: 40,
}

export default function EmployeesPage() {
  const { staff } = useAuth()
  const isSuperAdmin = staff?.role === 'SUPER_ADMIN'
  const isCompanyAdmin = staff?.role === 'COMPANY_ADMIN'

  const [list, setList] = useState<Employee[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  const [filterCompanyId, setFilterCompanyId] = useState<number | ''>('')
  const [filterBranchId, setFilterBranchId] = useState<number | ''>('')
  const [filterRoleId, setFilterRoleId] = useState<number | ''>('')

  const [editing, setEditing] = useState<Employee | null>(null)
  const [open, setOpen] = useState(false)
  const [pwFor, setPwFor] = useState<Employee | null>(null)
  const [err, setErr] = useState('')

  async function load() {
    try {
      const [emps, rs] = await Promise.all([employeesApi.list(), employeesApi.listRoles()])
      setList(emps)
      
      const actorRank = ROLE_RANK[staff?.role ?? ''] ?? 0
      const allowedRoles = staff?.role === 'SUPER_ADMIN' 
        ? rs 
        : rs.filter(r => (ROLE_RANK[r.code] ?? 0) < actorRank)
      setRoles(allowedRoles)
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    async function loadMeta() {
      try {
        if (isSuperAdmin) {
          setCompanies(await companiesApi.list())
        }
        if (isSuperAdmin || isCompanyAdmin) {
          setBranches(await branchesApi.list())
        }
      } catch (e) {
        console.error('Failed to load metadata', e)
      }
    }
    void loadMeta()
  }, [isSuperAdmin, isCompanyAdmin])

  async function setStatus(emp: Employee, status: EmployeeStatus) {
    try {
      await employeesApi.changeStatus(emp.employee_id, status)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const roleName = (id: number) => roles.find((r) => r.role_id === id)?.name ?? id

  const filteredList = list.filter((e) => {
    if (filterCompanyId && e.company_id !== filterCompanyId) return false
    if (filterBranchId && e.branch_id !== filterBranchId) return false
    if (filterRoleId && e.role_id !== filterRoleId) return false
    return true
  })

  return (
    <div>
      <PageHeader
        title="Nhân viên"
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus size={16} /> Thêm nhân viên
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {isSuperAdmin && (
          <Select
            value={filterCompanyId}
            onChange={(e) => {
              setFilterCompanyId(e.target.value ? Number(e.target.value) : '')
              setFilterBranchId('') // Reset branch when company changes
            }}
            className="w-full sm:w-auto min-w-[150px]"
          >
            <option value="">Tất cả công ty</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        )}
        {(isSuperAdmin || isCompanyAdmin) && (
          <Select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value ? Number(e.target.value) : '')}
            className="w-full sm:w-auto min-w-[150px]"
          >
            <option value="">Tất cả chi nhánh</option>
            {branches
              .filter((b) => !filterCompanyId || b.company_id === filterCompanyId)
              .map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
          </Select>
        )}
        <Select
          value={filterRoleId}
          onChange={(e) => setFilterRoleId(e.target.value ? Number(e.target.value) : '')}
          className="w-full sm:w-auto min-w-[150px]"
        >
          <option value="">Tất cả chức vụ</option>
          {roles.map((r) => (
            <option key={r.role_id} value={r.role_id}>{r.name}</option>
          ))}
        </Select>
      </div>
      <ErrorText>{err}</ErrorText>
      <Table headers={['Họ tên', 'Tài khoản', 'SĐT', 'Vai trò', 'Trạng thái', '']}>
        {filteredList.map((e) => (
          <tr key={e.employee_id}>
            <td className="px-4 py-3 font-medium text-slate-800">{e.full_name}</td>
            <td className="px-4 py-3">{e.username}</td>
            <td className="px-4 py-3">{e.phone}</td>
            <td className="px-4 py-3">{e.role_name ?? roleName(e.role_id)}</td>
            <td className="px-4 py-3">
              <Select
                value={e.status}
                onChange={(ev) => setStatus(e, ev.target.value as EmployeeStatus)}
                className="py-1"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </td>
            <td className="px-4 py-3 text-right">
              <button
                className="mr-2 text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setEditing(e)
                  setOpen(true)
                }}
              >
                <Pencil size={16} />
              </button>
              <button className="text-slate-500 hover:text-slate-800" onClick={() => setPwFor(e)}>
                <KeyRound size={16} />
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {open && (
        <EmployeeForm
          employee={editing}
          roles={roles}
          companies={companies}
          branches={branches}
          isSuperAdmin={isSuperAdmin}
          isCompanyAdmin={isCompanyAdmin}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void load()
          }}
        />
      )}
      {pwFor && <ResetPwForm employee={pwFor} onClose={() => setPwFor(null)} />}
    </div>
  )
}

function EmployeeForm({
  employee,
  roles,
  companies,
  branches,
  isSuperAdmin,
  isCompanyAdmin,
  onClose,
  onSaved,
}: {
  employee: Employee | null
  roles: RoleOption[]
  companies: Company[]
  branches: Branch[]
  isSuperAdmin: boolean
  isCompanyAdmin: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(employee?.full_name ?? '')
  const [username, setUsername] = useState(employee?.username ?? '')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState(employee?.phone ?? '')
  const [roleId, setRoleId] = useState(String(employee?.role_id ?? roles[0]?.role_id ?? ''))
  const [companyId, setCompanyId] = useState(String(employee?.company_id ?? ''))
  const [branchId, setBranchId] = useState(String(employee?.branch_id ?? ''))
  const [kitchenTypeId, setKitchenTypeId] = useState(String(employee?.kitchen_type_id ?? ''))
  const [kitchenTypes, setKitchenTypes] = useState<KitchenTypeOption[]>([])
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedRoleCode = roles.find((r) => String(r.role_id) === roleId)?.code ?? ''
  const needsCompany = selectedRoleCode !== 'SUPER_ADMIN'
  const needsBranch = !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(selectedRoleCode)
  const isKitchen = selectedRoleCode === 'KITCHEN'

  // Nap danh sach loai bep khi can chon (nhan vien Bep).
  useEffect(() => {
    if (!isKitchen || kitchenTypes.length) return
    employeesApi.listKitchenTypes().then(setKitchenTypes).catch(() => {})
  }, [isKitchen, kitchenTypes.length])

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      const body: any = {
        full_name: fullName,
        phone,
        role_id: Number(roleId),
        company_id: companyId ? Number(companyId) : undefined,
        branch_id: branchId ? Number(branchId) : undefined,
      }
      if (isKitchen) body.kitchen_type_id = kitchenTypeId ? Number(kitchenTypeId) : undefined
      if (employee) {
        await employeesApi.update(employee.employee_id, body)
      } else {
        await employeesApi.create({
          ...body,
          username,
          password,
        })
      }
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={employee ? 'Sửa nhân viên' : 'Thêm nhân viên'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input label="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        {!employee && (
          <>
            <Input
              label="Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}
        <Input label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Select label="Vai trò" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          {roles.map((r) => (
            <option key={r.role_id} value={r.role_id}>
              {r.name}
            </option>
          ))}
        </Select>
        {isSuperAdmin && needsCompany && (
          <Select
            label="Công ty (Bắt buộc)"
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value)
              setBranchId('') // Reset branch
            }}
          >
            <option value="">-- Chọn công ty --</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        {(isSuperAdmin || isCompanyAdmin) && needsBranch && (
          <Select label="Chi nhánh (Bắt buộc)" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">-- Chọn chi nhánh --</option>
            {branches
              .filter((b) => !isSuperAdmin || !companyId || b.company_id === Number(companyId))
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </Select>
        )}
        {isKitchen && (
          <Select label="Loại bếp (Bắt buộc)" value={kitchenTypeId} onChange={(e) => setKitchenTypeId(e.target.value)}>
            <option value="">-- Chọn loại bếp --</option>
            {kitchenTypes.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </Select>
        )}
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

function ResetPwForm({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      await employeesApi.resetPassword(employee.employee_id, password)
      alert('Đã đặt lại mật khẩu')
      onClose()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={`Đặt lại mật khẩu · ${employee.full_name}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input
          label="Mật khẩu mới"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ErrorText>{err}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Đặt lại'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
