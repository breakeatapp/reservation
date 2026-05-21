import { supabaseAdmin } from '@/lib/supabase-admin'

const TRUST_THRESHOLD = 20 // fallback : réservations confirmées si is_trusted non défini en base

function parseDestSlug(raw: string): string {
  try {
    const p = JSON.parse(raw)
    if (p && typeof p === 'object' && p.slug) return p.slug
  } catch { /* pas du JSON */ }
  return raw
}

type RPRow = {
  slug: string
  display_name: string
  tagline?: string | null
  activated_destinations: string[] | null
  is_ambassador?: boolean | null
  is_trusted?: boolean | null
}

export async function GET(
  req: Request,
  { params }: { params: { destination: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const rpSlug = searchParams.get('rp_slug') || ''
    const { destination } = params

    // ── RPs actifs dans cette destination ─────────────────────────────────────
    // Tentative avec colonnes optionnelles → fallback sans si erreur
    let allRps: RPRow[] = []
    {
      const { data, error } = await supabaseAdmin
        .from('rp_profiles')
        .select('slug, display_name, tagline, activated_destinations, is_ambassador, is_trusted')
        .eq('active', true)

      if (!error && data) {
        allRps = data as RPRow[]
      } else {
        console.warn('[city API] fallback sans is_ambassador/is_trusted:', error?.message)
        const { data: basic } = await supabaseAdmin
          .from('rp_profiles')
          .select('slug, display_name, tagline, activated_destinations')
          .eq('active', true)
        allRps = (basic ?? []).map(r => ({
          slug: (r as RPRow).slug,
          display_name: (r as RPRow).display_name,
          tagline: (r as RPRow).tagline,
          activated_destinations: (r as RPRow).activated_destinations,
          is_ambassador: false,
          is_trusted: null,
        }))
      }
    }

    const rps = allRps.filter(rp =>
      (rp.activated_destinations ?? []).some(
        (raw: string) => parseDestSlug(raw) === destination
      )
    )

    if (rps.length === 0) return Response.json([])

    // ── Connexions RP-to-RP impliquant moi ───────────────────────────────────
    const connMap: Record<string, 'pending_sent' | 'pending_received' | 'accepted'> = {}
    if (rpSlug) {
      const { data: connections } = await supabaseAdmin
        .from('rp_connections')
        .select('from_slug, to_slug, status')
        .or(`from_slug.eq.${rpSlug},to_slug.eq.${rpSlug}`)

      connections?.forEach(c => {
        if (c.from_slug === rpSlug) {
          connMap[c.to_slug] = c.status === 'accepted' ? 'accepted' : 'pending_sent'
        } else if (c.to_slug === rpSlug) {
          connMap[c.from_slug] = c.status === 'accepted' ? 'accepted' : 'pending_received'
        }
      })
    }

    // ── Comptage des réservations confirmées par RP (pastille Trust) ──────────
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
