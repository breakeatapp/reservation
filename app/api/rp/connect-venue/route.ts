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

    // ── 1. Chercher un venue individuel par code ───────────────
    const { data: venue } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug, venue_name, active')
      .eq('invite_code', code)
      .eq('active', true)
      .maybeSingle()

    if (venue) {
      // Connexion venue individuel (logique existante)
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

      const { error: insertError } = await supabaseAdmin
        .from('venue_rp_connections')
        .insert({
          venue_slug: venue.slug,
          rp_slug: rpSlug,
          venue_name: venue.venue_name,
          rp_display_name: rp.display_name,
        })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      console.log(`[connect-venue] RP "${rpSlug}" connected to venue "${venue.slug}"`)
      return NextResponse.json({
        success: true,
        alreadyConnected: false,
        venueName: venue.venue_name,
        venueSlug: venue.slug,
      })
    }

    // ── 2. Chercher un groupe par code ─────────────────────────
    const { data: group } = await supabaseAdmin
      .from('hospitality_groups')
      .select('id, slug, group_name')
      .eq('invite_code', code)
      .eq('active', true)
      .maybeSingle()

    if (!group) {
      return NextResponse.json({ error: 'Code invalide. Vérifiez le code fourni par le restaurant ou le groupe.' }, { status: 404 })
    }

    // Vérifier si déjà connecté au groupe
    const { data: existingGroup } = await supabaseAdmin
      .from('group_rp_connections')
      .select('id')
      .eq('group_id', group.id)
      .eq('rp_slug', rpSlug)
      .maybeSingle()

    // Récupérer tous les venues du groupe
    const { data: groupVenues } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug, venue_name')
      .eq('group_id', group.id)
      .eq('active', true)

    const venues = groupVenues ?? []

    if (!existingGroup) {
      // Enregistrer la connexion groupe
      await supabaseAdmin
        .from('group_rp_connections')
        .insert({
          group_id: group.id,
          group_slug: group.slug,
          rp_slug: rpSlug,
          rp_display_name: rp.display_name,
        })

      // Connecter le RP à tous les venues du groupe
      for (const v of venues) {
        const { data: alreadyLinked } = await supabaseAdmin
          .from('venue_rp_connections')
          .select('venue_slug')
          .eq('venue_slug', v.slug)
          .eq('rp_slug', rpSlug)
          .maybeSingle()

        if (!alreadyLinked) {
          await supabaseAdmin
            .from('venue_rp_connections')
            .insert({
              venue_slug: v.slug,
              rp_slug: rpSlug,
              venue_name: v.venue_name,
              rp_display_name: rp.display_name,
            })
        }
      }

      console.log(`[connect-venue] RP "${rpSlug}" connected to group "${group.slug}" (${venues.length} venues)`)
    }

    return NextResponse.json({
      success: true,
      alreadyConnected: !!existingGroup,
      isGroup: true,
      groupName: group.group_name,
      venueCount: venues.length,
      venues: venues.map(v => v.venue_name),
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

// DELETE /api/rp/connect-venue
// Body: { rpSlug, venueSlug }
// Supprime la connexion entre un RP et un venue spécifique
export async function DELETE(req: NextRequest) {
  try {
    const { rpSlug, venueSlug } = await req.json()
    if (!rpSlug || !venueSlug) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('venue_rp_connections')
      .delete()
      .eq('venue_slug', venueSlug)
      .eq('rp_slug', rpSlug)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[connect-venue/delete] error:', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
