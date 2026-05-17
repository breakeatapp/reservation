import { supabaseAdmin } from '@/lib/supabase-admin'

type HostProfile = {
  venue_name: string
  destination: string | null
}

// Resolve host slug → { venue_name, destination }, return null if not found or inactive
async function resolveHost(slug: string): Promise<HostProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('host_profiles')
    .select('venue_name, destination')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error || !data) return null
  return data as HostProfile
}

// GET /api/host/[slug]/reservations
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const host = await resolveHost(slug)
    if (!host) {
      return Response.json({ error: 'Établissement introuvable.' }, { status: 401 })
    }

    // Filter by establishment name, and optionally by destination
    let query = supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('establishment', host.venue_name)
      .order('date', { ascending: true })

    if (host.destination) {
      query = query.eq('destination', host.destination)
    }

    const { data, error } = await query

    if (error) {
      return Response.json({ error: 'Erreur lors du chargement.' }, { status: 500 })
    }

    const reservations = data ?? []

    // Enrich with RP display name — batch fetch all unique rp_slugs
    const rpSlugsSet: Record<string, true> = {}
    reservations.forEach((r: { rp_slug: string }) => { if (r.rp_slug) rpSlugsSet[r.rp_slug] = true })
    const rpSlugs = Object.keys(rpSlugsSet)
    let rpNames: Record<string, string> = {}

    if (rpSlugs.length > 0) {
      const { data: rpProfiles } = await supabaseAdmin
        .from('rp_profiles')
        .select('slug, display_name')
        .in('slug', rpSlugs)

      rpProfiles?.forEach((rp: { slug: string; display_name: string }) => {
        rpNames[rp.slug] = rp.display_name || rp.slug
      })
    }

    const enriched = reservations.map((r: Record<string, unknown>) => ({
      ...r,
      rp_name: rpNames[r.rp_slug as string] || r.rp_slug || '',
    }))

    return Response.json(enriched)
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
    const host = await resolveHost(slug)
    if (!host) {
      return Response.json({ error: 'Non autorisé.' }, { status: 401 })
    }

    // Verify the reservation belongs to this venue (+ destination if set)
    let verifyQuery = supabaseAdmin
      .from('reservations')
      .select('id, establishment, destination')
      .eq('id', id)
      .eq('establishment', host.venue_name)

    if (host.destination) {
      verifyQuery = verifyQuery.eq('destination', host.destination)
    }

    const { data: existing, error: fetchError } = await verifyQuery.single()

    if (fetchError || !existing) {
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
