import { notFound } from 'next/navigation'
import { getRPProfile, getRPDestinations, getRPEstablishments } from '@/lib/rp'
import TripPlanner from '@/components/TripPlanner'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: { rp: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getRPProfile(params.rp)
  if (!profile) return { title: 'Page introuvable' }
  return { title: `Planifier mon voyage — ${profile.display_name}` }
}

export default async function RPTripPage({ params }: Props) {
  const profile = await getRPProfile(params.rp)
  if (!profile) notFound()

  const rpDestinations = getRPDestinations(profile)
  const rpEstablishments = getRPEstablishments(profile)

  const destOptions = rpDestinations.map(d => ({ slug: d.slug, name: d.name, emoji: d.emoji }))
  const estData = rpEstablishments.map(e => ({ name: e.name, destination: e.destination, type: e.type }))

  return (
    <div className="min-h-screen bg-[#0B0B0B] pt-8 pb-20 px-6">
      {/* Mini nav */}
      <div className="max-w-3xl mx-auto mb-10 flex items-center justify-between">
        <Link href={`/${params.rp}`} className="text-[10px] tracking-[0.3em] text-[#F5F5F3]/30 uppercase hover:text-[#F5F5F3]/60 transition-colors">
          ← {profile.display_name}
        </Link>
        <Link href={`/${params.rp}/book`} className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/20 hover:text-[#F5F5F3]/40 transition-colors">
          Réservation unique →
        </Link>
      </div>

      <div className="max-w-3xl mx-auto text-center mb-12">
        <p className="text-[9px] tracking-[0.5em] text-[#F5F5F3]/20 uppercase mb-4">
          ✦ {profile.display_name} ✦
        </p>
        <h1 className="font-playfair text-4xl md:text-5xl text-[#F5F5F3] mb-4">
          Planificateur
          <span className="italic text-[#F5F5F3]/40"> de voyage</span>
        </h1>
        <p className="text-[#F5F5F3]/30 leading-relaxed text-sm max-w-xl mx-auto">
          Composez votre itinéraire sur-mesure. Nous gérons chaque réservation à votre place.
        </p>
      </div>

      <TripPlanner
        destinations={destOptions}
        establishments={estData}
        rpSlug={params.rp}
      />
    </div>
  )
}
