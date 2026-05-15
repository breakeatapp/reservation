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
      rpSlug,             // identifiant du RP (ex: "remi", "antoine")
      // vipLevel & budgetLevel supprimés côté client — gérés par le RP dans son dashboard
    } = body

    if (!firstName || !lastName || !email || !phone || !establishment || !date || !time || !guests) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const est = establishments.find(e => e.name === establishment)
    const destination = est
      ? est.destination.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : ''

    const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    // Save to Supabase (non-bloquant — n'empêche pas l'email si erreur)
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('VOTRE')) {
        const { error: sbError } = await supabase.from('reservations').insert({
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
          rp_slug: rpSlug || 'remi',  // rattacher au RP
        })
        if (sbError) console.error('Supabase error:', sbError.message)
      }
    } catch (sbErr) {
      console.error('Supabase non-bloquant:', sbErr)
    }

    // Récupérer le profil du RP pour l'email
    let rpEmail: string | undefined
    let rpDisplayName: string | undefined
    let rpWhatsapp: string | undefined
    try {
      const rpProfile = await getRPProfile(rpSlug || 'remi')
      rpEmail = rpProfile?.email
      rpDisplayName = rpProfile?.display_name
      rpWhatsapp = rpProfile?.whatsapp
    } catch { /* non-bloquant */ }

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reservation error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
