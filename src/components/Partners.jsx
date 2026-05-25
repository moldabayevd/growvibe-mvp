const partners = [
  { name: 'Kazakhtelecom', src: '/logos/kt.webp' },
  { name: 'Samruk Business Academy', src: '/logos/sba.png' },
  { name: 'ЦПФЭД', src: '/logos/cpfed.png' },
]

export default function Partners() {
  return (
    <section className="py-10 bg-white border-b border-cyan-100">
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-center text-ink-400 text-xs uppercase tracking-widest font-medium mb-8">
          Нас поддерживают
        </p>
        <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
          {partners.map((p) => (
            <img
              key={p.name}
              src={p.src}
              alt={p.name}
              className="h-10 md:h-12 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
