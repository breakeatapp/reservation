import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// GET /api/group/[slug]/invite-code
// Retourne (et génère si absent) le code d'invitation du groupe
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const { data: group, error } = await supabaseAdmin
      .from('hospitality_groups')
      .select('id, invite_code, active')
      .eq('slug', slug)
      .eq('active', true)
      .single()

    if (error || !group) {
      return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })
    }

    if (group.invite_code) {
      return NextResponse.json({ code: group.invite_code })
    }

    // Générer un code unique
    let code = generateCode()
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from('hospitality_groups')
        .select('id')
        .eq('invite_code', code)
        .maybeSingle()
      if (!existing) break
      code = generateCode()
      attempts++
    }

    const { error: updateError } = await supabaseAdmin
      .from('hospitality_groups')
      .update({ invite_code: code })
      .eq('slug', slug)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ code })
  } catch (err) {
    console.error('[group/invite-code] error:', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
