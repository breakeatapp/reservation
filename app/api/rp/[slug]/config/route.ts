import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyRPPassword } from '@/lib/rp'

const supabase = supabaseAdmin

type Params = { params: { slug: string } }

// GET — retourne la config actuelle du RP
export async function GET(req: NextRequest, { params }: Params) {
  const password = req.headers.get('x-rp-password') || ''
  const isValid = await verifyRPPassword(params.slug, password)
  if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('rp_profiles')
    .select('activated_destinations, activated_venues, tagline, display_name, accent_color, logo_text, whatsapp, email, notification_pref')
    .eq('slug', params.slug)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH — mettre à jour la config du RP
export async function PATCH(req: NextRequest, { params }: Params) {
  const password = req.headers.get('x-rp-password') || ''
  const isValid = await verifyRPPassword(params.slug, password)
  if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Champs autorisés à modifier
  const allowed = ['activated_destinations', 'activated_venues', 'tagline', 'accent_color', 'logo_text', 'whatsapp', 'notification_pref']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('rp_profiles')
    .update(updates)
    .eq('slug', params.slug)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — supprimer toutes les réservations du RP (reset données de test)
export async function DELETE(req: NextRequest, { params }: Params) {
  const password = req.headers.get('x-rp-password') || ''
  const isValid = await verifyRPPassword(params.slug, password)
  if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  // Si deleteProfile=true → supprimer toutes les données liées puis le profil
  if (body.deleteProfile) {
    // 1. Supprimer les réservations
    await supabase.from('reservations').delete().eq('rp_slug', params.slug)
    // 2. Supprimer les fiches clients (evite les erreurs de contrainte FK)
    await supabase.from('rp_client_notes').delete().eq('rp_slug', params.slug)
    // 3. Supprimer le profil RP
    const { error } = await supabase.from('rp_profiles').delete().eq('slug', params.slug)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, deleted: 'profile+reservations+clients' })
  }

  // Sinon → supprimer seulement les réservations
  const { error } = await supabase.from('reservations').delete().eq('rp_slug', params.slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, deleted: 'reservations' })
}
