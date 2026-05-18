import { NextRequest, NextResponse } from 'next/server'
import { sendTripSummaryEmail, sendTripClientConfirmationEmail, sendVenueQuickActionEmail, type TripBooking } from '@/lib/email'
import { getRPProfile } from '@/lib/rp'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { establishments } from '@/lib/data'
import { generateActionToken } from '@/lib/action-token'

const supabase = supabaseAdmin

type RawBooking = {
  establishment: string
  date: string
  time: string
  guests: string | number
  occasion?: string
  seating?: string
  specialRequests?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { firstName, lastName, email, phone, bookings, rpSlug } = body

    if (!firstName || !lastName || !email || !phone || !Array.isArray(bookings) || bookings.length === 0) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    // Résoudre le profil RP (pour les emails)
    const rpProfile = rpSlug ? await getRPProfile(rpSlug) : null
    const rpDisplayName = rpProfile?.display_name
    const rpEmail = rpProfile?.email
    const rpWhatsapp = rpProfile?.whatsapp

    // Construire un index des venues personnalisées du RP (slug destination → name)
    const rpCustomVenueDestMap: Record<string, string> = {}
    if (rpProfile?.activated_venues) {
      const { parseVenueEntry } = await import('@/lib/venue-utils')
      for (const raw of rpProfile.activated_venues) {
        const vc = parseVenueEntry(raw)
        if (vc.destination) rpCustomVenueDestMap[vc.name] = vc.destination
      }
    }

    // Enrichir chaque réservation avec les infos de l'établissement
    const enrichedBookings: TripBooking[] = (bookings as RawBooking[]).map(b => {
      const est = establishments.find(e => e.name === b.establishment)
      let destination = est
        ? est.destination.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : ''

      // Fallback : venue personnalisée → chercher la destination dans la config RP
      if (!destination && rpCustomVenueDestMap[b.establishment]) {
        const destSlug = rpCustomVenueDestMap[b.establishment]
        destination = destSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      }

      const formattedDate = new Date(b.date).toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })

      return {
        establishment: b.establishment,
        destination,
        date: formattedDate,
        time: b.time,
        guests: parseInt(String(b.guests)),
        occasion: b.occasion,
        seating: b.seating,
        specialRequests: b.specialRequests,
        establishmentEmail: est?.email || '',
        establishmentPhone: est?.phone || '',
      }
    })

    // Sauvegarder toutes les réservations dans Supabase (non-bloquant)
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('VOTRE')) {
        const rows = enrichedBookings.map(b => ({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          establishment: b.establishment,
          destination: b.destination,
          date: b.date,
          time: b.time,
          guests: b.guests,
          occasion: b.occasion || '',
          seating: b.seating || '',
          vip_level: '',
          budget_level: '',
          special_requests: b.specialRequests || '',
          status: 'pending',
          establishment_phone: b.establishmentPhone,
          establishment_email: b.establishmentEmail,
          rp_slug: rpSlug || '',
        }))

        const { data: insertedRows, error: sbError } = await supabase
          .from('reservations')
          .insert(rows)
          .select('id, establishment')
        if (sbError) {
          console.error('Supabase trip insert error:', sbError.message)
        } else if (insertedRows && insertedRows.length > 0) {
          // Notify each venue with quick-action links
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://itinera.click'
          for (const row of insertedRows) {
            try {
              const { data: vp } = await supabase
                .from('venues_profiles')
                .select('email')
                .ilike('venue_name', row.establishment)
                .eq('active', true)
                .maybeSingle()
              if (vp?.email) {
                const eb = enrichedBookings.find(b => b.establishment === row.establishment)
                if (eb) {
                  const confirmToken = generateActionToken(row.id, 'confirmed')
                  const declineToken = generateActionToken(row.id, 'declined')
                  await sendVenueQuickActionEmail({
                    firstName,
                    lastName,
                    email,
                    phone,
                    date: eb.date,
                    time: eb.time,
                    guests: eb.guests,
                    occasion: eb.occasion,
                    specialRequests: eb.specialRequests,
                    establishment: eb.establishment,
                    destination: eb.destination,
                    venueEmail: vp.email,
                    confirmUrl: `${baseUrl}/api/host/quick-action?id=${row.id}&action=confirmed&token=${confirmToken}`,
                    declineUrl: `${baseUrl}/api/host/quick-action?id=${row.id}&action=declined&token=${declineToken}`,
                    rpDisplayName,
                  })
                }
              }
            } catch (ve) {
              console.error('Venue quick-action email (trip, non-bloquant):', ve)
            }
          }
        }
      }
    } catch (sbErr) {
      console.error('Supabase non-bloquant:', sbErr)
    }

    // Envoyer UN SEUL email récapitulatif au RP
    await sendTripSummaryEmail({
      firstName,
      lastName,
      email,
      phone,
      bookings: enrichedBookings,
      rpDisplayName,
      rpEmail,        // ← email du concierge destinataire
    })

    // Envoyer l'email de confirmation au client (non-bloquant)
    try {
      await sendTripClientConfirmationEmail({
        firstName,
        lastName,
        email,
        phone,
        bookings: enrichedBookings,
        rpDisplayName,
        rpEmail,      // ← pour reply-to
        rpWhatsapp,   // ← bouton WhatsApp dans l'email client
      })
    } catch (clientErr) {
      console.error('Client trip confirmation email error:', clientErr)
    }

    return NextResponse.json({ success: true, count: enrichedBookings.length })
  } catch (error) {
    console.error('Trip API error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
