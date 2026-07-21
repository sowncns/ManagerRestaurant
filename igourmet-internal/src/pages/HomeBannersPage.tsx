import { useEffect, useState } from 'react'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { homeBannersApi, type HomeBanner, type BannerType } from '../api/homeBanners'
import { errMsg } from '../lib/errMsg'
import { Button, PageHeader, Input, Select, ErrorText } from '../components/ui'

const TYPE_LABEL: Record<BannerType, string> = {
  1: 'Slide',
  2: 'Hôm nay ăn gì',
}

export default function HomeBannersPage() {
  const [list, setList] = useState<HomeBanner[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [type, setType] = useState<BannerType>(1)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      setList(await homeBannersApi.list())
      setErr('')
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => {
    void load()
  }, [])

  async function add() {
    if (!imageUrl.trim()) return
    setSaving(true)
    setErr('')
    try {
      await homeBannersApi.create(imageUrl.trim(), type)
      setImageUrl('')
      await load()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    if (!confirm('Xóa ảnh này?')) return
    try {
      await homeBannersApi.remove(id)
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div>
      <PageHeader
        title="Ảnh trang chủ"
        action={
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw size={16} /> Làm mới
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="min-w-[280px] flex-1">
          <Input label="URL ảnh" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
        </div>
        <Select label="Loại" value={type} onChange={(e) => setType(Number(e.target.value) as BannerType)}>
          <option value={1}>1 · Slide</option>
          <option value={2}>2 · Hôm nay ăn gì</option>
        </Select>
        <Button onClick={add} disabled={saving || !imageUrl.trim()}>
          <Plus size={16} /> {saving ? 'Đang thêm...' : 'Thêm ảnh'}
        </Button>
      </div>

      <ErrorText>{err}</ErrorText>

      {([1, 2] as BannerType[]).map((t) => {
        const items = list.filter((b) => b.type === t)
        return (
          <section key={t} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-600">
              {TYPE_LABEL[t]} <span className="rounded-full bg-slate-100 px-2 text-xs">{items.length}</span>
            </h2>
            {items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
                Chưa có ảnh
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((b) => (
                  <div key={b.id} className="group relative overflow-hidden rounded-xl border border-slate-200">
                    <img src={b.image_url} alt="" className="aspect-video w-full object-cover" />
                    <button
                      onClick={() => void remove(b.id)}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-600 opacity-0 shadow transition-opacity group-hover:opacity-100"
                      title="Xóa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
