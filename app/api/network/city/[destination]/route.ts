import { supabaseAdmin } from '@/lib/supabase-admin'

const TRUST_THRESHOLD = 20 // fallback : réservations confirmées si is_trusted non défini en base

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

    // RPs actifs dans cette destination
    const { data: allRps } = await supabaseAdmin
      .from('rp_profiles')
      .select('slug, display_name, tagline, activated_destinations, is_ambassador, is_trusted')
      .eq('active', true)

    const rps = (allRps ?? []).filter(rp =>
      (rp.activated_destinations ?? []).some(
        (raw: string) => parseDestSlug(raw) === destination
      )
    )

    if (!rps || rps.length === 0) return Response.json([])

    // Connexions RP-to-RP impliquant moi
    const { data: connections } = await supabaseAdmin
      .from('rp_connections')
      .select('from_slug, to_slug, status')
      .or(`from_slug.eq.${rpSlug},to_slug.eq.${rpSlug}`)

    const connMap: Record<string, 'pending_sent' | 'pending_received' | 'accepted'> = {}
    connections?.forEach(c => {
      if (c.from_slug === rpSlug) {
        connMap[c.to_slug] = c.status === 'accepted' ? 'accepted' : 'pending_sent'
      } else if (c.to_slug === rpSlug) {
        connMap[c.from_slug] = c.status === 'accepted' ? 'accepted' : 'pending_received'
      }
    })

    // Comptage des réservations confirmées par RP (pour pastille Trust)
    const rpSlugs = rps.map(r => r.slug)
    const { data: resaRows } = await supabaseAdmin
      .from('reservations')
      .select('rp_slug')
      .in('rp_slug', rpSlugs)
      .eq('status', 'confirmed')

    const resaCount: Record<string, number> = {}
    resaRows?.forEach(r => {
      resaCount[r.rp_slug] = (resaCount[r.rp_slug] ?? 0) + 1
    })

    const result = rps.map(rp => ({
      slug:               rp.slug,
      display_name:       rp.display_name,
      tagline:            rp.tagline || '',
      destinations:       (rp.activated_destinations ?? [])
                            .map((raw: string) => parseDestSlug(raw))
                            .slice(0, 5),
      connection_status:  rp.slug === rpSlug ? 'self' : (connMap[rp.slug] ?? 'none'),
      is_ambassador:      !!rp.is_ambassador,
      // is_trusted : champ manuel en base (priorité) OU seuil réservations confirmées
      is_trusted:         rp.is_trusted != null
                            ? !!rp.is_trusted
                            : (resaCount[rp.slug] ?? 0) >= TRUST_THRESHOLD,
      reservation_count:  resaCount[rp.slug] ?? 0,
    }))

    return Response.json(result)
  } catch {
    return Response.json([])
  }
}
