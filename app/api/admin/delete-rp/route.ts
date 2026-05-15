import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/admin/delete-rp?slug=xxx&token=xxx
// Supprime un compte RP et toutes ses données associées
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const slug = req.nextUrl.searchParams.get('slug')

  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!slug) {
    return NextResponse.json({ error: 'Paramètre slug requis' }, { status: 400 })
  }

  // Vérifier que le profil existe
  const { data: profile } = await supabaseAdmin
    .from('rp_profiles')
    .select('slug, display_name')
    .eq('slug', slug)
    .single()

  if (!profile) {
    return NextResponse.json({ error: `Aucun profil trouvé pour le slug "${slug}"` }, { status: 404 })
  }

  // Supprimer dans l'ordre pour éviter les contraintes FK
  const { error: resaErr } = await supabaseAdmin.from('reservations').delete().eq('rp_slug', slug)
  if (resaErr) return NextResponse.json({ error: `Erreur réservations: ${resaErr.message}` }, { status: 500 })

  const { error: clientErr } = await supabaseAdmin.from('rp_client_notes').delete().eq('rp_slug', slug)
  if (clientErr) return NextResponse.json({ error: `Erreur clients: ${clientErr.message}` }, { status: 500 })

  const { error: profileErr } = await supabaseAdmin.from('rp_profiles').delete().eq('slug', slug)
  if (profileErr) return NextResponse.json({ error: `Erreur profil: ${profileErr.message}` }, { status: 500 })

  return NextResponse.json({
    success: true,
    deleted: profile.display_name,
    slug,
  })
}

// Lister tous les slugs RP existants
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('rp_profiles')
    .select('slug, display_name, email, created_at')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
