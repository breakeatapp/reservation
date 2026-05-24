import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// ── Convertit un slug JSON ou brut en slug plain ──────────────────────────────
function parseDestSlug(raw: string): string {
  try {
    const p = JSON.parse(raw)
    if (p && typeof p === 'object' && p.slug) return p.slug
  } catch { /* not JSON */ }
  return raw.trim()
}

// ── Normalise un nom affiché → slug (ex: "Saint-Tropez" → "saint-tropez") ─────
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

type RPRow = {
  slug: string
  activated_destinations: string[] | null
  is_ambassador?: boolean | null
  is_trusted?: boolean | null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rpSlug = searchParams.get('rp_slug') || ''

    // ── 1. Tous les profils RP actifs ─────────────────────────────────────────
    // Tentative avec colonnes optionnelles is_ambassador / is_trusted.
    // Si ces colonnes n'existent pas encore en base, on fait une 2e requête
    // sans elles plutôt que de retourner [] prématurément.
    let allRps: RPRow[] = []
    {
      const { data, error } = await supabaseAdmin
        .from('rp_profiles')
        .select('slug, activated_destinations, is_ambassador, is_trusted')
        .eq('active', true)

      if (!error && data) {
        allRps = data as RPRow[]
      } else {
        // Colonnes optionnelles absentes → requête basique sans elles
        console.warn('[cities API] fallback sans is_ambassador/is_trusted:', error?.message)
        const { data: basic } = await supabaseAdmin
          .from('rp_profiles')
          .select('slug, activated_destinations')
          .eq('active', true)
        allRps = (basic ?? []).map(r => ({
          slug: (r as { slug: string }).slug,
          activated_destinations: (r as { activated_destinations: string[] | null }).activated_destinations,
          is_ambassador: false,
          is_trusted: false,
        }))
      }
    }

    // ── 2. Historique de réservations → destinations auto-détectées ───────────
    const { data: resas } = await supabaseAdmin
      .from('reservations')
      .select('rp_slug, destination')
      .not('rp_slug', 'is', null)
      .not('destination', 'is', null)
      .neq('destination', '')

    const rpResaDests: Record<string, Set<string>> = {}
    for (const r of resas ?? []) {
      if (!r.rp_slug || !r.destination) continue
      const slug = normalizeName(String(r.destination))
      if (!slug) continue
      if (!rpResaDests[r.rp_slug]) rpResaDests[r.rp_slug] = new Set()
      rpResaDests[r.rp_slug].add(slug)
    }

    // ── 3. Connexions acceptées du RP courant ─────────────────────────────────
    const connectedSlugs: Record<string, true> = {}
    if (rpSlug) {
      const { data: connections } = await supabaseAdmin
        .from('rp_connections')
        .select('from_slug, to_slug')
        .or(`from_slug.eq.${rpSlug},to_slug.eq.${rpSlug}`)
        .eq('status', 'accepted')

      connections?.forEach(c => {
        if (c.from_slug === rpSlug) connectedSlugs[c.to_slug] = true
        else connectedSlugs[c.from_slug] = true
      })
    }

    type CityEntry = {
      count: number
      hasConnection: boolean
      hasAmbassador: boolean
      hasTrusted: boolean
      isSelf: boolean
      name?: string
      image?: string
    }
    const cityMap: Record<string, CityEntry> = {}

    // ── 4. Destinations du RP courant (sans filtre active) ────────────────────
    // Toujours traité, même si la requête allRps a échoué
    const selfDestsArr: string[] = []
    const selfCustomNames: Record<string, string> = {}
    const selfCustomImages: Record<string, string> = {}

    if (rpSlug) {
      const { data: selfData } = await supabaseAdmin
        .from('rp_profiles')
        .select('activated_destinations')
        .eq('slug', rpSlug)
        .maybeSingle()

      // Source A : destinations configurées manuellement
      for (const raw of selfData?.activated_destinations ?? []) {
        const slug = parseDestSlug(raw)
        if (!slug) continue
        if (!selfDestsArr.includes(slug)) selfDestsArr.push(slug)
        try {
          const p = JSON.parse(raw)
          if (p?.slug && p?.name) selfCustomNames[p.slug] = p.name
          if (p?.slug && p?.image) selfCustomImages[p.slug] = p.image
        } catch { /* plain slug */ }
      }

      // Source B : destinations inférées depuis les réservations du RP courant
      for (const slug of Array.from(rpResaDests[rpSlug] ?? [])) {
        if (!selfDestsArr.includes(slug)) selfDestsArr.push(slug)
      }
    }

    const selfDests = new Set<string>(selfDestsArr)

    console.log('[cities API]', {
      rpSlug,
      allRpsCount: allRps.length,
      selfDestsCount: selfDestsArr.length,
      selfDests: selfDestsArr,
    })

    // ── 5. Agréger les villes de tous les autres RPs ──────────────────────────
    for (const rp of allRps) {
      if (rp.slug === rpSlug) continue

      const configDests = (rp.activated_destinations ?? []).map(parseDestSlug).filter(Boolean)
      const resaDests   = Array.from(rpResaDests[rp.slug] ?? [])
      const allRpDests  = Array.from(new Set([...configDests, ...resaDests]))

      const isConnected  = !!connectedSlugs[rp.slug]
      const isAmbassador = !!rp.is_ambassador
      const isTrusted    = !!rp.is_trusted

      for (const slug of allRpDests) {
        if (!slug) continue
        if (!cityMap[slug]) {
          cityMap[slug] = {
            count: 0,
            hasConnection: false,
            hasAmbassador: false,
            hasTrusted: false,
            isSelf: selfDests.has(slug),
          }
        }
        cityMap[slug].count++
        if (isConnected)  cityMap[slug].hasConnection  = true
        if (isAmbassador) cityMap[slug].hasAmbassador  = true
        if (isTrusted)    cityMap[slug].hasTrusted     = true
      }
    }

    // ── 6. Ajouter les destinations propres au RP courant ─────────────────────
    // (même si aucun autre RP n'est dans cette destination)
    for (const slug of Array.from(selfDests)) {
      if (!slug) continue
      if (!cityMap[slug]) {
        cityMap[slug] = {
          count: 0,
          hasConnection: false,
          hasAmbassador: false,
          hasTrusted: false,
          isSelf: true,
          name:  selfCustomNames[slug],
          image: selfCustomImages[slug],
        }
      } else {
        cityMap[slug].isSelf = true
        if (selfCustomNames[slug])  cityMap[slug].name  = selfCustomNames[slug]
        if (selfCustomImages[slug]) cityMap[slug].image = selfCustomImages[slug]
      }
    }

    const result = Object.entries(cityMap).map(([slug, d]) => ({
      slug,
      name:          d.name,
      image:         d.image,
      count:         d.count,
      hasConnection: d.hasConnection,
      hasAmbassador: d.hasAmbassador,
      hasTrusted:    d.hasTrusted,
      isSelf:        d.isSelf,
    }))

    return Response.json(result)
  } catch (e) {
    console.error('[cities API]', e)
    return Response.json([])
  }
}
