import { notFound } from 'next/navigation'
import { getRPProfile, getRPDestinations, getRPEstablishments } from '@/lib/rp'
import RPHomePage from '@/components/RPHomePage'
import type { Metadata } from 'next'

type Props = { params: { rp: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getRPProfile(params.rp)
  if (!profile) return { title: 'Page introuvable' }
  return {
    title: `${profile.display_name}`,
    description: profile.tagline,
  }
}

export default async function RPPage({ params }: Props) {
  const profile = await getRPProfile(params.rp)
  if (!profile) notFound()

  const rpDestinations = getRPDestinations(profile)
  const rpEstablishments = getRPEstablishments(profile)

  return (
    <RPHomePage
      profile={profile}
      destinations={rpDestinations}
      establishments={rpEstablishments}
    />
  )
}
