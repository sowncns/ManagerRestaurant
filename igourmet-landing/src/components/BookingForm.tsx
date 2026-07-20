import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import api, { type Company, type Branch } from '../lib/api';
import SectionHeading from './SectionHeading';

interface Props {
  companies: Company[];
}

const inputClass =
  'w-full bg-ink border border-white/15 rounded-xl px-4 py-3 text-cream placeholder-cream/30 outline-none focus:border-gold transition-colors';

const BookingForm = ({ companies }: Props) => {
  const [companyId, setCompanyId] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [guests, setGuests] = useState('2');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Tai chi nhanh khi doi thuong hieu.
  useEffect(() => {
    setBranchId('');
    setBranches([]);
    if (!companyId) return;
    let cancelled = false;
    api
      .get(`/public/companies/${companyId}/branches`)
      .then((res: any) => {
        if (!cancelled) setBranches(res.branches || []);
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!branchId || !name.trim() || !phone.trim() || !date || !time) {
      setError('Vui lòng điền đầy đủ: chi nhánh, họ tên, số điện thoại, ngày và giờ.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        branch_id: Number(branchId),
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        guest_count: Number(guests),
        reservation_date: date,
        reservation_time: time,
      };
      if (email.trim()) payload.customer_email = email.trim();
      if (note.trim()) payload.note = note.trim();

      await api.post('/public/reservations', payload);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi đặt bàn. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="dat-ban" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <SectionHeading
          eyebrow="Đặt chỗ"
          title="Đặt bàn trực tuyến"
          subtitle="Không cần đăng nhập. Điền thông tin và nhà hàng sẽ liên hệ xác nhận với bạn."
        />

        {success ? (
          <div className="border border-gold/40 rounded-2xl p-10 text-center bg-charcoal">
            <div className="w-16 h-16 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl text-cream mb-3">Đặt bàn thành công!</h3>
            <p className="text-cream/60 mb-8">
              Yêu cầu của bạn đã được gửi. Chúng tôi sẽ sớm liên hệ để xác nhận.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="border border-gold/60 text-gold px-8 py-3 rounded-full hover:bg-gold hover:text-ink transition-colors"
            >
              Đặt bàn khác
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="border border-red-500/40 bg-red-500/10 text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-5">
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
                <option value="">-- Chọn thương hiệu --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={!companyId}
                className={`${inputClass} disabled:opacity-40`}
              >
                <option value="">{companyId ? '-- Chọn chi nhánh --' : '-- Chọn thương hiệu trước --'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Họ và tên *"
                className={inputClass}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Số điện thoại *"
                type="tel"
                className={inputClass}
              />

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (không bắt buộc)"
                type="email"
                className={`${inputClass} sm:col-span-2`}
              />

              <select value={guests} onChange={(e) => setGuests(e.target.value)} className={inputClass}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n} khách
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className={inputClass} />
                <input value={time} onChange={(e) => setTime(e.target.value)} type="time" className={inputClass} />
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Ghi chú thêm (dịp đặc biệt, yêu cầu riêng...)"
                className={`${inputClass} sm:col-span-2 resize-none`}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gold text-ink font-medium py-4 rounded-full hover:bg-gold-soft transition-colors disabled:opacity-60"
            >
              {submitting ? 'Đang gửi yêu cầu…' : 'Xác nhận đặt bàn'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default BookingForm;
