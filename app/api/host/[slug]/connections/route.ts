import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/host/[slug]/connections
// Returns the list of RPs connected to this venue
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // Normaliser le slug (minuscules, sans espaces)
    const slug = params.slug?.toLowerCase().trim()
    if (!slug) {
      return NextResponse.json({ error: 'Slug manquant.' }, { status: 400 })
    }

    // Vérifier l'existence du venue (sans bloquer sur active=true)
    const { data: venue } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()

    // Si le venue n'est pas trouvé du tout → log mais ne pas bloquer
    if (!venue) {
      console.warn('[connections/get] venue not found for slug:', slug)
      // Tenter quand même la requête connections (slug peut venir d'une ancienne session)
    }

    const { data: connections, error } = await supabaseAdmin
      .from('venue_rp_connections')
      .select('rp_slug, rp_display_name, created_at')
      .eq('venue_slug', slug)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[connections/get] query error:', error.message, '| slug:', slug)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[connections/get] slug:', slug, '| found:', connections?.length ?? 0, 'connections')
    return NextResponse.json(connections ?? [])
  } catch (err) {
    console.error('[connections/get] error:', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
