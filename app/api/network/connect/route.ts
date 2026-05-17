import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/network/connect  { from_slug, to_slug }
// Creates or updates a connection request.
// If a pending_received already exists (the other sent first), auto-accepts.
export async function POST(req: Request) {
  try {
    const { from_slug, to_slug } = await req.json()

    if (!from_slug || !to_slug || from_slug === to_slug) {
      return Response.json({ error: 'Invalid params' }, { status: 400 })
    }

    // Check if reverse connection exists (they sent to us first)
    const { data: reverse } = await supabaseAdmin
      .from('rp_connections')
      .select('id, status')
      .eq('from_slug', to_slug)
      .eq('to_slug', from_slug)
      .single()

    if (reverse && reverse.status === 'pending') {
      // Auto-accept: update reverse to accepted
      await supabaseAdmin
        .from('rp_connections')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', reverse.id)

      return Response.json({ success: true, status: 'accepted' })
    }

    // Otherwise upsert our connection request
    const { error } = await supabaseAdmin
      .from('rp_connections')
      .upsert(
        { from_slug, to_slug, status: 'pending', updated_at: new Date().toISOString() },
        { onConflict: 'from_slug,to_slug' }
      )

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ success: true, status: 'pending' })
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
