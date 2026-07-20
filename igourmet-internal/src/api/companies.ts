import { api } from '../lib/api'

export type CompanyStatus = 'ACTIVE' | 'INACTIVE'

export interface Company {
  id: number
  name: string
  description: string | null
  logo_url: string | null
  phone: string | null
  email: string | null
  status: CompanyStatus
  created_at?: string
}

export interface CompanyInput {
  name: string
  description?: string
  logo_url?: string
  phone?: string
  email?: string
  status?: CompanyStatus
}

export const companiesApi = {
  async list(): Promise<Company[]> {
    const { data } = await api.get('/internal/companies')
    return data.companies
  },
  async create(body: CompanyInput): Promise<Company> {
    const { data } = await api.post('/internal/companies', body)
    return data.company
  },
  async update(id: number, body: Partial<CompanyInput>): Promise<Company> {
    const { data } = await api.put(`/internal/companies/${id}`, body)
    return data.company
  },
}
