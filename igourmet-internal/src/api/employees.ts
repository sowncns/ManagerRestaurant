import { api } from '../lib/api'

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'

export interface Employee {
  employee_id: number
  full_name: string
  username: string
  phone: string | null
  role_id: number
  role_name?: string
  branch_id: number | null
  company_id: number | null
  kitchen_type_id?: number | null
  kitchen_type_code?: string | null
  kitchen_type_name?: string | null
  status: EmployeeStatus
  created_at: string
}

export interface RoleOption {
  role_id: number
  code: string
  name: string
}

export interface KitchenTypeOption {
  id: number
  code: string
  name: string
}

export interface CreateEmployeeInput {
  full_name: string
  username: string
  password: string
  phone?: string
  role_id: number
  branch_id?: number
  kitchen_type_id?: number | null
  status?: EmployeeStatus
}

export const employeesApi = {
  async list(): Promise<Employee[]> {
    const { data } = await api.get('/internal/employees')
    return data.employees
  },
  async listRoles(): Promise<RoleOption[]> {
    const { data } = await api.get('/internal/employees/roles')
    return data.roles.map((r: any) => ({ ...r, role_id: r.id ?? r.role_id }))
  },
  async listKitchenTypes(): Promise<KitchenTypeOption[]> {
    const { data } = await api.get('/internal/employees/kitchen-types')
    return data.kitchen_types
  },
  async create(body: CreateEmployeeInput): Promise<Employee> {
    const { data } = await api.post('/internal/employees', body)
    return data.employee
  },
  async update(id: number, body: Partial<CreateEmployeeInput>): Promise<Employee> {
    const { data } = await api.put(`/internal/employees/${id}`, body)
    return data.employee
  },
  async changeStatus(id: number, status: EmployeeStatus): Promise<Employee> {
    const { data } = await api.patch(`/internal/employees/${id}/status`, { status })
    return data.employee
  },
  async resetPassword(id: number, password: string): Promise<void> {
    await api.post(`/internal/employees/${id}/reset-password`, { password })
  },
}
