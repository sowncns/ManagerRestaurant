import { Link } from 'react-router-dom'

export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">
        Không có quyền truy cập
      </h1>
      <p className="text-slate-500">
        Bạn không có quyền xem trang này.
      </p>
      <Link
        to="/"
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Về Dashboard
      </Link>
    </div>
  )
}
