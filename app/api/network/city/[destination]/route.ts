import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  req: Request,
  { params }: { params: { destination: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const rpSlug = searchParams.get('rp_slug') || ''
    const { destination } = params

    // RPs active in this destination
    const { data: rps } = await supabaseAdmin
      .from('rp_profiles')
      .select('slug, display_name, tagline, activated_destinations')
      .eq('active', true)
      .contains('activated_destinations', [destination])

    if (!rps || rps.length === 0) return Response.json([])

    // All connection records involving me
    const { data: connections } = await supabaseAdmin
      .from('rp_connections')
      .select('from_slug, to_slug, status')
      .or(`from_slug.eq.${rpSlug},to_slug.eq.${rpSlug}`)

    // Build map: other_slug → status from my perspective
    const connMap: Record<string, 'pending_sent' | 'pending_received' | 'accepted'> = {}
    connections?.forEach(c => {
      if (c.from_slug === rpSlug) {
        connMap[c.to_slug] = c.status === 'accepted' ? 'accepted' : 'pending_sent'
      } else if (c.to_slug === rpSlug) {
        connMap[c.from_slug] = c.status === 'accepted' ? 'accepted' : 'pending_received'
      }
    })

    const result = rps.map(rp => ({
      slug: rp.slug,
      display_name: rp.display_name,
      tagline: rp.tagline || '',
      destinations: (rp.activated_destinations ?? []).slice(0, 5),
      connection_status: rp.slug === rpSlug ? 'self' : (connMap[rp.slug] ?? 'none'),
    }))

    return Response.json(result)
  } catch {
    return Response.json([])
  }
}
