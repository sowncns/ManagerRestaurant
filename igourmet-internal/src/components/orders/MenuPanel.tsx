import { useState, useMemo } from 'react'
import { Plus, ImageOff, Search, X } from 'lucide-react'
import type { MenuItem, Category } from '../../api/menu'
import { cn } from '../../lib/cn'

export default function MenuPanel({
  items,
  categories,
  onAdd,
}: {
  items: MenuItem[]
  categories: Category[]
  onAdd: (item: MenuItem) => void
}) {
  const [catId, setCatId] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')

  // Filter categories with active items
  const usedCatIds = useMemo(() => new Set(items.map((i) => i.category_id)), [items])
  const tabs = useMemo(() => categories.filter((c) => usedCatIds.has(c.category_id)), [categories, usedCatIds])

  const normSearch = search.trim().toLowerCase()
  const shown = useMemo(() => {
    return items.filter((i) => {
      if (catId !== 'all' && i.category_id !== catId) return false
      if (normSearch && !i.name.toLowerCase().includes(normSearch)) return false
      return true
    })
  }, [items, catId, normSearch])

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Search Input & Category Tabs - Mobile Sticky */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-2 pt-1 border-b border-slate-100 dark:border-slate-800 space-y-2">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên món..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-9 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Horizontal Scroll Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setCatId('all')}
            className={cn(
              'shrink-0 h-8 px-3.5 rounded-lg text-xs font-semibold transition-all select-none cursor-pointer',
              catId === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200',
            )}
          >
            Tất cả ({items.length})
          </button>
          {tabs.map((c) => (
            <button
              key={c.category_id}
              onClick={() => setCatId(c.category_id)}
              className={cn(
                'shrink-0 h-8 px-3.5 rounded-lg text-xs font-semibold transition-all select-none cursor-pointer',
                catId === c.category_id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Cards Grid - Mobile Handheld 2 Columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {shown.map((it) => (
          <button
            key={it.menu_item_id}
            onClick={() => onAdd(it)}
            className="group flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left transition-all duration-150 active:scale-[0.97] hover:border-emerald-500 hover:shadow-xs select-none cursor-pointer"
          >
            <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
              {it.image_url ? (
                <img
                  src={it.image_url}
                  alt={it.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <ImageOff className="text-slate-300 dark:text-slate-600" size={20} />
              )}
            </div>

            <div className="flex flex-col justify-between p-2.5 flex-1 w-full">
              <span className="line-clamp-2 text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                {it.name}
              </span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {Number(it.price).toLocaleString('vi-VN')}đ
                </span>
                <span className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs transition-transform group-active:scale-90">
                  <Plus size={16} />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="py-8 text-center text-xs font-medium text-slate-400">Không tìm thấy món phù hợp.</p>
      )}
    </div>
  )
}
