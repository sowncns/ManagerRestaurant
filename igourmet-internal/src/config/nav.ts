import { LayoutDashboard, Utensils, ClipboardList, Users, Grid3x3, Map, Store, Package, Building2, Ban, ChefHat, FileText, Ticket, Coins, ReceiptText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '../types/auth'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  roles: Role[]
}

// Quan ly/Admin: thay tat ca
const MANAGERS: Role[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER']

// Cap cong ty: super admin & company admin (quan ly cong ty).
const COMPANY_LEVEL: Role[] = ['SUPER_ADMIN', 'COMPANY_ADMIN']

// Cac trang VAN HANH cap thap chi danh cho dung nhan vien chuyen trach.
// Quan ly (MANAGERS) KHONG tham gia van hanh -> chi lo chuc nang cao cap.
export const ROLE_GROUPS = {
  ALL: [...MANAGERS, 'RECEPTIONIST', 'WAITER', 'CASHIER', 'KITCHEN'] as Role[],
  CASHIER: ['CASHIER'] as Role[], // Thu ngan
  WAITER: ['WAITER'] as Role[], // Don hang (phuc vu)
  RECEPTIONIST: ['RECEPTIONIST'] as Role[], // So do ban + Dat ban (le tan)
  KITCHEN: ['KITCHEN'] as Role[], // Bep: hang doi mon + QR
  // Yeu cau huy mon: bep duyet.
  CANCEL_REQUESTS: ['KITCHEN'] as Role[],
  // Kho: quan ly quan tri; bep chi xem de theo doi nguyen lieu.
  INVENTORY: [...MANAGERS, 'KITCHEN'] as Role[],
  MANAGERS,
  COMPANY_LEVEL,
}

export const nav: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ROLE_GROUPS.MANAGERS },
  { to: '/companies', label: 'Công ty', icon: Building2, roles: ROLE_GROUPS.COMPANY_LEVEL },
  { to: '/vouchers', label: 'Voucher', icon: Ticket, roles: ROLE_GROUPS.COMPANY_LEVEL },
  { to: '/cashback-rates', label: 'Cashback', icon: Coins, roles: ['SUPER_ADMIN'] },
  { to: '/floor', label: 'Sơ đồ bàn', icon: Map, roles: ROLE_GROUPS.RECEPTIONIST },
  { to: '/tables', label: 'Thu ngân', icon: Grid3x3, roles: ROLE_GROUPS.CASHIER },
  { to: '/invoices', label: 'Công nợ', icon: ReceiptText, roles: ROLE_GROUPS.CASHIER },
  { to: '/orders', label: 'Đơn hàng', icon: ClipboardList, roles: ROLE_GROUPS.WAITER },
  { to: '/kitchen', label: 'Bếp', icon: ChefHat, roles: ROLE_GROUPS.KITCHEN },
  { to: '/cancel-requests', label: 'Yêu cầu hủy', icon: Ban, roles: ROLE_GROUPS.CANCEL_REQUESTS },
  { to: '/menu', label: 'Thực đơn', icon: Utensils, roles: ROLE_GROUPS.MANAGERS },
  { to: '/branches', label: 'Chi nhánh', icon: Store, roles: ROLE_GROUPS.MANAGERS },
  { to: '/inventory', label: 'Kho', icon: Package, roles: ROLE_GROUPS.INVENTORY },
  { to: '/staff', label: 'Nhân viên', icon: Users, roles: ROLE_GROUPS.MANAGERS },
  { to: '/audit-logs', label: 'Nhật ký hệ thống', icon: FileText, roles: ROLE_GROUPS.MANAGERS },
]
