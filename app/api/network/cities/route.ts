import { supabaseAdmin } from '@/lib/supabase-admin'

// Parse a destination entry — peut être un slug brut "saint-tropez"
// ou un JSON custom {"slug":"...", "name":"...", "country":"..."}
function parseDestSlug(raw: string): string {
  try {
    const p = JSON.parse(raw)
    if (p && typeof p === 'object' && p.slug) return p.slug
  } catch { /* pas du JSON */ }
  return raw
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rpSlug = searchParams.get('rp_slug') || ''

    // All active RP profiles
    const { data: rps } = await supabaseAdmin
      .from('rp_profiles')
      .select('slug, activated_destinations')
      .eq('active', true)

    if (!rps) return Response.json([])

    // My accepted connections
    const { data: connections } = await supabaseAdmin
      .from('rp_connections')
      .select('from_slug, to_slug')
      .or(`from_slug.eq.${rpSlug},to_slug.eq.${rpSlug}`)
      .eq('status', 'accepted')

    const connectedSlugs: Record<string, true> = {}
    connections?.forEach(c => {
      if (c.from_slug === rpSlug) connectedSlugs[c.to_slug] = true
      else connectedSlugs[c.from_slug] = true
    })

    // Aggregate per city
    const cityMap: Record<string, { count: number; hasConnection: boolean }> = {}

    for (const rp of rps) {
      if (rp.slug === rpSlug) continue
      const dests: string[] = rp.activated_destinations ?? []
      const isConnected = !!connectedSlugs[rp.slug]

      for (const raw of dests) {
        const slug = parseDestSlug(raw)
        if (!cityMap[slug]) cityMap[slug] = { count: 0, hasConnection: false }
        cityMap[slug].count++
        if (isConnected) cityMap[slug].hasConnection = true
      }
    }

    const result = Object.entries(cityMap).map(([slug, d]) => ({
      slug,
      count: d.count,
      hasConnection: d.hasConnection,
    }))

    return Response.json(result)
  } catch {
    return Response.json([])
  }
}
