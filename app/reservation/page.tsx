import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ReservationForm from '@/components/ReservationForm'
import { establishments, destinations } from '@/lib/data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Submit a Request — ITINERA',
  description: 'Submit a hospitality request through your RP. Private access to curated venues.',
}

export default function ReservationPage({
  searchParams,
}: {
  searchParams: { lieu?: string; destination?: string }
}) {
  const estOptions = establishments.map(e => ({
    value: e.name,
    label: `${e.name} — ${destinations.find(d => d.slug === e.destination)?.name}`,
  }))

  return (
    <>
      <Navbar />

      <div className="min-h-screen pt-24 pb-20 px-6">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-[10px] tracking-[0.4em] text-gold/60 uppercase mb-4">
            ✦ Conciergerie Privée ✦
          </p>
          <h1 className="font-playfair text-4xl md:text-5xl text-cream mb-4">
            Demande de
            <span className="italic text-gold"> réservation</span>
          </h1>
          <p className="text-cream/40 leading-relaxed">
            Remplissez le formulaire ci-dessous. Notre équipe confirme votre réservation sous 24h.
          </p>
        </div>

        <ReservationForm
          estOptions={estOptions}
          defaultLieu={searchParams.lieu || ''}
        />
      </div>

      <Footer />
    </>
  )
}
