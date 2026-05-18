import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    const { venue_name, destination, password, slug } = await req.json()

    if (!password) {
      return Response.json({ error: 'Mot de passe manquant.' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('venues_profiles')
      .select('*')
      .eq('password', password)
      .eq('active', true)

    if (slug) {
      // Legacy: login by slug (kept for compatibility)
      query = query.eq('slug', slug.trim().toLowerCase())
    } else if (venue_name && destination) {
      // New: login by venue name (case-insensitive) + destination
      query = query.ilike('venue_name', venue_name.trim()).eq('destination', destination.trim())
    } else {
      return Response.json({ error: 'Identifiants manquants.' }, { status: 400 })
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('[host/login]', error)
    }

    if (!data) {
      return Response.json({ error: 'Identifiants incorrects. Vérifiez le nom, la ville et le mot de passe.' }, { status: 401 })
    }

    return Response.json({
      success: true,
      venueName: data.venue_name,
      slug: data.slug,
      destination: data.destination ?? null,
    })
  } catch (e) {
    console.error('[host/login] exception:', e)
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
