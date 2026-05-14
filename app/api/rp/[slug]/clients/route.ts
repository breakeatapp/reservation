import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyRPPassword, getRPProfile } from '@/lib/rp'
import { sendClientWelcomeEmail } from '@/lib/email'

// ── Authentification ──────────────────────────────────────────────────────────
async function auth(req: NextRequest, slug: string): Promise<boolean> {
  const pw = req.headers.get('x-rp-password') || ''
  return verifyRPPassword(slug, pw)
}

// ── GET /api/rp/[slug]/clients ────────────────────────────────────────────────
// Retourne toutes les fiches clients du RP (avec le nombre total de resas)
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  if (!(await auth(req, slug))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const email = req.nextUrl.searchParams.get('email')

  if (email) {
    // Fiche d'un client spécifique
    const { data, error } = await supabaseAdmin
      .from('rp_client_notes')
      .select('*')
      .eq('rp_slug', slug)
      .eq('client_email', email.toLowerCase())
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data ?? null)
  }

  // Toutes les fiches du RP
  const { data, error } = await supabaseAdmin
    .from('rp_client_notes')
    .select('*')
    .eq('rp_slug', slug)
    .order('total_resas', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── POST /api/rp/[slug]/clients ───────────────────────────────────────────────
// Crée ou met à jour la fiche d'un client (upsert)
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  if (!(await auth(req, slug))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const { clientEmail, clientName, vipTag, internalNote, sendWelcome } = await req.json()

  if (!clientEmail) {
    return NextResponse.json({ error: 'Email client requis.' }, { status: 400 })
  }

  const emailLower = clientEmail.toLowerCase()

  // Vérifier si le client existe déjà (avant l'upsert)
  const { data: existing } = await supabaseAdmin
    .from('rp_client_notes')
    .select('id')
    .eq('rp_slug', slug)
    .eq('client_email', emailLower)
    .single()

  const isNewClient = !existing

  // Compter le nombre total de réservations de ce client pour ce RP
  const { count } = await supabaseAdmin
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('rp_slug', slug)
    .eq('email', emailLower)

  const { data, error } = await supabaseAdmin
    .from('rp_client_notes')
    .upsert(
      {
        rp_slug: slug,
        client_email: emailLower,
        client_name: clientName ?? '',
        vip_tag: vipTag ?? '',
        internal_note: internalNote ?? '',
        total_resas: count ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'rp_slug,client_email' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Email de bienvenue si c'est un nouveau client ──
  if (isNewClient && sendWelcome !== false) {
    try {
      const rpProfile = await getRPProfile(slug)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://reservation-4gk2.vercel.app'
      await sendClientWelcomeEmail({
        clientEmail: emailLower,
        clientName: clientName || '',
        rpDisplayName: rpProfile?.display_name || slug,
        rpEmail: rpProfile?.email,
        rpWhatsapp: rpProfile?.whatsapp,
        rpSlug: slug,
        siteUrl,
      })
    } catch (emailErr) {
      console.error('Welcome email error:', emailErr)
    }
  }

  return NextResponse.json({ ...data, welcomeEmailSent: isNewClient })
}
