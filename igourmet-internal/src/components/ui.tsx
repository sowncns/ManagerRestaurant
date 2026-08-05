import type { ReactNode } from 'react'

export { Button } from './ui/button'
export { Input } from './ui/input'
export { Select } from './ui/select'
export { Modal } from './ui/modal'
export { Badge } from './ui/badge'
export { DataTable } from './ui/data-table'

// Legacy Table Component for backward compatibility with existing pages
export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-150 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 [&>*:hover]:bg-slate-50 dark:divide-slate-800 text-slate-700 dark:text-slate-300">{children}</tbody>
      </table>
    </div>
  )
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
      {action}
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mb-3">{children}</p>
}
