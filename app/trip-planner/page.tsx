import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import TripPlanner from '@/components/TripPlanner'
import { destinations, establishments } from '@/lib/data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planificateur de voyage — Élite Reservations',
  description: 'Planifiez votre séjour de luxe : créez votre itinéraire sur-mesure avec toutes vos réservations.',
}

export default function TripPlannerPage() {
  const destOptions = destinations.map(d => ({ slug: d.slug, name: d.name, emoji: d.emoji }))
  const estData = establishments.map(e => ({
    name: e.name,
    destination: e.destination,
    type: e.type,
  }))

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <p className="text-[10px] tracking-[0.4em] text-gold/60 uppercase mb-4">
            ✦ Conciergerie Privée ✦
          </p>
          <h1 className="font-playfair text-4xl md:text-5xl text-cream mb-4">
            Planificateur
            <span className="italic text-gold"> de voyage</span>
          </h1>
          <p className="text-cream/40 leading-relaxed max-w-xl mx-auto">
            Composez votre itinéraire sur-mesure : sélectionnez votre destination, vos dates, et ajoutez toutes vos réservations jour par jour.
          </p>
        </div>
        <TripPlanner destinations={destOptions} establishments={estData} />
      </div>
      <Footer />
    </>
  )
}
