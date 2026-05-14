import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import GoldDivider from '@/components/GoldDivider'
import { getDestination, getEstablishment, establishments } from '@/lib/data'

export async function generateStaticParams() {
  return establishments.map(e => ({
    destination: e.destination,
    slug: e.slug,
  }))
}

export async function generateMetadata({ params }: { params: { destination: string; slug: string } }) {
  const est = getEstablishment(params.destination, params.slug)
  if (!est) return {}
  return {
    title: `${est.name} — Réservation · Élite Reservations`,
    description: est.shortDesc,
  }
}

export default function EstablishmentPage({ params }: { params: { destination: string; slug: string } }) {
  const dest = getDestination(params.destination)
  const est = getEstablishment(params.destination, params.slug)

  if (!dest || !est) notFound()

  const reservationUrl = `/reservation?lieu=${encodeURIComponent(est.name)}&destination=${encodeURIComponent(dest.name)}`

  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative h-[70vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={est.image}
            alt={est.name}
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/50 to-noir/10" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-16 w-full">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-gold/50 uppercase mb-6">
            <Link href="/" className="hover:text-gold transition-colors">Accueil</Link>
            <span>/</span>
            <Link href={`/destinations/${params.destination}`} className="hover:text-gold transition-colors">{dest.name}</Link>
            <span>/</span>
            <span className="text-gold/80">{est.name}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="border border-gold/30 text-gold text-[9px] tracking-[0.2em] uppercase px-2.5 py-1">
                  {est.type}
                </span>
                <span className="text-gold/60">{est.priceRange}</span>
              </div>
              <h1 className="font-playfair text-5xl md:text-6xl text-cream mb-3">{est.name}</h1>
              <p className="text-cream/50 text-lg">{est.shortDesc}</p>
            </div>

            <Link
              href={reservationUrl}
              className="flex-shrink-0 bg-gold text-noir text-[11px] tracking-[0.3em] uppercase px-10 py-4 hover:bg-gold-light transition-colors duration-300 text-center"
            >
              Réserver une table
            </Link>
          </div>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Main content */}
          <div className="md:col-span-2">
            <p className="text-[10px] tracking-[0.3em] text-gold/60 uppercase mb-4">À propos</p>
            <p className="text-cream/70 text-lg leading-relaxed mb-12 font-light">
              {est.description}
            </p>

            <GoldDivider className="mb-10" />

            {/* Tags */}
            <p className="text-[10px] tracking-[0.3em] text-gold/60 uppercase mb-4">Ambiance & Style</p>
            <div className="flex flex-wrap gap-2">
              {est.tags.map(tag => (
                <span key={tag} className="border border-gold/20 text-cream/60 text-[10px] tracking-[0.15em] uppercase px-3 py-1.5">
                  {tag}
                </span>
              ))}
              {est.cuisine && (
                <span className="border border-gold/40 text-gold text-[10px] tracking-[0.15em] uppercase px-3 py-1.5">
                  {est.cuisine}
                </span>
              )}
            </div>
          </div>

          {/* Sidebar info */}
          <div className="space-y-1">
            <div className="bg-noir-light border border-white/5 p-6">
              <p className="text-[9px] tracking-[0.3em] text-gold/60 uppercase mb-6">Informations</p>

              <div className="space-y-5">
                <div>
                  <p className="text-[9px] tracking-[0.2em] text-cream/30 uppercase mb-1">Adresse</p>
                  <p className="text-cream/70 text-sm">{est.address}</p>
                </div>
                <div className="h-px bg-white/5" />
                <div>
                  <p className="text-[9px] tracking-[0.2em] text-cream/30 uppercase mb-1">Horaires</p>
                  <p className="text-cream/70 text-sm">{est.openTime} – {est.closeTime}</p>
                </div>
                <div className="h-px bg-white/5" />
                <div>
                  <p className="text-[9px] tracking-[0.2em] text-cream/30 uppercase mb-1">Gamme de prix</p>
                  <p className="text-gold text-sm">{est.priceRange}</p>
                </div>
              </div>
            </div>

            <Link
              href={reservationUrl}
              className="block w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase px-6 py-4 hover:opacity-90 transition-opacity text-center"
            >
              Réserver maintenant
            </Link>

            <Link
              href="/reservation"
              className="block w-full border border-white/10 text-[#F5F5F3]/50 text-[11px] tracking-[0.3em] uppercase px-6 py-4 hover:border-[#5B3DF5]/40 hover:text-[#8B5CF6] transition-colors text-center"
            >
              Voir toutes les destinations
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
