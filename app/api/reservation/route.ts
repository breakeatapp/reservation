import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { sendReservationEmail, sendClientConfirmationEmail, sendVenueQuickActionEmail } from '@/lib/email'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { establishments } from '@/lib/data'
import { getRPProfile } from '@/lib/rp'

const supabase = supabaseAdmin

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      firstName, lastName, email, phone,
      establishment, date, time, guests,
      occasion, seating, specialRequests,
      nationality,
      rpSlug,
      destination: bodyDestination,
    } = body

    if (!firstName || !lastName || !email || !phone || !establishment || !date || !time || !guests) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const est = establishments.find(e => e.name === establishment)
    const destination = est
      ? est.destination.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : (bodyDestination || '')

    const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    // ── 1. Générer l'UUID avant l'insert ──────────────────────────
    const reservationId = randomUUID()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://itinera.click'

    // Lien vers la page interactive confirm/décline — toujours valide car lié à l'ID en base
    const viewUrl = `${baseUrl}/host/confirm/${reservationId}`

    // ── 2. Sauvegarder en base — OBLIGATOIRE avant tout email ────
    const baseInsert = {
      id: reservationId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      establishment,
      destination,
      date: formattedDate,
      time,
      guests: parseInt(guests),
      occasion: occasion || '',
      seating: seating || '',
      vip_level: '',
      budget_level: '',
      special_requests: specialRequests || '',
      status: 'pending',
      establishment_phone: est?.phone || '',
      establishment_email: est?.email || '',
      rp_slug: rpSlug || '',
    }

    // Tentative 1 : avec nationality
    const { error: sbError1 } = await supabase
      .from('reservations')
      .insert({ ...baseInsert, nationality: nationality || '' })

    if (sbError1) {
      if (sbError1.message?.includes('nationality') || sbError1.code === '42703') {
        // Tentative 2 : sans nationality (colonne absente du schéma)
        const { error: sbError2 } = await supabase
          .from('reservations')
          .insert(baseInsert)

        if (sbError2) {
          console.error('[reservation] insert échoué (x2):', sbError2.message, sbError2.details)
          return NextResponse.json({ error: 'Impossible de sauvegarder la réservation. Veuillez réessayer.' }, { status: 500 })
        }
      } else {
        console.error('[reservation] insert échoué:', sbError1.message, sbError1.details)
        return NextResponse.json({ error: 'Impossible de sauvegarder la réservation. Veuillez réessayer.' }, { status: 500 })
      }
    }

    console.log('[reservation] sauvegardé — id:', reservationId)

    // ── 3. Profil RP ──────────────────────────────────────────────
    let rpEmail: string | undefined
    let rpDisplayName: string | undefined
    let rpWhatsapp: string | undefined
    let rpNotificationPref: 'email' | 'whatsapp' | 'both' | undefined
    try {
      const rpProfile = rpSlug ? await getRPProfile(rpSlug) : null
      rpEmail = rpProfile?.email
      rpDisplayName = rpProfile?.display_name
      rpWhatsapp = rpProfile?.whatsapp
      rpNotificationPref = rpProfile?.notification_pref
    } catch { /* non-bloquant */ }

    // ── 4. Fiche client (VIP + note) ─────────────────────────────
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

    // ── 5. Email au RP (avec lien vers la page de gestion) ───────
    await sendReservationEmail({
      firstName, lastName, email, phone,
      date: formattedDate,
      time,
      guests: parseInt(guests),
      occasion,
      seating,
      specialRequests,
      establishment,
      destination,
      establishmentEmail: est?.email || '',
      establishmentPhone: est?.phone || '',
      rpEmail,
      rpDisplayName,
      rpWhatsapp,
      rpNotificationPref,
      vipLevel: clientVipTag || undefined,
      internalNote: clientInternalNote || undefined,
      viewUrl,   // lien vers /host/confirm/[id] — page interactive
    })

    // ── 6. Email de confirmation au client (non-bloquant) ────────
    try {
      await sendClientConfirmationEmail({
        firstName, lastName, email, phone,
        date: formattedDate,
        time,
        guests: parseInt(guests),
        occasion,
        seating,
        specialRequests,
        establishment,
        destination,
        establishmentEmail: est?.email || '',
        establishmentPhone: est?.phone || '',
        rpEmail,
        rpDisplayName,
        rpWhatsapp,
      })
    } catch (clientEmailErr) {
      console.error('[reservation] client email error (non-bloquant):', clientEmailErr)
    }

    // ── 7. Notifier le venue si connexion de confiance ────────────
    if (rpSlug) {
      try {
        const { data: venueProfile } = await supabase
          .from('venues_profiles')
          .select('slug, email, venue_name')
          .ilike('venue_name', establishment)
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
            // Rattacher le venue à la réservation
            await supabase
              .from('reservations')
              .update({ venue_slug: venueProfile.slug })
              .eq('id', reservationId)

            // Notifier le venue si email différent du RP
            if (venueProfile.email && venueProfile.email.toLowerCase() !== (rpEmail || '').toLowerCase()) {
              await sendVenueQuickActionEmail({
                firstName, lastName, email, phone,
                date: formattedDate,
                time,
                guests: parseInt(guests),
                occasion,
                specialRequests,
                establishment,
                destination,
                venueEmail: venueProfile.email,
                viewUrl,   // même page pour le venue
                rpDisplayName,
                vipTag: clientVipTag || undefined,
                internalNote: clientInternalNote || undefined,
              })
              console.log(`[reservation] venue notifié — rp: ${rpSlug}, venue: ${venueProfile.slug}`)
            }
          }
        }
      } catch (venueErr) {
        console.error('[reservation] venue notification error (non-bloquant):', venueErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reservation error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
