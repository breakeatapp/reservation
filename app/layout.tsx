import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ITINERA — Hospitality Planning Between RPs & Guests',
  description: 'From WhatsApp chaos to structured hospitality management. Private access to the world\'s most requested venues.',
  keywords: 'private access, hospitality planning, concierge network, curated destinations, itinerary',
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
