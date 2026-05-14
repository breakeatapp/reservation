import RPRegistration from '@/components/RPRegistration'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rejoindre la plateforme',
  robots: { index: false, follow: false }, // page privée, pas indexée
}

type Props = { params: { code: string } }

export default function JoinPage({ params }: Props) {
  // Le code dans l'URL est pré-rempli, le composant le valide côté API
  return <RPRegistration inviteCode={params.code} />
}
