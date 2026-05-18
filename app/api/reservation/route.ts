import { NextRequest, NextResponse } from 'next/server'
import { sendReservationEmail, sendClientConfirmationEmail } from '@/lib/email'
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

    try {
      // Tentative avec nationality (colonne optionnelle ajoutée après le schéma initial)
      const { error: sbError } = await supabase.from('reservations').insert({
        ...baseInsert,
        nationality: nationality || '',
      })
      if (sbError) {
        // Si l'erreur est liée à la colonne nationality manquante → réessayer sans
        if (sbError.message?.includes('nationality') || sbError.code === '42703') {
          console.warn('Colonne nationality manquante — insert sans nationality')
          const { error: sbError2 } = await supabase.from('reservations').insert(baseInsert)
          if (sbError2) {
            supabaseError = sbError2.message
            console.error('Supabase insert error (fallback):', sbError2.message, sbError2.details, sbError2.hint)
          }
        } else {
          supabaseError = sbError.message
          console.error('Supabase insert error:', sbError.message, sbError.details, sbError.hint)
        }
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
