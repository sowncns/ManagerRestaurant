import { api } from '../lib/api'

export type BranchStatus = 'ACTIVE' | 'INACTIVE'

export interface Branch {
  id: number
  company_id: number
  company_name: string | null
  name: string
  code: string
  phone: string | null
  email: string | null
  address: string | null
  ward: string | null
  district: string | null
  city: string | null
  opening_time: string | null
  closing_time: string | null
  status: BranchStatus
  image_url: string | null
  created_at: string
}

export interface BranchInput {
  company_id?: number
  name: string
  code: string
  address: string
  phone?: string
  email?: string
  ward?: string
  district?: string
  city?: string
  opening_time?: string
  closing_time?: string
  image_url?: string
  status?: BranchStatus
}

export const branchesApi = {
  async list(): Promise<Branch[]> {
    const { data } = await api.get('/internal/branches')
    return data.branches
  },
  async create(body: BranchInput): Promise<Branch> {
    const { data } = await api.post('/internal/branches', body)
    return data.branch
  },
  async update(id: number, body: Partial<BranchInput>): Promise<Branch> {
    const { data } = await api.put(`/internal/branches/${id}`, body)
    return data.branch
  },
  async changeStatus(id: number, status: BranchStatus): Promise<Branch> {
    const { data } = await api.patch(`/internal/branches/${id}/status`, { status })
    return data.branch
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/internal/branches/${id}`)
  },
}
