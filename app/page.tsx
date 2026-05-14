import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import GoldDivider from '@/components/GoldDivider'
import { destinations } from '@/lib/data'

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=90"
            alt="Restaurant de luxe"
            fill
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-noir/60 via-noir/40 to-noir" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[10px] tracking-[0.5em] text-gold uppercase mb-6 opacity-0 animate-[fadeIn_1s_ease_0.3s_forwards]">
            ✦ Service de Conciergerie Privée ✦
          </p>
          <h1 className="font-playfair text-5xl md:text-7xl text-cream mb-6 leading-tight opacity-0 animate-[fadeUp_0.8s_ease_0.5s_forwards]">
            Des réservations
            <span className="block italic text-gold">d&apos;exception</span>
          </h1>
          <p className="text-cream/60 text-lg max-w-xl mx-auto mb-10 leading-relaxed opacity-0 animate-[fadeIn_1s_ease_0.9s_forwards]">
            Accédez aux meilleures tables et clubs des destinations les plus exclusives au monde.
          </p>
          <div className="opacity-0 animate-[fadeIn_1s_ease_1.1s_forwards] flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#destinations"
              className="bg-gold text-noir text-[11px] tracking-[0.3em] uppercase px-10 py-4 hover:bg-gold-light transition-colors duration-300"
            >
              Découvrir
            </Link>
            <Link
              href="/reservation"
              className="border border-gold/40 text-gold text-[11px] tracking-[0.3em] uppercase px-10 py-4 hover:bg-gold/10 transition-colors duration-300"
            >
              Réserver
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-[9px] tracking-[0.3em] text-cream uppercase">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-gold to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── CONCEPT ── */}
      <section id="concept" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <GoldDivider className="mb-16" />

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                icon: '◈',
                title: 'Sélection exclusive',
                desc: 'Uniquement les établissements les plus prisés et confidentiels de chaque destination.',
              },
              {
                icon: '◉',
                title: 'Traitement personnalisé',
                desc: 'Chaque demande est prise en charge individuellement par notre équipe dédiée.',
              },
              {
                icon: '◊',
                title: 'Confirmation rapide',
                desc: 'Réponse garantie sous 24h pour chaque demande de réservation.',
              },
            ].map((item) => (
              <div key={item.title} className="text-center group">
                <div className="text-gold text-3xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                <h3 className="font-playfair text-xl text-cream mb-3">{item.title}</h3>
                <p className="text-cream/40 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <GoldDivider className="mt-16" />
        </div>
      </section>

      {/* ── DESTINATIONS ── */}
      <section id="destinations" className="py-8 px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.4em] text-gold uppercase mb-4">Nos destinations</p>
            <h2 className="font-playfair text-4xl md:text-5xl text-cream">
              Le monde à votre service
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations.map((dest, i) => (
              <Link
                key={dest.slug}
                href={`/destinations/${dest.slug}`}
                className="group relative overflow-hidden aspect-[4/3] card-hover block"
              >
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/40 to-transparent" />
                <div className="absolute inset-0 bg-noir/20 group-hover:bg-noir/10 transition-colors duration-300" />

                {/* Border overlay on hover */}
                <div className="absolute inset-0 border border-gold/0 group-hover:border-gold/40 transition-colors duration-300" />

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="text-[9px] tracking-[0.3em] text-gold uppercase mb-1">
                    {dest.emoji} {dest.country}
                  </div>
                  <h3 className="font-playfair text-2xl text-cream mb-2">{dest.name}</h3>
                  <p className="text-cream/50 text-xs leading-relaxed max-w-xs">
                    {dest.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-gold text-[10px] tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Découvrir
                    <span>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRIP PLANNER PROMO ── */}
      <section className="py-20 px-6 bg-[#0F0F0F]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[10px] tracking-[0.4em] text-violet-light/60 uppercase mb-4">Nouveau · Exclusif</p>
              <h2 className="font-playfair text-4xl text-cream mb-5 leading-tight">
                Planifiez votre
                <span className="italic text-violet-light block">voyage entier</span>
              </h2>
              <p className="text-cream/40 leading-relaxed mb-8">
                Composez votre itinéraire sur-mesure sur plusieurs jours — déjeuners, dîners, beach clubs, soirées. Notre conciergerie gère chaque réservation, dans l'ordre, sans que vous ayez à vous en préoccuper.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/trip-planner"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase px-8 py-4 hover:opacity-90 transition-opacity"
                >
                  Planifier mon séjour
                  <span>→</span>
                </Link>
                <Link
                  href="/reservation"
                  className="inline-flex items-center justify-center border border-white/10 text-cream/50 text-[11px] tracking-[0.2em] uppercase px-8 py-4 hover:border-white/20 hover:text-cream/70 transition-all"
                >
                  Réservation simple
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { day: 'Jour 1', items: ['Déjeuner — Restaurant de plage', 'Dîner — Table étoilée'] },
                { day: 'Jour 2', items: ['Beach Club — Journée complète', 'Soirée — Club VIP'] },
                { day: 'Jour 3', items: ['Brunch panoramique', 'Dîner de gala privé'] },
              ].map((d, i) => (
                <div key={d.day} className="bg-[#1A1A1A] border border-white/5 px-5 py-4 flex items-start gap-4">
                  <div className="flex-shrink-0 w-12">
                    <span className="text-[8px] tracking-[0.3em] text-[#5B3DF5]/60 uppercase">{d.day}</span>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {d.items.map(item => (
                      <div key={item} className="flex items-center gap-2 text-cream/50 text-sm">
                        <span className="text-[#5B3DF5]/40 text-xs">◈</span>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-[9px] px-2 py-0.5 border ${
                      i === 0 ? 'border-green-500/20 text-green-400/60' :
                      i === 1 ? 'border-amber-500/20 text-amber-400/60' :
                      'border-violet-500/20 text-violet-400/60'
                    }`}>
                      {i === 0 ? 'Confirmé' : i === 1 ? 'En attente' : 'Planifié'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1571266028027-1490c7d8c73e?w=1920&q=80"
            alt="Ambiance luxe"
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-noir/70" />
        </div>

        <div className="relative max-w-2xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.4em] text-gold uppercase mb-6">Demande de réservation</p>
          <h2 className="font-playfair text-4xl md:text-5xl text-cream mb-6 leading-tight">
            Prêt à vivre une
            <span className="italic text-gold block">expérience unique ?</span>
          </h2>
          <p className="text-cream/50 mb-10 leading-relaxed">
            Remplissez notre formulaire de réservation en quelques secondes.
            Notre équipe prend en charge le reste.
          </p>
          <Link
            href="/reservation"
            className="inline-block bg-gold text-noir text-[11px] tracking-[0.3em] uppercase px-12 py-4 hover:bg-gold-light transition-colors duration-300"
          >
            Faire une demande
          </Link>
        </div>
      </section>

      <Footer />
    </>
  )
}
