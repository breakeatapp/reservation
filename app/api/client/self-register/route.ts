import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getRPProfile } from '@/lib/rp'

// POST /api/client/self-register
// Permet à un guest de s'inscrire lui-même via le lien du RP
export async function POST(req: NextRequest) {
  try {
    const { email, firstName, rpSlug } = await req.json()

    if (!email || !rpSlug) {
      return NextResponse.json({ error: 'Email et RP requis' }, { status: 400 })
    }

    const emailLower = email.trim().toLowerCase()

    // Vérifier que le RP existe
    const rpProfile = await getRPProfile(rpSlug)
    if (!rpProfile) {
      return NextResponse.json({ error: 'RP introuvable' }, { status: 404 })
    }

    // Créer ou mettre à jour la fiche client
    const { error } = await supabaseAdmin
      .from('rp_client_notes')
      .upsert(
        {
          rp_slug: rpSlug,
          client_email: emailLower,
          client_name: firstName?.trim() || '',
          vip_tag: '',
          internal_note: '',
          total_resas: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'rp_slug,client_email' }
      )

    if (error) throw error

    return NextResponse.json({
      success: true,
      rpDisplayName: rpProfile.display_name,
      firstName: firstName?.trim() || '',
    })
  } catch (err) {
    console.error('Self-register error:', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
