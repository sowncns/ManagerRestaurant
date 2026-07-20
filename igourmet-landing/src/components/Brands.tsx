import type { Company } from '../lib/api';
import SectionHeading from './SectionHeading';

interface Props {
  companies: Company[];
  loading: boolean;
}

const Brands = ({ companies, loading }: Props) => (
  <section id="thuong-hieu" className="py-24 px-6 bg-charcoal">
    <div className="max-w-6xl mx-auto">
      <SectionHeading
        eyebrow="Bộ sưu tập"
        title="Các thương hiệu của chúng tôi"
        subtitle="Mỗi thương hiệu mang một phong cách ẩm thực riêng, cùng chung một chuẩn mực về chất lượng."
      />

      {loading ? (
        <div className="text-center text-cream/40 py-10">Đang tải thương hiệu…</div>
      ) : companies.length === 0 ? (
        <div className="text-center text-cream/40 py-10">Chưa có thương hiệu nào.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((c) => (
            <div
              key={c.id}
              className="group border border-white/10 rounded-2xl p-8 text-center hover:border-gold/50 transition-colors bg-ink/40"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-ink border border-white/10 flex items-center justify-center overflow-hidden">
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif text-2xl text-gold">{c.name.charAt(0)}</span>
                )}
              </div>
              <h3 className="font-serif text-xl text-cream mb-3 group-hover:text-gold transition-colors">
                {c.name}
              </h3>
              <p className="text-cream/50 text-sm leading-relaxed line-clamp-3">
                {c.description || 'Trải nghiệm ẩm thực tinh tế, phục vụ tận tâm.'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

export default Brands;
