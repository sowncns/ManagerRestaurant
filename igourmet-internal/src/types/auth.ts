export type Role =
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'BRANCH_MANAGER'
  | 'RECEPTIONIST'
  | 'WAITER'
  | 'CASHIER'
  | 'KITCHEN'

export interface Staff {
  id: string
  full_name: string
  username: string
  company_id: string | null
  branch_id: string | null
  company_name: string | null
  role: Role
  kitchen_type_id?: number | null
  kitchen_type_code?: string | null
  kitchen_type_name?: string | null
  created_at: string
}
