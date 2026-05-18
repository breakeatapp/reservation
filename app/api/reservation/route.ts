import { NextRequest, NextResponse } from 'next/server'
import { sendReservationEmail, sendClientConfirmationEmail, sendVenueQuickActionEmail } from '@/lib/email'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { establishments } from '@/lib/data'
import { getRPProfile } from '@/lib/rp'
import { generateActionToken } from '@/lib/action-token'

const supabase = supabaseAdmin

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      firstName, lastName, email, phone,
      establishment, date, time, guests,
      occasion, seating, specialRequests,
      nationality,
      rpSlug,             // identifiant du RP (ex: "remi", "antoine")
      destination: bodyDestination, // passé par le formulaire pour les venues custom
      // vipLevel & budgetLevel supprimés côté client — gérés par le RP dans son dashboard
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

    // Save to Supabase (non-bloquant — n'empêche pas l'email si erreur)
    let supabaseError: string | null = null

    const baseInsert = {
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
      vip_level: '',      // défini par le RP dans son dashboard
      budget_level: '',   // défini par le RP dans son dashboard
      special_requests: specialRequests || '',
      status: 'pending',
      establishment_phone: est?.phone || '',
      establishment_email: est?.email || '',
      rp_slug: rpSlug || '',  // rattacher au RP
    }

    let insertedId: string | null = null

    try {
      // Tentative avec nationality (colonne optionnelle ajoutée après le schéma initial)
      const { data: ins, error: sbError } = await supabase
        .from('reservations')
        .insert({ ...baseInsert, nationality: nationality || '' })
        .select('id')
        .single()

      if (sbError) {
        // Si l'erreur est liée à la colonne nationality manquante → réessayer sans
        if (sbError.message?.includes('nationality') || sbError.code === '42703') {
          console.warn('Colonne nationality manquante — insert sans nationality')
          const { data: ins2, error: sbError2 } = await supabase
            .from('reservations')
            .insert(baseInsert)
            .select('id')
            .single()
          if (sbError2) {
            supabaseError = sbError2.message
            console.error('Supabase insert error (fallback):', sbError2.message, sbError2.details, sbError2.hint)
          } else {
            insertedId = ins2?.id || null
          }
        } else {
          supabaseError = sbError.message
          console.error('Supabase insert error:', sbError.message, sbError.details, sbError.hint)
        }
      } else {
        insertedId = ins?.id || null
      }
    } catch (sbErr) {
      supabaseError = String(sbErr)
      console.error('Supabase exception:', sbErr)
    }

    // Récupérer le profil du RP pour l'email
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

    // Récupérer la fiche client (VIP tag + note interne) pour enrichir l'email RP
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

    // Send email notification to RP
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
    })

    // Send client confirmation email (non-blocking)
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
      console.error('Client confirmation email error (non-bloquant):', clientEmailErr)
    }

    // ── Notifier le venue avec liens confirm/décline rapides ──
    if (insertedId) {
      try {
        const { data: venueProfile } = await supabase
          .from('venues_profiles')
          .select('email, venue_name')
          .ilike('venue_name', establishment)
          .eq('active', true)
          .maybeSingle()

        // Ne pas envoyer à la venue si c'est le même email que le RP (évite les doublons)
        if (venueProfile?.email && venueProfile.email.toLowerCase() !== (rpEmail || '').toLowerCase()) {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://itinera.click'
          const confirmToken = generateActionToken(insertedId, 'confirmed')
          const declineToken = generateActionToken(insertedId, 'declined')

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
            confirmUrl: `${baseUrl}/api/host/quick-action?id=${insertedId}&action=confirmed&token=${confirmToken}`,
            declineUrl: `${baseUrl}/api/host/quick-action?id=${insertedId}&action=declined&token=${declineToken}`,
            rpDisplayName,
            vipTag: clientVipTag || undefined,
            internalNote: clientInternalNote || undefined,
          })
        }
      } catch (venueErr) {
        console.error('Venue quick-action email error (non-bloquant):', venueErr)
      }
    }

    return NextResponse.json({
      success: true,
      saved: !supabaseError,
      ...(supabaseError ? { supabaseError } : {}),
    })
  } catch (error) {
    console.error('Reservation error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
