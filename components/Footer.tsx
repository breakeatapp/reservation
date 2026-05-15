import Link from 'next/link'

export default function Footer() {
  const destinations = [
    { name: 'Saint-Tropez', slug: 'saint-tropez' },
    { name: 'Dubai', slug: 'dubai' },
    { name: 'Miami', slug: 'miami' },
    { name: 'Cannes', slug: 'cannes' },
    { name: 'Monaco', slug: 'monaco' },
    { name: 'Courchevel', slug: 'courchevel' },
    { name: 'Saint-Barthélemy', slug: 'saint-barth' },
  ]

  return (
    <footer className="bg-noir border-t border-gold/10 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="text-[9px] tracking-[0.4em] text-gold/50 uppercase mb-2">✦ Service Privé</div>
            <div className="font-playfair text-2xl text-cream mb-4">ÉLITE RESERVATIONS</div>
            <p className="text-cream/40 text-sm leading-relaxed">
              Votre conciergerie de réservations dans les destinations les plus exclusives du monde.
              Discrétion, réactivité, excellence.
            </p>
          </div>

          {/* Destinations */}
          <div>
            <div className="text-[9px] tracking-[0.3em] text-gold/50 uppercase mb-6">Destinations</div>
            <ul className="space-y-3">
              {destinations.map(d => (
                <li key={d.slug}>
                  <Link
                    href={`/destinations/${d.slug}`}
                    className="text-cream/40 text-sm hover:text-gold transition-colors"
                  >
                    {d.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Réservation */}
          <div>
            <div className="text-[9px] tracking-[0.3em] text-gold/50 uppercase mb-6">Réservation</div>
            <p className="text-cream/40 text-sm mb-6 leading-relaxed">
              Chaque réservation est traitée personnellement par notre équipe. Nous confirmons sous 24h.
            </p>
            <Link
              href="/reservation"
              className="inline-block border border-gold/40 text-gold text-[11px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-gold hover:text-noir transition-all duration-300"
            >
              Faire une demande
            </Link>
          </div>
        </div>

        <div className="gold-divider my-10" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-cream/20 text-[11px] tracking-wider">
          <span>© {new Date().getFullYear()} ITINERA. All rights reserved.</span>
          <span>Hospitality Planning Between RPs & Guests</span>
        </div>
      </div>
    </footer>
  )
}
