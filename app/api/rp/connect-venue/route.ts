import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/rp/connect-venue
// Body: { rpSlug, inviteCode }
// Finds the venue with this code and creates a trust connection
export async function POST(req: NextRequest) {
  try {
    const { rpSlug, inviteCode } = await req.json()

    if (!rpSlug || !inviteCode) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
    }

    const code = String(inviteCode).trim().toUpperCase()

    // Verify RP exists
    const { data: rp, error: rpError } = await supabaseAdmin
      .from('rp_profiles')
      .select('slug, display_name')
      .eq('slug', rpSlug)
      .single()

    if (rpError || !rp) {
      return NextResponse.json({ error: 'Profil RP introuvable.' }, { status: 404 })
    }

    // Find venue by invite code
    const { data: venue, error: venueError } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug, venue_name, active')
      .eq('invite_code', code)
      .eq('active', true)
      .maybeSingle()

    if (venueError || !venue) {
      return NextResponse.json({ error: 'Code invalide. Vérifiez le code fourni par le restaurant.' }, { status: 404 })
    }

    // Check if already connected
    const { data: existing } = await supabaseAdmin
      .from('venue_rp_connections')
      .select('venue_slug')
      .eq('venue_slug', venue.slug)
      .eq('rp_slug', rpSlug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyConnected: true,
        venueName: venue.venue_name,
        venueSlug: venue.slug,
      })
    }

    // Create connection
    const { error: insertError } = await supabaseAdmin
      .from('venue_rp_connections')
      .insert({
        venue_slug: venue.slug,
        rp_slug: rpSlug,
        venue_name: venue.venue_name,
        rp_display_name: rp.display_name,
      })

    if (insertError) {
      console.error('[connect-venue] insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log(`[connect-venue] RP "${rpSlug}" connected to venue "${venue.slug}"`)

    return NextResponse.json({
      success: true,
      alreadyConnected: false,
      venueName: venue.venue_name,
      venueSlug: venue.slug,
    })
  } catch (err) {
    console.error('[connect-venue] error:', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}

// GET /api/rp/connect-venue?rpSlug=xxx
// Returns all venues connected to this RP
export async function GET(req: NextRequest) {
  try {
    const rpSlug = req.nextUrl.searchParams.get('rpSlug')
    if (!rpSlug) {
      return NextResponse.json({ error: 'rpSlug requis.' }, { status: 400 })
    }

    const { data: connections, error } = await supabaseAdmin
      .from('venue_rp_connections')
      .select('venue_slug, venue_name, created_at')
      .eq('rp_slug', rpSlug)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(connections ?? [])
  } catch (err) {
    console.error('[connect-venue/get] error:', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
