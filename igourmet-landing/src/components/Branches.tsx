import { useEffect, useState } from 'react';
import { MapPin, Clock, Phone } from 'lucide-react';
import api, { type Company, type Branch } from '../lib/api';
import { hhmm, fullAddress } from '../lib/format';
import SectionHeading from './SectionHeading';

interface Props {
  companies: Company[];
}

const Branches = ({ companies }: Props) => {
  const [activeCompany, setActiveCompany] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeCompany === null && companies.length > 0) {
      setActiveCompany(companies[0].id);
    }
  }, [companies, activeCompany]);

  useEffect(() => {
    if (activeCompany === null) return;
    let cancelled = false;
    const fetchBranches = async () => {
      setLoading(true);
      try {
        const res: any = await api.get(`/public/companies/${activeCompany}/branches`);
        if (!cancelled) setBranches(res.branches || []);
      } catch {
        if (!cancelled) setBranches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBranches();
    return () => {
      cancelled = true;
    };
  }, [activeCompany]);

  return (
    <section id="chi-nhanh" className="py-24 px-6 bg-charcoal">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Ghé thăm"
          title="Hệ thống chi nhánh"
          subtitle="Tìm nhà hàng gần bạn nhất và ghé thăm để trải nghiệm."
        />

        {companies.length > 1 && (
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCompany(c.id)}
                className={`px-5 py-2 rounded-full text-sm border transition-colors ${
                  activeCompany === c.id
                    ? 'bg-gold text-ink border-gold'
                    : 'border-white/15 text-cream/70 hover:border-gold/50'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center text-cream/40 py-10">Đang tải chi nhánh…</div>
        ) : branches.length === 0 ? (
          <div className="text-center text-cream/40 py-10">Chưa có chi nhánh nào.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((b) => (
              <div key={b.id} className="border border-white/10 rounded-2xl p-6 bg-ink/40">
                <h3 className="font-serif text-xl text-cream mb-4">{b.name}</h3>
                <ul className="space-y-3 text-sm text-cream/60">
                  <li className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    <span>{fullAddress(b) || 'Đang cập nhật địa chỉ'}</span>
                  </li>
                  {(b.opening_time || b.closing_time) && (
                    <li className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gold shrink-0" />
                      <span>
                        {hhmm(b.opening_time)} – {hhmm(b.closing_time)}
                      </span>
                    </li>
                  )}
                  {b.phone && (
                    <li className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gold shrink-0" />
                      <a href={`tel:${b.phone}`} className="hover:text-gold transition-colors">
                        {b.phone}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Branches;
