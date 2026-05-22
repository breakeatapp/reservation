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

    // Pour chaque venue, compter les réservations
    const venuesWithStats = await Promise.all(
      (venues ?? []).map(async (venue) => {
        const { count } = await supabaseAdmin
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .ilike('establishment', venue.venue_name)

        return { ...venue, reservation_count: count ?? 0 }
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

    return Response.json({ success: true, slug: venueSlug, venue_name: capitalizeName(venue_name), destination: destination.trim() })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
