import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ChefHat } from 'lucide-react'
import { menuApi, type Category, type MenuItem } from '../api/menu'
import { inventoryApi, type RecipeLine, type Ingredient } from '../api/inventory'
import { errMsg } from '../lib/errMsg'
import { employeesApi, type KitchenTypeOption } from '../api/employees'
import { Button, PageHeader, Table, Modal, Input, Select, Badge, ErrorText } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { companiesApi, type Company } from '../api/companies'

export default function MenuPage() {
  const { staff } = useAuth()
  const isSuperAdmin = staff?.role === 'SUPER_ADMIN'
  const isBranchManager = staff?.role === 'BRANCH_MANAGER'

  const [tab, setTab] = useState<'items' | 'categories'>('items')
  const [filterCompanyId, setFilterCompanyId] = useState<number | ''>('')
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    if (isSuperAdmin) {
      companiesApi.list().then(cs => {
        setCompanies(cs)
        if (cs.length > 0 && !filterCompanyId) {
          setFilterCompanyId(cs[0].id)
        }
      }).catch(console.error)
    }
  }, [isSuperAdmin])
  return (
    <div>
      <PageHeader title="Thực đơn" />
      <div className="mb-4 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
        <div className="flex gap-2">
          <Button variant={tab === 'items' ? 'primary' : 'secondary'} onClick={() => setTab('items')}>
            Món ăn
          </Button>
          {/* BRANCH_MANAGER chỉ được toggle hết/còn, không cần quản lý danh mục */}
          {!isBranchManager && (
            <Button
              variant={tab === 'categories' ? 'primary' : 'secondary'}
              onClick={() => setTab('categories')}
            >
              Danh mục
            </Button>
          )}
        </div>
        {isSuperAdmin && (
          <Select
            value={filterCompanyId}
            onChange={(e) => setFilterCompanyId(e.target.value ? Number(e.target.value) : '')}
            className="w-full sm:w-auto min-w-[200px]"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      {tab === 'items' ? <ItemsTab filterCompanyId={filterCompanyId} /> : <CategoriesTab filterCompanyId={filterCompanyId} />}
    </div>
  )
}

function CategoriesTab({ filterCompanyId }: { filterCompanyId: number | '' }) {
  const [list, setList] = useState<Category[]>([])
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    try {
      setList(await menuApi.listCategories())
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => {
    void load()
  }, [])

  async function remove(id: number) {
    if (!confirm('Ngưng sử dụng danh mục này?')) return
    try {
      await menuApi.removeCategory(id, filterCompanyId || undefined)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div>
      <ErrorText>{err}</ErrorText>
      <div className="mb-3 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus size={16} /> Thêm danh mục
        </Button>
      </div>
      <Table headers={['Tên', 'Loại', 'Mô tả', 'Trạng thái', '']}>
        {list
          .filter((c) => (filterCompanyId ? c.company_id === filterCompanyId : false))
          .map((c) => (
          <tr key={c.category_id}>
            <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
            <td className="px-4 py-3">{c.category_type}</td>
            <td className="px-4 py-3 text-slate-500">{c.description}</td>
            <td className="px-4 py-3">
              <Badge
                className={
                  c.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                }
              >
                {c.status}
              </Badge>
            </td>
            <td className="px-4 py-3 text-right">
              <button
                className="mr-2 text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setEditing(c)
                  setOpen(true)
                }}
              >
                <Pencil size={16} />
              </button>
              <button className="text-red-500 hover:text-red-700" onClick={() => remove(c.category_id)}>
                <Trash2 size={16} />
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {open && (
        <CategoryForm
          category={editing}
          filterCompanyId={filterCompanyId}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void load()
          }}
        />
      )}
    </div>
  )
}

function CategoryForm({
  category,
  filterCompanyId,
  onClose,
  onSaved,
}: {
  category: Category | null
  filterCompanyId: number | ''
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [categoryType, setCategoryType] = useState(category?.category_type ?? 'food')
  const [description, setDescription] = useState(category?.description ?? '')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      const body: any = { name, category_type: categoryType, description }
      if (filterCompanyId) body.company_id = filterCompanyId
      
      if (category) await menuApi.updateCategory(category.category_id, body)
      else await menuApi.createCategory(body)
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={category ? 'Sửa danh mục' : 'Thêm danh mục'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input label="Tên danh mục" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Loại (food, drink...)"
          value={categoryType}
          onChange={(e) => setCategoryType(e.target.value)}
        />
        <Input
          label="Mô tả"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <ErrorText>{err}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ItemsTab({ filterCompanyId }: { filterCompanyId: number | '' }) {
  const [list, setList] = useState<MenuItem[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [kitchenTypes, setKitchenTypes] = useState<KitchenTypeOption[]>([])
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<MenuItem | null>(null)
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<number | ''>('')
  const { staff } = useAuth()
  const isManager = staff?.role === 'SUPER_ADMIN' || staff?.role === 'COMPANY_ADMIN'
  const canManage = staff?.role === 'SUPER_ADMIN' || staff?.role === 'COMPANY_ADMIN'

  async function load() {
    try {
      const [items, categories, kTypes] = await Promise.all([
        menuApi.listItems(), 
        menuApi.listCategories(),
        employeesApi.listKitchenTypes()
      ])
      setList(items)
      setCats(categories)
      setKitchenTypes(kTypes)
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => {
    void load()
  }, [])

  async function toggle(it: MenuItem) {
    try {
      await menuApi.setAvailability(it.menu_item_id, !it.is_available, filterCompanyId || undefined)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }
  async function remove(id: number) {
    if (!confirm('Ngưng sử dụng món này?')) return
    try {
      await menuApi.removeItem(id, filterCompanyId || undefined)
      void load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  const catName = (id: number) => cats.find((c) => c.category_id === id)?.name ?? id
  const displayCats = cats.filter((c) => (filterCompanyId ? c.company_id === filterCompanyId : true))

  useEffect(() => {
    if (displayCats.length > 0 && !activeCategoryId) {
      setActiveCategoryId(displayCats[0].category_id)
    }
  }, [displayCats, activeCategoryId])

  const filteredItems = list.filter((it) => {
    if (filterCompanyId) {
      const cat = cats.find((c) => c.category_id === it.category_id)
      if (cat?.company_id !== filterCompanyId) return false
    }
    if (activeCategoryId && it.category_id !== activeCategoryId) return false
    return true
  })

  // Khi chuyen cong ty thi reset activeCategoryId neu khong thuoc cong ty moi
  useEffect(() => {
    if (activeCategoryId && filterCompanyId) {
      const cat = cats.find((c) => c.category_id === activeCategoryId)
      if (cat?.company_id !== filterCompanyId) {
        // Will be picked up by the other useEffect to set to the first displayCat
        setActiveCategoryId('') 
      }
    }
  }, [filterCompanyId, activeCategoryId, cats])

  return (
    <div>
      <ErrorText>{err}</ErrorText>
      <div className="mb-3 flex justify-between items-center">
        <div className="flex w-full space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {displayCats.map((cat) => (
            <button
              key={cat.category_id}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategoryId === cat.category_id
                  ? 'bg-slate-800 text-white shadow'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setActiveCategoryId(cat.category_id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
        {/* BRANCH_MANAGER không được thêm món mới */}
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
            className="ml-4 whitespace-nowrap"
          >
            <Plus size={16} /> Thêm món
          </Button>
        )}
      </div>
      <Table headers={['Tên món', 'Danh mục', 'Giá', 'Phục vụ', '']}>
        {filteredItems.map((it) => (
          <tr key={it.menu_item_id}>
            <td className="px-4 py-3 font-medium text-slate-800">{it.name}</td>
            <td className="px-4 py-3">{it.category_name ?? catName(it.category_id)}</td>
            <td className="px-4 py-3">{Number(it.price).toLocaleString('vi-VN')}đ</td>
            <td className="px-4 py-3">
              <button onClick={() => toggle(it)}>
                <Badge
                  className={
                    it.is_available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }
                >
                  {it.is_available ? 'Còn' : 'Hết'}
                </Badge>
              </button>
            </td>
            <td className="px-4 py-3 text-right">
              {/* BRANCH_MANAGER chỉ được bật/tắt hết-còn, không sửa/xóa */}
              {canManage && (
                <>
                  <button
                    className="mr-2 text-slate-500 hover:text-slate-800"
                    onClick={() => {
                      setEditing(it)
                      setOpen(true)
                    }}
                    title="Sửa món"
                  >
                    <Pencil size={16} />
                  </button>
                  {isManager && (
                    <button
                      className="mr-2 text-slate-500 hover:text-indigo-600"
                      onClick={() => setEditingRecipe(it)}
                      title="Cài đặt công thức"
                    >
                      <ChefHat size={16} />
                    </button>
                  )}
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => remove(it.menu_item_id)}
                    title="Ngưng phục vụ"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </Table>
      {open && (
        <ItemForm
          item={editing}
          categories={cats}
          kitchenTypes={kitchenTypes}
          filterCompanyId={filterCompanyId}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void load()
          }}
        />
      )}
      {editingRecipe && (
        <RecipeForm
          item={editingRecipe}
          filterCompanyId={filterCompanyId}
          onClose={() => setEditingRecipe(null)}
        />
      )}
    </div>
  )
}

function ItemForm({
  item,
  categories,
  kitchenTypes,
  filterCompanyId,
  onClose,
  onSaved,
}: {
  item: MenuItem | null
  categories: Category[]
  kitchenTypes: KitchenTypeOption[]
  filterCompanyId: number | ''
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(item?.name ?? '')
  const [categoryId, setCategoryId] = useState(String(item?.category_id ?? categories[0]?.category_id ?? ''))
  const [kitchenTypeId, setKitchenTypeId] = useState(String(item?.kitchen_type_id ?? '1'))
  const [price, setPrice] = useState(String(item?.price ?? ''))
  const [vat, setVat] = useState(String(item?.vat ?? '0'))
  const [description, setDescription] = useState(item?.description ?? '')
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? '')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    setErr('')
    try {
      const body: any = {
        name,
        category_id: Number(categoryId),
        kitchen_type_id: Number(kitchenTypeId),
        price: Number(price),
        vat: Number(vat),
        description,
        image_url: imageUrl.trim() || undefined,
      }
      if (filterCompanyId) body.company_id = filterCompanyId

      if (item) await menuApi.updateItem(item.menu_item_id, body)
      else await menuApi.createItem(body)
      onSaved()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={item ? 'Sửa món' : 'Thêm món'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input label="Tên món" value={name} onChange={(e) => setName(e.target.value)} />
        <Select label="Danh mục" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select label="Loại bếp" value={kitchenTypeId} onChange={(e) => setKitchenTypeId(e.target.value)}>
          {kitchenTypes.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </Select>
        <Input label="Giá" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Input label="VAT (%)" type="number" value={vat} onChange={(e) => setVat(e.target.value)} />
        <Input
          label="Mô tả"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div>
          <Input
            label="URL ảnh món ăn"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          {imageUrl && (
            <img src={imageUrl} alt="preview" className="mt-2 w-full h-32 object-cover rounded-lg border border-slate-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
          )}
        </div>
        <ErrorText>{err}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function RecipeForm({
  item,
  filterCompanyId,
  onClose,
}: {
  item: MenuItem
  filterCompanyId: number | ''
  onClose: () => void
}) {
  const [lines, setLines] = useState<RecipeLine[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    async function init() {
      try {
        const cId = filterCompanyId ? Number(filterCompanyId) : undefined
        const [igs, rcp] = await Promise.all([
          inventoryApi.listIngredients(cId),
          inventoryApi.getRecipe(item.menu_item_id, cId)
        ])
        setIngredients(igs)
        setLines(rcp.map(r => ({
          ingredient_id: r.ingredient_id,
          quantity: r.quantity,
          notes: r.notes || ''
        })))
      } catch (error) {
        setErr(errMsg(error))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [item.menu_item_id, filterCompanyId])

  const addLine = () => setLines([...lines, { ingredient_id: ingredients[0]?.id || 0, quantity: '1', notes: '' }])

  function updateLine(idx: number, field: keyof RecipeLine, val: string | number) {
    const next = [...lines]
    next[idx] = { ...next[idx], [field]: val }
    setLines(next)
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx))
  }

  async function submit() {
    if (lines.length === 0) {
      setErr('Công thức phải có ít nhất 1 nguyên liệu')
      return
    }
    setSaving(true)
    setErr('')
    try {
      const payload = lines.map(l => ({
        ingredient_id: Number(l.ingredient_id),
        quantity: Number(l.quantity),
        notes: l.notes || undefined
      }))
      const cId = filterCompanyId ? Number(filterCompanyId) : undefined
      await inventoryApi.setRecipe(item.menu_item_id, payload, cId)
      onClose()
    } catch (error) {
      setErr(errMsg(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={`Công thức: ${item.name}`} onClose={onClose}>
      {loading ? (
        <p className="text-sm text-slate-500 py-10 text-center">Đang tải...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <ErrorText>{err}</ErrorText>
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto p-1">
            {lines.map((l, i) => (
              <div key={i} className="p-3 border rounded-lg bg-slate-50 flex flex-col gap-3 relative group">
                <button 
                  className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1" 
                  onClick={() => removeLine(i)}
                  title="Xóa nguyên liệu này"
                >
                  <Trash2 size={16} />
                </button>
                <div className="pr-8">
                  <label className="block text-xs text-slate-500 mb-1 uppercase font-medium">Nguyên liệu</label>
                  <Select
                    value={l.ingredient_id}
                    onChange={(e) => updateLine(i, 'ingredient_id', Number(e.target.value))}
                    className="py-1.5 w-full"
                  >
                    {ingredients.map(ig => (
                      <option key={ig.id} value={ig.id}>
                        {ig.ingredient_name} ({ig.unit})
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 uppercase font-medium">Định lượng</label>
                  <div className="flex items-center">
                    <Input
                      type="number"
                      value={l.quantity}
                      onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                      className="py-1.5 w-full rounded-r-none border-r-0"
                    />
                    <div className="bg-slate-100 border border-slate-300 py-1.5 px-3 text-sm text-slate-600 rounded-r-md min-w-[48px] text-center">
                      {ingredients.find(ig => ig.id === l.ingredient_id)?.unit || '-'}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 uppercase font-medium">Ghi chú</label>
                  <Input
                    value={l.notes || ''}
                    onChange={(e) => updateLine(i, 'notes', e.target.value)}
                    className="py-1.5"
                    placeholder="Tùy chọn..."
                  />
                </div>
              </div>
            ))}
            {lines.length === 0 && (
              <p className="text-center text-slate-400 py-4 text-sm">Chưa có nguyên liệu nào.</p>
            )}
          </div>
          <div className="flex justify-between items-center mt-2">
            <Button variant="secondary" onClick={addLine}>
              <Plus size={16} /> Thêm nguyên liệu
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Hủy</Button>
              <Button onClick={submit} disabled={saving || lines.length === 0}>Lưu công thức</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
