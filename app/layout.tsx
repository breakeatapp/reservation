import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Conciergerie Privée — Réservations d\'Exception',
  description: 'Réservez les meilleures tables et clubs des destinations les plus exclusives au monde. Saint-Tropez, Dubai, Monaco, Miami, Cannes, Courchevel, Saint-Barthélemy.',
  keywords: 'réservation luxe, restaurant VIP, club privé, conciergerie, Saint-Tropez, Dubai, Monaco',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-noir text-cream min-h-screen">
        {children}
      </body>
    </html>
  )
}
