import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/host/[slug]/debug
// Endpoint de diagnostic pour comprendre pourquoi les partenaires n'apparaissent pas
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug?.toLowerCase().trim() ?? ''

  // 1. Profil venue exact
  const { data: venue } = await supabaseAdmin
    .from('venues_profiles')
    .select('slug, venue_name, destination, invite_code, active')
    .eq('slug', slug)
    .maybeSingle()

  // 2. Tous les venues avec un nom similaire (au cas où il y aurait un slug duplicate)
  const { data: similarVenues } = await supabaseAdmin
    .from('venues_profiles')
    .select('slug, venue_name, destination, active')
    .ilike('venue_name', `%${venue?.venue_name ?? slug}%`)
    .limit(10)

  // 3. Connexions matching ce venue
  const { data: connectionsExact, error: connError } = await supabaseAdmin
    .from('venue_rp_connections')
    .select('venue_slug, rp_slug, rp_display_name, venue_name, created_at')
    .eq('venue_slug', slug)

  // 4. Toutes les connexions de la base (les 20 dernières) — pour voir si la table contient des données
  const { data: allConnections } = await supabaseAdmin
    .from('venue_rp_connections')
    .select('venue_slug, rp_slug, rp_display_name, venue_name, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    queriedSlug: slug,
    venue: venue ?? null,
    similarVenues: similarVenues ?? [],
    connectionsMatchingThisSlug: connectionsExact ?? [],
    connectionsError: connError?.message ?? null,
    last20ConnectionsInDB: allConnections ?? [],
  })
}
