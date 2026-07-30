import { useState, useMemo, type ReactNode } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Inbox, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Input } from './input'
import { Button } from './button'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  className?: string
  render?: (row: T, index: number) => ReactNode
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  error?: string
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  emptyText?: string
  rowKey?: (row: T, index: number) => string | number
  onRowClick?: (row: T) => void
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  error,
  searchable = true,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  pageSize = 10,
  emptyText = 'Không có dữ liệu',
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data
    const term = searchTerm.toLowerCase()
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key]
        return val != null && String(val).toLowerCase().includes(term)
      }),
    )
  }, [data, searchTerm, columns])

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey]
      const valB = b[sortKey]
      if (valA === valB) return 0
      if (valA == null) return 1
      if (valB == null) return -1
      const res = String(valA).localeCompare(String(valB), undefined, { numeric: true })
      return sortOrder === 'asc' ? res : -res
    })
  }, [filteredData, sortKey, sortOrder])

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else {
        setSortKey(null)
        setSortOrder('asc')
      }
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Search Header */}
      {searchable && (
        <div className="flex items-center justify-between gap-4">
          <div className="w-full max-w-xs">
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              leftIcon={<Search size={16} />}
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Tổng cộng: <span className="text-slate-900 dark:text-slate-100 font-semibold">{filteredData.length}</span> bản ghi
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left text-sm border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 backdrop-blur-xs">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key, col.sortable)}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wider select-none',
                    col.sortable && 'cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors',
                    col.className,
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-slate-400">
                        {sortKey === col.key ? (
                          sortOrder === 'asc' ? <ArrowUp size={14} className="text-emerald-600" /> : <ArrowDown size={14} className="text-emerald-600" />
                        ) : (
                          <ArrowUpDown size={13} className="opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                    <span className="text-xs font-medium text-slate-500">Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-rose-600">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertTriangle className="h-6 w-6" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{emptyText}</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const key = rowKey ? rowKey(row, idx) : idx
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      'transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40',
                      onRowClick && 'cursor-pointer',
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-4 py-3 text-sm', col.className)}>
                        {col.render ? col.render(row, idx) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 py-1 text-xs text-slate-500">
          <div>
            Trang <span className="font-semibold text-slate-900 dark:text-slate-100">{currentPage}</span> / {totalPages}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
