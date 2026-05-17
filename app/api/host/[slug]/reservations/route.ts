import { supabaseAdmin } from '@/lib/supabase-admin'

// Resolve host slug → venue_name, return null if not found or inactive
async function resolveVenueName(slug: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('host_profiles')
    .select('venue_name')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error || !data) return null
  return data.venue_name
}

// GET /api/host/[slug]/reservations
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const venueName = await resolveVenueName(slug)
    if (!venueName) {
      return Response.json({ error: 'Établissement introuvable.' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('establishment', venueName)
      .order('date', { ascending: true })

    if (error) {
      return Response.json({ error: 'Erreur lors du chargement.' }, { status: 500 })
    }

    return Response.json(data ?? [])
  } catch {
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// PATCH /api/host/[slug]/reservations  { id, status }
export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const { id, status } = await req.json()

    if (!id || !status) {
      return Response.json({ error: 'Paramètres manquants.' }, { status: 400 })
    }

    if (!['confirmed', 'declined'].includes(status)) {
      return Response.json({ error: 'Statut invalide.' }, { status: 400 })
    }

    // Security: verify the host owns this reservation's establishment
    const venueName = await resolveVenueName(slug)
    if (!venueName) {
      return Response.json({ error: 'Non autorisé.' }, { status: 401 })
    }

    // Verify the reservation belongs to this venue
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('id, establishment')
      .eq('id', id)
      .single()

    if (fetchError || !existing || existing.establishment !== venueName) {
      return Response.json({ error: 'Non autorisé.' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('reservations')
      .update({ status })
      .eq('id', id)

    if (error) {
      return Response.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
