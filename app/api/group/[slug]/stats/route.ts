import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/group/[slug]/stats
// Pour chaque RP partenaire du groupe → nb de resas par venue du groupe
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // 1. Récupérer le groupe
    const { data: group } = await supabaseAdmin
      .from('hospitality_groups')
      .select('id, group_name')
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle()

    if (!group) return Response.json({ error: 'Groupe introuvable.' }, { status: 404 })

    // 2. Récupérer les venues du groupe
    const { data: venues } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug, venue_name, destination')
      .eq('group_id', group.id)
      .eq('active', true)
      .order('venue_name', { ascending: true })

    if (!venues || venues.length === 0) {
      return Response.json({ stats: [] })
    }

    const venueSlugs = venues.map(v => v.slug)

    // 3. Récupérer les RPs partenaires du groupe
    const { data: partners } = await supabaseAdmin
      .from('group_rp_connections')
      .select('rp_slug, rp_display_name, connected_at')
      .eq('group_id', group.id)
      .order('connected_at', { ascending: true })

    if (!partners || partners.length === 0) {
      return Response.json({ stats: [], venues })
    }

    // 4. Pour chaque RP → compter les resas par venue
    const stats = await Promise.all(
      partners.map(async (rp) => {
        const venueStats = await Promise.all(
          venues.map(async (venue) => {
            const { data: resas } = await supabaseAdmin
              .from('reservations')
              .select('status, guests')
              .eq('rp_slug', rp.rp_slug)
              .eq('venue_slug', venue.slug)

            const list = resas ?? []
            const total = list.length
            const confirmed = list.filter(r => r.status === 'confirmed').length
            const pending = list.filter(r => r.status === 'pending').length
            const declined = list.filter(r => r.status === 'declined').length
            const guests = list.reduce((acc, r) => acc + (r.guests ?? 0), 0)

            return {
              venue_slug: venue.slug,
              venue_name: venue.venue_name,
              destination: venue.destination,
              total,
              confirmed,
              pending,
              declined,
              guests,
            }
          })
        )

        const totalAll = venueStats.reduce((acc, v) => acc + v.total, 0)
        const confirmedAll = venueStats.reduce((acc, v) => acc + v.confirmed, 0)
        const guestsAll = venueStats.reduce((acc, v) => acc + v.guests, 0)

        return {
          rp_slug: rp.rp_slug,
          rp_name: rp.rp_display_name || rp.rp_slug,
          connected_at: rp.connected_at,
          total: totalAll,
          confirmed: confirmedAll,
          guests: guestsAll,
          venues: venueStats,
        }
      })
    )

    // Trier par nombre de resas décroissant
    stats.sort((a, b) => b.total - a.total)

    return Response.json({ stats, venues })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
