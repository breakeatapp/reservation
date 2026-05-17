import { supabaseAdmin } from '@/lib/supabase-admin'

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

    // Verify reservation exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return Response.json({ error: 'Réservation introuvable.' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('reservations')
      .update({ status })
      .eq('id', id)

    if (error) {
      return Response.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
    }

    return Response.json({ success: true, status })
  } catch {
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
