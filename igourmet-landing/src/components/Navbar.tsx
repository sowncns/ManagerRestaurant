import { useEffect, useState } from 'react';

const LINKS = [
  { href: '#thuong-hieu', label: 'Thương hiệu' },
  { href: '#thuc-don', label: 'Thực đơn' },
  { href: '#chi-nhanh', label: 'Chi nhánh' },
  { href: '#dat-ban', label: 'Đặt bàn' },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-ink/90 backdrop-blur-md border-b border-white/5 py-3' : 'py-5'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <a href="#top" className="font-serif text-2xl tracking-wide text-cream">
          i<span className="text-gold">Gourmet</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-cream/70">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-gold transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href="#dat-ban"
          className="text-sm border border-gold/60 text-gold px-5 py-2 rounded-full hover:bg-gold hover:text-ink transition-colors"
        >
          Đặt bàn
        </a>
      </div>
    </header>
  );
};

export default Navbar;
