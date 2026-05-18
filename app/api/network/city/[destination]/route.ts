import { supabaseAdmin } from '@/lib/supabase-admin'

function parseDestSlug(raw: string): string {
  try {
    const p = JSON.parse(raw)
    if (p && typeof p === 'object' && p.slug) return p.slug
  } catch { /* pas du JSON */ }
  return raw
}

export async function GET(
  req: Request,
  { params }: { params: { destination: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const rpSlug = searchParams.get('rp_slug') || ''
    const { destination } = params

    // RPs active in this destination — on fetch tout et on filtre côté serveur
    // car les entrées JSON dans activated_destinations ne matchent pas .contains()
    const { data: allRps } = await supabaseAdmin
      .from('rp_profiles')
      .select('slug, display_name, tagline, activated_destinations')
      .eq('active', true)

    const rps = (allRps ?? []).filter(rp =>
      (rp.activated_destinations ?? []).some(
        (raw: string) => parseDestSlug(raw) === destination
      )
    )

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
      destinations: (rp.activated_destinations ?? [])
        .map((raw: string) => parseDestSlug(raw))
        .slice(0, 5),
      connection_status: rp.slug === rpSlug ? 'self' : (connMap[rp.slug] ?? 'none'),
    }))

    return Response.json(result)
  } catch {
    return Response.json([])
  }
}
