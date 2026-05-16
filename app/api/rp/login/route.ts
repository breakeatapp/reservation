import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/rp/login
// { email, password } → { slug } ou erreur
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('rp_profiles')
    .select('slug, dashboard_password, display_name')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Aucun compte trouvé avec cet email.' }, { status: 404 })
  }

  if (data.dashboard_password !== password) {
    return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 })
  }

  return NextResponse.json({ slug: data.slug, displayName: data.display_name })
}
