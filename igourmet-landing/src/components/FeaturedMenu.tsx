import { useEffect, useMemo, useState } from 'react';
import api, { type Company, type MenuCategory, type MenuItem } from '../lib/api';
import { formatPrice, fallbackFood } from '../lib/format';
import SectionHeading from './SectionHeading';

interface Props {
  companies: Company[];
}

type Dish = MenuItem & { category_name: string };

const PAGE_SIZE = 8;
const ALL = 'Tất cả';

const FeaturedMenu = ({ companies }: Props) => {
  const [activeCompany, setActiveCompany] = useState<number | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Chon thuong hieu dau tien khi danh sach san sang.
  useEffect(() => {
    if (activeCompany === null && companies.length > 0) {
      setActiveCompany(companies[0].id);
    }
  }, [companies, activeCompany]);

  // Tai toan bo thuc don khi doi thuong hieu.
  useEffect(() => {
    if (activeCompany === null) return;
    let cancelled = false;
    const fetchMenu = async () => {
      setLoading(true);
      try {
        const res: any = await api.get(`/public/companies/${activeCompany}/menu`);
        const cats: MenuCategory[] = res.menu || res.menuItems || res || [];
        const flat: Dish[] = cats.flatMap((c) =>
          (c.items || []).map((it) => ({ ...it, category_name: c.category_name }))
        );
        if (!cancelled) {
          setDishes(flat);
          setCategories([ALL, ...cats.map((c) => c.category_name)]);
          setActiveCategory(ALL);
          setPage(1);
        }
      } catch {
        if (!cancelled) {
          setDishes([]);
          setCategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMenu();
    return () => {
      cancelled = true;
    };
  }, [activeCompany]);

  const filtered = useMemo(
    () => (activeCategory === ALL ? dishes : dishes.filter((d) => d.category_name === activeCategory)),
    [dishes, activeCategory]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeCategory = (cat: string) => {
    setActiveCategory(cat);
    setPage(1);
  };

  const goToPage = (p: number) => {
    setPage(p);
    document.getElementById('thuc-don')?.scrollIntoView({ behavior: 'smooth' });
  };

  const pillBase = 'px-5 py-2 rounded-full text-sm border transition-colors';
  const pillActive = 'bg-gold text-ink border-gold';
  const pillIdle = 'border-white/15 text-cream/70 hover:border-gold/50';

  return (
    <section id="thuc-don" className="py-24 px-6 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Tinh hoa ẩm thực"
          title="Thực đơn"
          subtitle="Khám phá toàn bộ thực đơn, chế biến từ nguyên liệu chọn lọc."
        />

        {/* Chon thuong hieu */}
        {companies.length > 1 && (
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCompany(c.id)}
                className={`${pillBase} ${activeCompany === c.id ? pillActive : pillIdle}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Chon danh muc */}
        {categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2.5 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => changeCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm border transition-colors ${
                  activeCategory === cat
                    ? 'bg-cream/10 text-gold border-gold/60'
                    : 'border-white/10 text-cream/50 hover:text-cream/80 hover:border-white/25'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center text-cream/40 py-10">Đang tải thực đơn…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-cream/40 py-10">Thực đơn đang được cập nhật.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pageItems.map((item) => (
                <div key={item.id} className="group">
                  <div className="aspect-[4/5] rounded-2xl overflow-hidden mb-4 border border-white/10">
                    <img
                      src={item.image_url || fallbackFood(item.id)}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackFood(item.id);
                      }}
                    />
                  </div>
                  <p className="text-gold/60 text-[11px] uppercase tracking-wider mb-1">{item.category_name}</p>
                  <h3 className="font-serif text-lg text-cream mb-1">{item.name}</h3>
                  {item.description && (
                    <p className="text-cream/50 text-sm line-clamp-2 mb-2">{item.description}</p>
                  )}
                  <p className="text-gold font-medium">{formatPrice(item.price)}</p>
                </div>
              ))}
            </div>

            {/* Phan trang */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-14">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-full border border-white/15 text-cream/70 hover:border-gold/60 hover:text-gold transition-colors disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-cream/70"
                  aria-label="Trang trước"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-10 h-10 rounded-full border text-sm transition-colors ${
                      p === page
                        ? 'bg-gold text-ink border-gold'
                        : 'border-white/15 text-cream/70 hover:border-gold/60 hover:text-gold'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className="w-10 h-10 rounded-full border border-white/15 text-cream/70 hover:border-gold/60 hover:text-gold transition-colors disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-cream/70"
                  aria-label="Trang sau"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default FeaturedMenu;
