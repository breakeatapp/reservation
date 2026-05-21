import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/network/pending?rp_slug=X
// Returns pending incoming connection requests for an RP (other RPs who sent an invite to me)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rpSlug = searchParams.get('rp_slug') || ''

    if (!rpSlug) return Response.json([])

    // Connexions où je suis le destinataire et le statut est encore pending
    const { data: connections } = await supabaseAdmin
      .from('rp_connections')
      .select('from_slug, created_at')
      .eq('to_slug', rpSlug)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (!connections || connections.length === 0) return Response.json([])

    // Récupérer les profils des expéditeurs
    const fromSlugs = connections.map(c => c.from_slug)
    const { data: profiles } = await supabaseAdmin
      .from('rp_profiles')
      .select('slug, display_name, tagline')
      .in('slug', fromSlugs)

    const profileMap: Record<string, { display_name: string; tagline: string }> = {}
    profiles?.forEach(p => {
      profileMap[p.slug] = {
        display_name: p.display_name,
        tagline: p.tagline || '',
      }
    })

    const result = connections.map(c => ({
      from_slug:    c.from_slug,
      display_name: profileMap[c.from_slug]?.display_name ?? c.from_slug,
      tagline:      profileMap[c.from_slug]?.tagline ?? '',
      created_at:   c.created_at,
    }))

    return Response.json(result)
  } catch {
    return Response.json([])
  }
}
