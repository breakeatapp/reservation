import { supabaseAdmin } from '@/lib/supabase-admin'

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

      for (const dest of dests) {
        if (!cityMap[dest]) cityMap[dest] = { count: 0, hasConnection: false }
        cityMap[dest].count++
        if (isConnected) cityMap[dest].hasConnection = true
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
