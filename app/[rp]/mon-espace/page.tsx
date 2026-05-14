import { notFound } from 'next/navigation'
import { getRPProfile } from '@/lib/rp'
import ClientDashboard from '@/components/ClientDashboard'
import type { Metadata } from 'next'

type Props = { params: { rp: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getRPProfile(params.rp)
  if (!profile) return { title: 'Page introuvable' }
  return { title: `Mon espace — ${profile.display_name}` }
}

export default async function ClientSpacePage({ params }: Props) {
  const profile = await getRPProfile(params.rp)
  if (!profile) notFound()

  return <ClientDashboard profile={profile} />
}
