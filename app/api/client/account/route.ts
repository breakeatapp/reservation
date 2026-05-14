import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// DELETE /api/client/account — Supprimer le compte client d'un RP
export async function DELETE(req: NextRequest) {
  const { email, rpSlug } = await req.json()
  if (!email || !rpSlug) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  try {
    // Supprimer la fiche client (pas les réservations — historique conservé)
    const { error } = await supabaseAdmin
      .from('rp_client_notes')
      .delete()
      .eq('rp_slug', rpSlug)
      .eq('client_email', email.toLowerCase())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
