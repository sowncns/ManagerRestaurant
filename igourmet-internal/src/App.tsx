import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Forbidden from './pages/Forbidden'
import ProtectedRoute from './components/ProtectedRoute'
import FloorMapPage from './pages/FloorMapPage'
import TablesPage from './pages/TablesPage'
import OrdersPage from './pages/OrdersPage'
import InvoicesPage from './pages/InvoicesPage'
import KitchenPage from './pages/KitchenPage'
import CancelRequestsPage from './pages/CancelRequestsPage'
import MenuPage from './pages/MenuPage'
import EmployeesPage from './pages/EmployeesPage'
import BranchesPage from './pages/BranchesPage'
import InventoryPage from './pages/InventoryPage'
import AuditLogsPage from './pages/AuditLogsPage'
import CompaniesPage from './pages/CompaniesPage'
import CashbackRatesPage from './pages/CashbackRatesPage'
import HomeBannersPage from './pages/HomeBannersPage'
import VouchersPage from './pages/VouchersPage'
import { ROLE_GROUPS } from './config/nav'
import { useAuth } from './context/AuthContext'

// Trang chu tuy theo vai tro (le tan khong thay dashboard).
function Home() {
  const { staff } = useAuth()
  switch (staff?.role) {
    case 'RECEPTIONIST':
      return <Navigate to="/floor" replace />
    case 'CASHIER':
      return <Navigate to="/tables" replace />
    case 'WAITER':
      return <Navigate to="/orders" replace />
    case 'KITCHEN':
      return <Navigate to="/kitchen" replace />
    default:
      return <Dashboard />
  }
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/403" element={<Forbidden />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />

          <Route element={<ProtectedRoute roles={ROLE_GROUPS.RECEPTIONIST} />}>
            <Route path="floor" element={<FloorMapPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={ROLE_GROUPS.CASHIER} />}>
            <Route path="tables" element={<TablesPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={ROLE_GROUPS.WAITER} />}>
            <Route path="orders" element={<OrdersPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={ROLE_GROUPS.KITCHEN} />}>
            <Route path="kitchen" element={<KitchenPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={ROLE_GROUPS.CANCEL_REQUESTS} />}>
            <Route path="cancel-requests" element={<CancelRequestsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={ROLE_GROUPS.INVENTORY} />}>
            <Route path="inventory" element={<InventoryPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={ROLE_GROUPS.MANAGERS} />}>
            <Route path="menu" element={<MenuPage />} />
            <Route path="staff" element={<EmployeesPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={ROLE_GROUPS.COMPANY_LEVEL} />}>
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="vouchers" element={<VouchersPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
            <Route path="cashback-rates" element={<CashbackRatesPage />} />
            <Route path="home-banners" element={<HomeBannersPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
