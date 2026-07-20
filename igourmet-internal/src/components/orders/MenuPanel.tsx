import { useState } from 'react'
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

  // Chi hien category co it nhat 1 mon dang ban.
  const usedCatIds = new Set(items.map((i) => i.category_id))
  const tabs = categories.filter((c) => usedCatIds.has(c.category_id))
  
  const normSearch = search.trim().toLowerCase()
  const shown = items.filter((i) => {
    if (catId !== 'all' && i.category_id !== catId) return false
    if (normSearch && !i.name.toLowerCase().includes(normSearch)) return false
    return true
  })

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 mb-4 flex flex-col gap-3 bg-white/80 px-4 py-3 backdrop-blur-xl md:bg-white/95">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm món ăn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border-none bg-slate-100/80 py-2.5 pl-10 pr-10 text-[15px] font-medium text-slate-900 placeholder:text-slate-500 focus:bg-slate-200/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-white hover:bg-slate-400"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <Tab active={catId === 'all'} onClick={() => setCatId('all')}>
            Tất cả
          </Tab>
          {tabs.map((c) => (
            <Tab key={c.category_id} active={catId === c.category_id} onClick={() => setCatId(c.category_id)}>
              {c.name}
            </Tab>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((it) => (
          <button
            key={it.menu_item_id}
            onClick={() => onAdd(it)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-indigo-300 active:scale-[0.97]"
          >
            <div className="flex aspect-[4/3] items-center justify-center bg-slate-50 overflow-hidden">
              {it.image_url ? (
                <img src={it.image_url} alt={it.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <ImageOff className="text-slate-300" size={24} />
              )}
            </div>
            <div className="flex flex-1 flex-col p-3 z-10 bg-white">
              <div className="line-clamp-2 text-[13.5px] font-semibold text-slate-800 leading-snug">{it.name}</div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="text-[15px] font-bold text-slate-900">
                  {Number(it.price).toLocaleString('vi-VN')}đ
                </span>
                <span className="rounded-xl bg-slate-900 p-1.5 text-white shadow-sm transition-all duration-300 group-hover:bg-indigo-600 group-hover:shadow-indigo-500/30 group-active:scale-90">
                  <Plus size={16} />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="mt-4 text-sm text-slate-400">Không có món trong nhóm này.</p>}
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-4 py-1.5 text-[14px] font-medium transition-all duration-300 active:scale-95',
        active
          ? 'bg-slate-900 text-white'
          : 'bg-transparent text-slate-600 hover:bg-slate-100',
      )}
    >
      {children}
    </button>
  )
}
