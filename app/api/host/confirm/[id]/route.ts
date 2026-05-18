import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendVenueStatusToClient, sendVenueStatusToRP } from '@/lib/email'

// GET /api/host/confirm/[id]
// Public — the reservation UUID acts as the token
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select('id, first_name, last_name, establishment, date, time, guests, occasion, special_requests, status')
      .eq('id', id)
      .single()

    if (error || !data) {
      return Response.json({ error: 'Réservation introuvable.' }, { status: 404 })
    }

    return Response.json(data)
  } catch {
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// PATCH /api/host/confirm/[id]  { status: 'confirmed' | 'declined' }
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { status } = await req.json()

    if (!['confirmed', 'declined'].includes(status)) {
      return Response.json({ error: 'Statut invalide.' }, { status: 400 })
    }

    // Fetch full reservation (for email + ownership check)
    const { data: resa, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !resa) {
      return Response.json({ error: 'Réservation introuvable.' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('reservations')
      .update({ status })
      .eq('id', id)

    if (error) {
      return Response.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
    }

    // ── Envoyer les emails de confirmation au guest et au RP ──────
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

      // Nom affiché du venue
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
        status:          status as 'confirmed' | 'declined',
        venueName,
        rpEmail,
        rpDisplayName,
        rpWhatsapp,
      }

      console.log('[confirm/patch] sending emails — client:', resa.email, '| rp:', rpEmail || '(none)')

      const [clientResult, rpResult] = await Promise.allSettled([
        sendVenueStatusToClient(emailData),
        sendVenueStatusToRP(emailData),
      ])
      if (clientResult.status === 'rejected') {
        console.error('[confirm/patch] sendVenueStatusToClient failed:', clientResult.reason)
      }
      if (rpResult.status === 'rejected') {
        console.error('[confirm/patch] sendVenueStatusToRP failed:', rpResult.reason)
      }
    } catch (emailErr) {
      console.error('[confirm/patch] email error (non-bloquant):', emailErr)
    }

    return Response.json({ success: true, status })
  } catch {
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
