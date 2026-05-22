import { supabaseAdmin } from '@/lib/supabase-admin'

function generateVenueSlug(venueName: string, destination: string): string {
  const nameSlug = venueName
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${nameSlug}-${destination}`
}

function capitalizeName(name: string): string {
  return name.trim().replace(/\b\w/g, l => l.toUpperCase())
}

// GET /api/group/[slug]/venues — liste les venues du groupe
export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Vérifier que le groupe existe
    const { data: group } = await supabaseAdmin
      .from('hospitality_groups')
      .select('id, group_name')
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle()

    if (!group) return Response.json({ error: 'Groupe introuvable.' }, { status: 404 })

    // Récupérer les venues du groupe
    const { data: venues, error } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug, venue_name, destination, email, category, active, created_at')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Pour chaque venue, compter les réservations via venue_slug (priorité) ou establishment (fallback)
    const venuesWithStats = await Promise.all(
      (venues ?? []).map(async (venue) => {
        const { count: countBySlug } = await supabaseAdmin
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .eq('venue_slug', venue.slug)

        const { count: countByName } = await supabaseAdmin
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .ilike('establishment', venue.venue_name)
          .is('venue_slug', null)

        return { ...venue, reservation_count: (countBySlug ?? 0) + (countByName ?? 0) }
      })
    )

    return Response.json({ group_name: group.group_name, venues: venuesWithStats })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/group/[slug]/venues — créer un venue pour le groupe
export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const { venue_name, destination, password, email, category } = await req.json()

    if (!venue_name?.trim() || !destination?.trim() || !password?.trim()) {
      return Response.json({ error: 'Nom, ville et mot de passe sont requis.' }, { status: 400 })
    }
    if (password.length < 6) {
      return Response.json({ error: 'Le mot de passe doit faire au moins 6 caractères.' }, { status: 400 })
    }
    if (!email?.trim()) {
      return Response.json({ error: 'Un email de contact est requis pour cet établissement.' }, { status: 400 })
    }

    // Récupérer l'ID du groupe
    const { data: group } = await supabaseAdmin
      .from('hospitality_groups')
      .select('id')
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle()

    if (!group) return Response.json({ error: 'Groupe introuvable.' }, { status: 404 })

    // Vérifier doublon venue+destination
    const { data: existing } = await supabaseAdmin
      .from('venues_profiles')
      .select('id')
      .ilike('venue_name', venue_name.trim())
      .ilike('destination', destination.trim())
      .maybeSingle()

    if (existing) {
      return Response.json({ error: 'Un compte existe déjà pour cet établissement dans cette ville.' }, { status: 409 })
    }

    // Générer slug unique
    let venueSlug = generateVenueSlug(venue_name.trim(), destination.trim())
    const { data: slugCheck } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug')
      .eq('slug', venueSlug)
      .maybeSingle()
    if (slugCheck) venueSlug = `${venueSlug}-${Date.now().toString(36)}`

    const { error } = await supabaseAdmin
      .from('venues_profiles')
      .insert({
        slug: venueSlug,
        venue_name: capitalizeName(venue_name),
        destination: destination.trim(),
        password,
        email: email?.trim() || null,
        category: category?.trim() || null,
        group_id: group.id,
        active: true,
      })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Auto-connecter les RPs déjà partenaires du groupe au nouveau venue
    const { data: groupRps } = await supabaseAdmin
      .from('group_rp_connections')
      .select('rp_slug, rp_display_name')
      .eq('group_id', group.id)

    if (groupRps && groupRps.length > 0) {
      const venueName = capitalizeName(venue_name)
      await Promise.all(groupRps.map(async (conn) => {
        const { data: alreadyLinked } = await supabaseAdmin
          .from('venue_rp_connections')
          .select('venue_slug')
          .eq('venue_slug', venueSlug)
          .eq('rp_slug', conn.rp_slug)
          .maybeSingle()
        if (!alreadyLinked) {
          await supabaseAdmin.from('venue_rp_connections').insert({
            venue_slug: venueSlug,
            rp_slug: conn.rp_slug,
            venue_name: venueName,
            rp_display_name: conn.rp_display_name,
          })
        }
      }))
    }

    return Response.json({ success: true, slug: venueSlug, venue_name: capitalizeName(venue_name), destination: destination.trim() })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
