import { notFound } from 'next/navigation'
import { getRPProfile } from '@/lib/rp'
import RPDashboard from '@/components/RPDashboard'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: { rp: string } }

export const metadata: Metadata = { title: 'RP Dashboard — ITINERA' }

export default async function RPDashboardPage({ params }: Props) {
  const profile = await getRPProfile(params.rp)
  if (!profile) notFound()

  return <RPDashboard profile={profile} />
}
