import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import GoldDivider from '@/components/GoldDivider'
import { getDestination, getEstablishmentsByDestination, destinations } from '@/lib/data'

export async function generateStaticParams() {
  return destinations.map(d => ({ destination: d.slug }))
}

export async function generateMetadata({ params }: { params: { destination: string } }) {
  const dest = getDestination(params.destination)
  if (!dest) return {}
  return {
    title: `${dest.name} — Curated Access · ITINERA`,
    description: dest.description,
  }
}

export default function DestinationPage({ params }: { params: { destination: string } }) {
  const dest = getDestination(params.destination)
  if (!dest) notFound()

  const establishments = getEstablishmentsByDestination(params.destination)

  const typeColors: Record<string, string> = {
    'Restaurant': 'border-cream/20 text-cream/60',
    'Beach Club': 'border-blue-400/30 text-blue-300/70',
    'Rooftop': 'border-purple-400/30 text-purple-300/70',
    'Nightclub': 'border-red-400/30 text-red-300/70',
    'Lounge': 'border-gold/30 text-gold/70',
  }

  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative h-[60vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={dest.image}
            alt={dest.name}
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/50 to-noir/20" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-16 w-full">
          <Link
            href="/"
            className="text-[10px] tracking-[0.3em] text-gold/60 uppercase hover:text-gold transition-colors mb-6 inline-flex items-center gap-2"
          >
            ← Accueil
          </Link>
          <div className="text-[10px] tracking-[0.3em] text-gold/60 uppercase mb-3">
            {dest.emoji} {dest.country}
          </div>
          <h1 className="font-playfair text-5xl md:text-7xl text-cream mb-4">{dest.name}</h1>
          <p className="text-cream/50 text-lg max-w-xl">{dest.description}</p>
        </div>
      </section>

      {/* ── ESTABLISHMENTS ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-gold/60 uppercase mb-2">Sélection exclusive</p>
            <h2 className="font-playfair text-3xl text-cream">
              {establishments.length} adresse{establishments.length > 1 ? 's' : ''} d&apos;exception
            </h2>
          </div>
          <Link
            href="/reservation"
            className="hidden md:inline-block border border-gold/40 text-gold text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-gold hover:text-noir transition-all duration-300"
          >
            Réserver directement
          </Link>
        </div>

        <GoldDivider className="mb-12" />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {establishments.map(est => (
            <Link
              key={est.slug}
              href={`/destinations/${params.destination}/${est.slug}`}
              className="group bg-noir-light border border-white/5 hover:border-gold/30 card-hover transition-colors duration-300 overflow-hidden block"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={est.image}
                  alt={est.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-70 group-hover:opacity-90"
                />
                {/* Type badge */}
                <div className={`absolute top-3 left-3 border text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 backdrop-blur-sm bg-noir/60 ${typeColors[est.type] || 'border-cream/20 text-cream/60'}`}>
                  {est.type}
                </div>
                {/* Price */}
                <div className="absolute top-3 right-3 text-gold text-xs bg-noir/60 backdrop-blur-sm px-2 py-1">
                  {est.priceRange}
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-playfair text-xl text-cream mb-2 group-hover:text-gold transition-colors">
                  {est.name}
                </h3>
                <p className="text-cream/40 text-sm leading-relaxed mb-4 line-clamp-2">
                  {est.shortDesc}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {est.tags.map(tag => (
                    <span key={tag} className="text-[9px] tracking-wider text-cream/30 border border-cream/10 px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="text-[10px] tracking-[0.2em] text-gold uppercase flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Voir et réserver →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </>
  )
}
