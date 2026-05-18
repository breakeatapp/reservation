import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyActionToken } from '@/lib/action-token'
import { sendVenueStatusToClient, sendVenueStatusToRP } from '@/lib/email'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://itinera.click'

function redirect(path: string) {
  return NextResponse.redirect(`${SITE_URL}${path}`)
}

// GET /api/host/quick-action?id=RESA_ID&action=confirmed&token=TOKEN
// Conservé pour rétro-compatibilité avec d'éventuels anciens liens.
// Les nouveaux liens passent par /host/confirm/[id] (page interactive).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id     = searchParams.get('id')
  const action = searchParams.get('action')
  const token  = searchParams.get('token')

  if (!id || !action || !token) {
    return redirect('/host/action-result?error=missing')
  }

  if (!['confirmed', 'declined'].includes(action)) {
    return redirect('/host/action-result?error=invalid')
  }

  if (!verifyActionToken(id, action, token)) {
    return redirect('/host/action-result?error=unauthorized')
  }

  // Fetch reservation
  const { data: resa, error: fetchError } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !resa) {
    // Réservation introuvable — rediriger vers la page de gestion si possible
    return redirect(`/host/confirm/${id}`)
  }

  // Already processed?
  if (resa.status !== 'pending') {
    return redirect(
      `/host/action-result?status=${resa.status}&already=true` +
      `&establishment=${encodeURIComponent(resa.establishment)}` +
      `&guest=${encodeURIComponent(`${resa.first_name} ${resa.last_name}`)}`
    )
  }

  // Update status
  const { error: updateError } = await supabaseAdmin
    .from('reservations')
    .update({ status: action })
    .eq('id', id)

  if (updateError) {
    console.error('[quick-action] update error:', updateError)
    return redirect('/host/action-result?error=update')
  }

  // Send emails
  try {
    let rpEmail: string | undefined
    let rpDisplayName: string | undefined
    let rpWhatsapp: string | undefined

    if (resa.rp_slug) {
      const { data: rp } = await supabaseAdmin
        .from('rp_profiles')
        .select('email, display_name, whatsapp')
        .eq('slug', resa.rp_slug)
        .single()
      rpEmail = rp?.email
      rpDisplayName = rp?.display_name
      rpWhatsapp = rp?.whatsapp
    }

    let venueName = resa.establishment
    const { data: vp } = await supabaseAdmin
      .from('venues_profiles')
      .select('venue_name')
      .ilike('venue_name', resa.establishment)
      .eq('active', true)
      .maybeSingle()
    if (vp?.venue_name) venueName = vp.venue_name

    const emailData = {
      firstName:       resa.first_name,
      lastName:        resa.last_name,
      email:           resa.email,
      phone:           resa.phone,
      establishment:   resa.establishment,
      destination:     resa.destination,
      date:            resa.date,
      time:            resa.time,
      guests:          resa.guests,
      occasion:        resa.occasion,
      specialRequests: resa.special_requests,
      status:          action as 'confirmed' | 'declined',
      venueName,
      rpEmail,
      rpDisplayName,
      rpWhatsapp,
    }

    const [clientResult, rpResult] = await Promise.allSettled([
      sendVenueStatusToClient(emailData),
      sendVenueStatusToRP(emailData),
    ])
    if (clientResult.status === 'rejected') console.error('[quick-action] client email failed:', clientResult.reason)
    if (rpResult.status === 'rejected') console.error('[quick-action] rp email failed:', rpResult.reason)
  } catch (e) {
    console.error('[quick-action] email error (non-bloquant):', e)
  }

  return redirect(
    `/host/action-result?status=${action}` +
    `&establishment=${encodeURIComponent(resa.establishment)}` +
    `&guest=${encodeURIComponent(`${resa.first_name} ${resa.last_name}`)}`
  )
}
