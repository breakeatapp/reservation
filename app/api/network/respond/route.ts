import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/network/respond  { from_slug, to_slug, action: 'accept' | 'decline' }
// Accepts or declines a pending RP connection request.
export async function POST(req: Request) {
  try {
    const { from_slug, to_slug, action } = await req.json()

    if (!from_slug || !to_slug || !['accept', 'decline'].includes(action)) {
      return Response.json({ error: 'Invalid params' }, { status: 400 })
    }

    if (action === 'accept') {
      const { error } = await supabaseAdmin
        .from('rp_connections')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('from_slug', from_slug)
        .eq('to_slug', to_slug)
        .eq('status', 'pending')

      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ success: true, status: 'accepted' })
    } else {
      // Refus : supprimer la demande
      const { error } = await supabaseAdmin
        .from('rp_connections')
        .delete()
        .eq('from_slug', from_slug)
        .eq('to_slug', to_slug)

      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ success: true, status: 'declined' })
    }
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
