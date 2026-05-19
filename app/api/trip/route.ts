import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import {
  sendTripSummaryEmail,
  sendTripClientConfirmationEmail,
  sendVenueQuickActionEmail,
  type TripBooking,
} from '@/lib/email'
import { getRPProfile } from '@/lib/rp'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { establishments } from '@/lib/data'

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

    // ── Profil RP ─────────────────────────────────────────────────
    const rpProfile = rpSlug ? await getRPProfile(rpSlug) : null
    const rpDisplayName = rpProfile?.display_name
    const rpEmail = rpProfile?.email
    const rpWhatsapp = rpProfile?.whatsapp

    // Index destinations des venues custom du RP
    const rpCustomVenueDestMap: Record<string, string> = {}
    if (rpProfile?.activated_venues) {
      const { parseVenueEntry } = await import('@/lib/venue-utils')
      for (const raw of rpProfile.activated_venues) {
        const vc = parseVenueEntry(raw)
        if (vc.destination) rpCustomVenueDestMap[vc.name] = vc.destination
      }
    }

    // ── Fiche client ──────────────────────────────────────────────
    let clientVipTag = ''
    let clientInternalNote = ''
    if (rpSlug && email) {
      try {
        const { data: clientNote } = await supabase
          .from('rp_client_notes')
          .select('vip_tag, internal_note')
          .eq('rp_slug', rpSlug)
          .eq('client_email', email.toLowerCase())
          .single()
        if (clientNote) {
          clientVipTag = clientNote.vip_tag || ''
          clientInternalNote = clientNote.internal_note || ''
        }
      } catch { /* non-bloquant */ }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://itinera.click'
    const enrichedBookings: TripBooking[] = []

    for (const b of bookings as RawBooking[]) {
      const est = establishments.find(e => e.name === b.establishment)
      let destination = est
        ? est.destination.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : ''
      if (!destination && rpCustomVenueDestMap[b.establishment]) {
        destination = rpCustomVenueDestMap[b.establishment]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase())
      }

      const formattedDate = new Date(b.date).toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })

      // ── UUID pré-généré : lien valide car on insert avec cet ID ──
      const bookingId = randomUUID()
      const viewUrl = `${baseUrl}/host/confirm/${bookingId}`

      const booking: TripBooking = {
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
        viewUrl,
      }

      // ── Insert en base — OBLIGATOIRE ──────────────────────────
      const row = {
        id: bookingId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        establishment: booking.establishment,
        destination: booking.destination,
        date: booking.date,
        time: booking.time,
        guests: booking.guests,
        occasion: booking.occasion || '',
        seating: booking.seating || '',
        vip_level: clientVipTag || '',
        budget_level: '',
        special_requests: booking.specialRequests || '',
        status: 'pending',
        establishment_phone: booking.establishmentPhone,
        establishment_email: booking.establishmentEmail,
        rp_slug: rpSlug || '',
      }

      const { error: sbError1 } = await supabase
        .from('reservations')
        .insert({ ...row, nationality: '' })

      if (sbError1) {
        if (sbError1.message?.includes('nationality') || sbError1.code === '42703') {
          const { error: sbError2 } = await supabase
            .from('reservations')
            .insert(row)

          if (sbError2) {
            console.error('[trip] insert échoué (x2):', b.establishment, sbError2.message)
            return NextResponse.json({ error: `Impossible de sauvegarder la réservation pour ${b.establishment}. Veuillez réessayer.` }, { status: 500 })
          }
        } else {
          console.error('[trip] insert échoué:', b.establishment, sbError1.message)
          return NextResponse.json({ error: `Impossible de sauvegarder la réservation pour ${b.establishment}. Veuillez réessayer.` }, { status: 500 })
        }
      }

      console.log('[trip] sauvegardé — établissement:', booking.establishment, '| id:', bookingId)
      enrichedBookings.push(booking)

      // ── Notifier le venue si connexion de confiance ───────────
      if (rpSlug) {
        try {
          const { data: venueProfile } = await supabase
            .from('venues_profiles')
            .select('slug, email, venue_name')
            .ilike('venue_name', booking.establishment)
            .eq('active', true)
            .maybeSingle()

          if (venueProfile) {
            const { data: connection } = await supabase
              .from('venue_rp_connections')
              .select('venue_slug')
              .eq('venue_slug', venueProfile.slug)
              .eq('rp_slug', rpSlug)
              .maybeSingle()

            if (connection) {
              await supabase
                .from('reservations')
                .update({ venue_slug: venueProfile.slug })
                .eq('id', bookingId)

              if (venueProfile.email && venueProfile.email.toLowerCase() !== (rpEmail || '').toLowerCase()) {
                await sendVenueQuickActionEmail({
                  firstName, lastName, email, phone,
                  date: booking.date, time: booking.time, guests: booking.guests,
                  occasion: booking.occasion,
                  specialRequests: booking.specialRequests,
                  establishment: booking.establishment,
                  destination: booking.destination,
                  venueEmail: venueProfile.email,
                  viewUrl,
                  rpDisplayName,
                  vipTag: clientVipTag || undefined,
                  internalNote: clientInternalNote || undefined,
                })
              }
            }
          }
        } catch (venueErr) {
          console.error('[trip] venue notification error (non-bloquant):', venueErr)
        }
      }
    }

    // ── UN seul email au RP avec toutes les réservations ─────────
    await sendTripSummaryEmail({
      firstName, lastName, email, phone,
      bookings: enrichedBookings,
      rpDisplayName,
      rpEmail,
      vipTag: clientVipTag || undefined,
      internalNote: clientInternalNote || undefined,
    })

    // ── Email récapitulatif au client ─────────────────────────────
    try {
      await sendTripClientConfirmationEmail({
        firstName, lastName, email, phone,
        bookings: enrichedBookings,
        rpDisplayName,
        rpEmail,
        rpWhatsapp,
      })
    } catch (clientErr) {
      console.error('[trip] client confirmation email error:', clientErr)
    }

    return NextResponse.json({ success: true, count: enrichedBookings.length })
  } catch (error) {
    console.error('Trip API error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
