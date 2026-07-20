interface Props {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

const SectionHeading = ({ eyebrow, title, subtitle }: Props) => (
  <div className="text-center max-w-2xl mx-auto mb-14">
    <p className="uppercase tracking-[0.35em] text-gold text-xs mb-4">{eyebrow}</p>
    <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-cream mb-4">{title}</h2>
    {subtitle && <p className="text-cream/60 leading-relaxed">{subtitle}</p>}
    <div className="w-16 h-px bg-gold/50 mx-auto mt-8" />
  </div>
);

export default SectionHeading;
