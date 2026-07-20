import { api } from '../lib/api'

export type IngredientStatus = 'ACTIVE' | 'INACTIVE'

export interface Ingredient {
  id: number
  company_id: number
  ingredient_code: string
  ingredient_name: string
  unit: string
  current_stock: number | string
  minimum_stock: number | string
  cost_price: number | string
  status: IngredientStatus
  note: string | null
}

export interface IngredientInput {
  ingredient_code: string
  ingredient_name: string
  unit: string
  current_stock?: number
  minimum_stock?: number
  cost_price?: number
  note?: string
}

export interface RecipeLine {
  recipe_id?: number
  ingredient_id: number
  ingredient_name?: string
  unit?: string
  quantity: number | string
  notes?: string | null
}

export type StockTxnType =
  | 'PURCHASE'
  | 'INTERNAL_TRANSFER'
  | 'RETURN_SUPPLIER'
  | 'WASTE'
  | 'STOCK_ADJUSTMENT'
  | 'STOCK_COUNT'

export interface StockTxn {
  transaction_id?: number
  id?: number
  ingredient_id: number
  ingredient_name?: string
  type: StockTxnType
  quantity: number | string
  note: string | null
  created_at: string
}

// companyId/branchId chi can cho SUPER_ADMIN / COMPANY_ADMIN.
const withCompanyAndBranch = (companyId?: number, branchId?: number, extra: Record<string, unknown> = {}) => {
  const params: Record<string, unknown> = { ...extra }
  if (companyId) params.companyId = companyId
  if (branchId) params.branchId = branchId
  return { params }
}

export const inventoryApi = {
  async listIngredients(companyId?: number, branchId?: number, search?: string): Promise<Ingredient[]> {
    const { data } = await api.get('/internal/inventory/ingredients', withCompanyAndBranch(companyId, branchId, search ? { search } : {}))
    return data.ingredients
  },
  async lowStock(companyId?: number, branchId?: number): Promise<Ingredient[]> {
    const { data } = await api.get('/internal/inventory/ingredients/low-stock', withCompanyAndBranch(companyId, branchId))
    return data.ingredients
  },
  async create(body: IngredientInput, companyId?: number, branchId?: number): Promise<Ingredient> {
    const { data } = await api.post('/internal/inventory/ingredients', { ...body, companyId, branchId }, withCompanyAndBranch(companyId, branchId))
    return data.ingredient
  },
  async update(id: number, body: Partial<IngredientInput> & { status?: IngredientStatus }, companyId?: number, branchId?: number): Promise<Ingredient> {
    const { data } = await api.put(`/internal/inventory/ingredients/${id}`, { ...body, companyId, branchId }, withCompanyAndBranch(companyId, branchId))
    return data.ingredient
  },
  async remove(id: number, companyId?: number, branchId?: number): Promise<void> {
    await api.delete(`/internal/inventory/ingredients/${id}`, withCompanyAndBranch(companyId, branchId))
  },
  async createTransaction(
    body: { ingredientId: number; type: StockTxnType; quantity: number; note?: string },
    companyId?: number,
    branchId?: number,
  ): Promise<unknown> {
    const { data } = await api.post('/internal/inventory/transactions', { ...body, companyId, branchId }, withCompanyAndBranch(companyId, branchId))
    return data
  },
  async transactions(companyId?: number, branchId?: number, ingredientId?: number): Promise<StockTxn[]> {
    const { data } = await api.get(
      '/internal/inventory/transactions',
      withCompanyAndBranch(companyId, branchId, ingredientId ? { ingredientId } : {}),
    )
    return data.transactions
  },
  async getRecipe(menuItemId: number, companyId?: number): Promise<RecipeLine[]> {
    const { data } = await api.get(`/internal/inventory/recipes/menu-item/${menuItemId}`, withCompanyAndBranch(companyId))
    return data.recipe || []
  },
  async setRecipe(menuItemId: number, items: RecipeLine[], companyId?: number): Promise<void> {
    await api.put(`/internal/inventory/recipes/menu-item/${menuItemId}`, { items, companyId }, withCompanyAndBranch(companyId))
  },
}
