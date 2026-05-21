import { supabaseAdmin } from '@/lib/supabase-admin'

function parseDestSlug(raw: string): string {
  try {
    const p = JSON.parse(raw)
    if (p && typeof p === 'object' && p.slug) return p.slug
  } catch { /* not JSON */ }
  return raw.trim()
}

// GET /api/network/partners?rp_slug=X
// Returns all RPs with whom rp_slug has an accepted connection,
// including their contact info (email, whatsapp).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rpSlug = searchParams.get('rp_slug') || ''

    if (!rpSlug) return Response.json([])

    // Toutes les connexions acceptées impliquant ce RP
    const { data: connections } = await supabaseAdmin
      .from('rp_connections')
      .select('from_slug, to_slug')
      .or(`from_slug.eq.${rpSlug},to_slug.eq.${rpSlug}`)
      .eq('status', 'accepted')

    if (!connections || connections.length === 0) return Response.json([])

    // Slugs des partenaires (l'autre côté de chaque connexion)
    const partnerSlugs = connections.map(c =>
      c.from_slug === rpSlug ? c.to_slug : c.from_slug
    )

    // Profils des partenaires — tentative avec colonnes optionnelles
    type ProfileRow = {
      slug: string
      display_name: string
      tagline: string | null
      email: string
      whatsapp: string
      activated_destinations: string[] | null
      is_ambassador?: boolean | null
      is_trusted?: boolean | null
    }

    let profiles: ProfileRow[] | null = null
    {
      const { data, error } = await supabaseAdmin
        .from('rp_profiles')
        .select('slug, display_name, tagline, email, whatsapp, activated_destinations, is_ambassador, is_trusted')
        .in('slug', partnerSlugs)

      if (!error && data) {
        profiles = data as ProfileRow[]
      } else {
        // Colonnes optionnelles absentes → requête sans elles
        console.warn('[partners API] fallback sans is_ambassador/is_trusted:', error?.message)
        const { data: basic } = await supabaseAdmin
          .from('rp_profiles')
          .select('slug, display_name, tagline, email, whatsapp, activated_destinations')
          .in('slug', partnerSlugs)
        profiles = (basic ?? []).map(r => ({ ...(r as ProfileRow), is_ambassador: false, is_trusted: false }))
      }
    }

    if (!profiles || profiles.length === 0) return Response.json([])

    return Response.json(
      profiles.map(p => ({
        slug:          p.slug,
        display_name:  p.display_name,
        tagline:       p.tagline || '',
        email:         p.email || '',
        whatsapp:      p.whatsapp || '',
        is_ambassador: !!p.is_ambassador,
        is_trusted:    !!p.is_trusted,
        destinations:  (p.activated_destinations ?? [])
          .map(parseDestSlug)
          .filter(Boolean)
          .slice(0, 6),
      }))
    )
  } catch {
    return Response.json([])
  }
}
