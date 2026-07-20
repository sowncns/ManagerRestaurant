import { api } from '../lib/api'

export interface Category {
  category_id: number
  company_id: number
  name: string
  category_type: string
  description: string | null
  status: 'active' | 'inactive'
}

export interface MenuItem {
  menu_item_id: number
  category_id: number
  kitchen_type_id: number
  name: string
  description: string | null
  image_url: string | null
  price: number
  vat: number | null
  is_available: boolean
  status: 'active' | 'inactive'
  category_name?: string
}

export interface KitchenType {
  kitchen_type_id: number
  name: string
}

export const menuApi = {
  async listCategories(): Promise<Category[]> {
    const { data } = await api.get('/internal/menu-categories')
    return data.categories
  },
  async createCategory(body: Partial<Category>): Promise<Category> {
    const { data } = await api.post('/internal/menu-categories', body)
    return data.category
  },
  async updateCategory(id: number, body: Partial<Category>): Promise<Category> {
    const { data } = await api.put(`/internal/menu-categories/${id}`, body)
    return data.category
  },
  async removeCategory(id: number, companyId?: number): Promise<void> {
    const params = companyId ? { company_id: companyId } : undefined
    await api.delete(`/internal/menu-categories/${id}`, { params })
  },

  async listItems(): Promise<MenuItem[]> {
    const { data } = await api.get('/internal/menu-items')
    return data.items
  },
  async createItem(body: Partial<MenuItem>): Promise<MenuItem> {
    const { data } = await api.post('/internal/menu-items', body)
    return data.item
  },
  async updateItem(id: number, body: Partial<MenuItem>): Promise<MenuItem> {
    const { data } = await api.put(`/internal/menu-items/${id}`, body)
    return data.item
  },
  async setAvailability(id: number, is_available: boolean, companyId?: number): Promise<MenuItem> {
    const { data } = await api.patch(`/internal/menu-items/${id}/availability`, { is_available, company_id: companyId })
    return data.item
  },
  async removeItem(id: number, companyId?: number): Promise<void> {
    const params = companyId ? { company_id: companyId } : undefined
    await api.delete(`/internal/menu-items/${id}`, { params })
  },
}
