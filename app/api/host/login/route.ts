import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    const { slug, password } = await req.json()

    if (!slug || !password) {
      return Response.json({ error: 'Identifiants manquants.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('host_profiles')
      .select('*')
      .eq('slug', slug)
      .eq('password', password)
      .eq('active', true)
      .single()

    if (error || !data) {
      return Response.json({ error: 'Identifiants incorrects.' }, { status: 401 })
    }

    return Response.json({
      success: true,
      venueName: data.venue_name,
      slug: data.slug,
      destination: data.destination ?? null,
    })
  } catch {
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
