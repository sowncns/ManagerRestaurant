import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '../lib/cn'
import { nav } from '../config/nav'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { staff, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    navigate('/login', { replace: true })
    await logout()
  }

  const visibleNav = nav.filter((item) => staff && item.roles.includes(staff.role))

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-slate-50/50">
      <aside className={cn(
        "fixed bottom-0 left-0 z-50 w-full border-t border-slate-200 bg-white md:static md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-t-0 md:px-4 md:py-6",
        visibleNav.length <= 1 ? "hidden" : "block"
      )}>
        <div className="hidden px-2 text-lg font-semibold text-slate-900 md:mb-8 md:block">
          iGourmet <span className="text-slate-400">Internal</span>
        </div>
        <nav className="flex justify-around px-2 py-2 md:flex-col md:gap-1 md:p-0">
          {visibleNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors md:flex-row md:gap-3 md:px-3 md:py-2 md:text-sm',
                  isActive
                    ? 'text-indigo-600 md:bg-slate-900 md:text-white'
                    : 'text-slate-500 md:text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <Icon className="h-5 w-5 md:h-[18px] md:w-[18px]" />
              <span className="text-center">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      
      <div className={cn(
        "flex w-full flex-1 flex-col md:pb-0",
        visibleNav.length <= 1 ? "pb-0" : "pb-16"
      )}>
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md md:justify-end md:px-8">
          <div className="text-base font-semibold text-slate-900 md:hidden">
            iGourmet <span className="text-slate-400">Internal</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-sm text-slate-600 sm:block">
              <span className="font-medium text-slate-900">{staff?.full_name}</span>
              {' · '}
              {staff?.role}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg p-2 text-sm text-slate-500 hover:bg-slate-100 md:px-2 md:py-1.5"
              title="Đăng xuất"
            >
              <LogOut size={18} className="md:h-4 md:w-4" />
              <span className="hidden md:inline">Đăng xuất</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-3 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

