import { Phone, Mail, MessageCircle } from 'lucide-react';

const Footer = () => (
  <footer className="border-t border-white/10 py-14 px-6 bg-charcoal">
    <div className="max-w-6xl mx-auto grid gap-10 sm:grid-cols-3">
      <div>
        <div className="font-serif text-2xl text-cream mb-4">
          i<span className="text-gold">Gourmet</span>
        </div>
        <p className="text-cream/50 text-sm leading-relaxed max-w-xs">
          Hệ thống nhà hàng ẩm thực tinh hoa. Trải nghiệm sự tận tâm trong từng món ăn.
        </p>
      </div>

      <div>
        <h4 className="text-cream font-serif text-lg mb-4">Liên hệ</h4>
        <ul className="space-y-3 text-sm text-cream/60">
          <li className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-gold" /> <a href="tel:0971877469" className="hover:text-gold">0971877469</a>
          </li>
          <li className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-gold" />{' '}
            <a href="mailto:sown.cns@gmail.com" className="hover:text-gold">sown.cns@gmail.com</a>
          </li>
          <li className="flex items-center gap-3">
            <MessageCircle className="w-4 h-4 text-gold" />{' '}
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold">
              @sown.cns
            </a>
          </li>
        </ul>
      </div>

      <div>
        <h4 className="text-cream font-serif text-lg mb-4">Khám phá</h4>
        <ul className="space-y-3 text-sm text-cream/60">
          <li><a href="#thuong-hieu" className="hover:text-gold">Thương hiệu</a></li>
          <li><a href="#thuc-don" className="hover:text-gold">Thực đơn</a></li>
          <li><a href="#chi-nhanh" className="hover:text-gold">Chi nhánh</a></li>
          <li><a href="#dat-ban" className="hover:text-gold">Đặt bàn</a></li>
        </ul>
      </div>
    </div>

    <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-white/5 text-center text-cream/30 text-xs">
      © {new Date().getFullYear()} iGourmet. Bảo lưu mọi quyền.
    </div>
  </footer>
);

export default Footer;
