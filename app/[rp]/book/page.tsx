import { notFound } from 'next/navigation'
import { getRPProfile, getRPEstablishmentOptions, getRPDestinations, getRPEstablishments, getRPVenueServices } from '@/lib/rp'
import RPReservationForm from '@/components/RPReservationForm'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { parseVenueEntry } from '@/lib/venue-utils'

type Props = {
  params: { rp: string }
  searchParams: { venue?: string; destination?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getRPProfile(params.rp)
  if (!profile) return { title: 'Page introuvable' }
  return { title: `Réserver — ${profile.display_name}` }
}

export default async function RPBookPage({ params, searchParams }: Props) {
  const profile = await getRPProfile(params.rp)
  if (!profile) notFound()

  const estOptions = getRPEstablishmentOptions(profile)
  const venueServices = getRPVenueServices(profile)
  const destinations = getRPDestinations(profile)
  const allEstablishments = getRPEstablishments(profile)
  const venueConfigs = profile.activated_venues.map(parseVenueEntry)

  return (
    <div className="min-h-screen bg-[#0B0B0B] pt-8 pb-20 px-6">
      {/* Mini nav */}
      <div className="max-w-2xl mx-auto mb-10">
        <Link href={`/${params.rp}`} className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-[#F5F5F3]/55 uppercase hover:text-[#F5F5F3]/85 transition-colors border border-white/12 hover:border-white/25 px-4 py-2.5">
          ← {profile.display_name}
        </Link>
      </div>

      <div className="max-w-2xl mx-auto text-center mb-12">
        <p className="text-[9px] tracking-[0.5em] text-[#F5F5F3]/20 uppercase mb-4">
          ✦ {profile.display_name} ✦
        </p>
        <h1 className="font-playfair text-4xl md:text-5xl text-[#F5F5F3] mb-4">
          Demande de
          <span className="italic text-[#F5F5F3]/40"> réservation</span>
        </h1>
        <p className="text-[#F5F5F3]/30 leading-relaxed text-sm">
          Confirmation sous 24h · Traitement confidentiel
        </p>
      </div>

      <RPReservationForm
        estOptions={estOptions}
        defaultVenue={searchParams.venue || ''}
        defaultDestination={searchParams.destination || ''}
        rpSlug={params.rp}
        rpProfile={{
          display_name: profile.display_name,
          whatsapp: profile.whatsapp,
          email: profile.email,
          accent_color: profile.accent_color,
        }}
        venueServices={venueServices}
        destinations={destinations}
        establishments={allEstablishments}
        venueConfigs={venueConfigs}
      />
    </div>
  )
}
