import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/host/[slug]/connections
// Returns the list of RPs connected to this venue
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Verify venue exists and is active
    const { data: venue, error: venueError } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug')
      .eq('slug', slug)
      .eq('active', true)
      .single()

    if (venueError || !venue) {
      return NextResponse.json({ error: 'Venue introuvable.' }, { status: 404 })
    }

    const { data: connections, error } = await supabaseAdmin
      .from('venue_rp_connections')
      .select('rp_slug, rp_display_name, created_at')
      .eq('venue_slug', slug)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(connections ?? [])
  } catch (err) {
    console.error('[connections/get] error:', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
