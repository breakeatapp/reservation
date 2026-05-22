import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/group/[slug]/partners — liste les RPs partenaires du groupe
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const { data: group } = await supabaseAdmin
      .from('hospitality_groups')
      .select('id')
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle()

    if (!group) return Response.json({ error: 'Groupe introuvable.' }, { status: 404 })

    const { data: partners, error } = await supabaseAdmin
      .from('group_rp_connections')
      .select('rp_slug, rp_display_name, connected_at')
      .eq('group_id', group.id)
      .order('connected_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ partners: partners ?? [] })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE /api/group/[slug]/partners
// Body: { rpSlug }
// Retire un RP du groupe et de tous ses venues
export async function DELETE(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const { rpSlug } = await req.json()
    if (!rpSlug) return Response.json({ error: 'rpSlug requis.' }, { status: 400 })

    const { data: group } = await supabaseAdmin
      .from('hospitality_groups')
      .select('id')
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle()

    if (!group) return Response.json({ error: 'Groupe introuvable.' }, { status: 404 })

    // Récupérer tous les venues du groupe
    const { data: groupVenues } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug')
      .eq('group_id', group.id)

    // Supprimer les connexions venue pour chaque venue du groupe
    if (groupVenues && groupVenues.length > 0) {
      const venueSlugs = groupVenues.map(v => v.slug)
      await supabaseAdmin
        .from('venue_rp_connections')
        .delete()
        .in('venue_slug', venueSlugs)
        .eq('rp_slug', rpSlug)
    }

    // Supprimer la connexion groupe
    await supabaseAdmin
      .from('group_rp_connections')
      .delete()
      .eq('group_id', group.id)
      .eq('rp_slug', rpSlug)

    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
