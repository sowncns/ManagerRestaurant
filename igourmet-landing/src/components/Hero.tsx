import { HERO_IMAGE } from '../lib/format';

const Hero = () => (
  <section id="top" className="relative h-screen min-h-[640px] flex items-center justify-center overflow-hidden">
    <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/60 to-ink" />

    <div className="relative z-10 text-center px-6 max-w-3xl">
      <p className="uppercase tracking-[0.4em] text-gold text-xs sm:text-sm mb-6">Ẩm thực tinh hoa</p>
      <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl leading-tight text-cream mb-6">
        Thưởng thức<br />hương vị đỉnh cao
      </h1>
      <p className="text-cream/70 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
        Hệ thống nhà hàng iGourmet — nơi mỗi món ăn là một tác phẩm, mỗi bữa tối là một trải nghiệm khó quên.
      </p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <a
          href="#dat-ban"
          className="bg-gold text-ink font-medium px-8 py-3.5 rounded-full hover:bg-gold-soft transition-colors"
        >
          Đặt bàn ngay
        </a>
        <a
          href="#thuc-don"
          className="border border-cream/30 text-cream px-8 py-3.5 rounded-full hover:border-gold hover:text-gold transition-colors"
        >
          Xem thực đơn
        </a>
      </div>
    </div>

    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-cream/40 text-xs tracking-widest">
      CUỘN XUỐNG
    </div>
  </section>
);

export default Hero;
