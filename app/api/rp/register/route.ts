import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Alias pour lisibilité
const supabase = supabaseAdmin

const INVITE_CODE = process.env.RP_INVITE_CODE || 'ELITE2024'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      inviteCode,
      slug,
      displayName,
      tagline,
      email,
      whatsapp,
      password,
      activatedDestinations,
      activatedVenues,
      logoText,
      accentColor,
    } = body

    // Vérifier le code d'invitation
    if (!inviteCode || inviteCode.toUpperCase() !== INVITE_CODE.toUpperCase()) {
      return NextResponse.json({ error: 'Code d\'invitation invalide.' }, { status: 403 })
    }

    // Valider les champs obligatoires
    if (!slug || !displayName || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
    }

    // Vérifier que le slug est valide
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({
        error: 'Identifiant invalide : lettres minuscules, chiffres et tirets uniquement.'
      }, { status: 400 })
    }

    // Vérifier que le slug n'est pas déjà pris
    const { data: existing, error: checkError } = await supabase
      .from('rp_profiles')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()  // maybeSingle au lieu de single → pas d'erreur si absent

    if (existing) {
      return NextResponse.json({ error: 'Cet identifiant est déjà utilisé.' }, { status: 409 })
    }

    // Si checkError (autre qu'absence de ligne) → problème de connexion ou RLS
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check slug error:', checkError)
      return NextResponse.json({
        error: `Erreur de connexion Supabase : ${checkError.message}`
      }, { status: 500 })
    }

    // Créer le profil RP
    const { error: insertError } = await supabase
      .from('rp_profiles')
      .insert({
        slug,
        display_name: displayName,
        tagline: tagline || 'Votre accès privé aux meilleures tables',
        email,
        whatsapp: whatsapp?.replace(/[^0-9]/g, '') || '',
        dashboard_password: password,
        active: true,
        activated_destinations: activatedDestinations ?? [],
        activated_venues: activatedVenues ?? [],
        logo_text: logoText || displayName.substring(0, 8).toUpperCase(),
        accent_color: accentColor || '#5B3DF5',
      })

    if (insertError) {
      console.error('RP insert error:', insertError)
      // Retourner l'erreur réelle pour diagnostic
      return NextResponse.json({
        error: `Impossible de créer le compte : ${insertError.message} (code: ${insertError.code})`
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, slug })
  } catch (err) {
    console.error('Register API error:', err)
    return NextResponse.json({ error: `Erreur interne : ${String(err)}` }, { status: 500 })
  }
}
