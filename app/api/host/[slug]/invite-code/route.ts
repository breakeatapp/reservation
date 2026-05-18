import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/1/0 confusion
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// GET /api/host/[slug]/invite-code
// Returns (and generates if missing) the invite code for a venue
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const { data: venue, error } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug, invite_code, active')
      .eq('slug', slug)
      .eq('active', true)
      .single()

    if (error || !venue) {
      return NextResponse.json({ error: 'Venue introuvable.' }, { status: 404 })
    }

    // If already has a code, return it
    if (venue.invite_code) {
      return NextResponse.json({ code: venue.invite_code })
    }

    // Generate a unique code
    let code = generateCode()
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from('venues_profiles')
        .select('slug')
        .eq('invite_code', code)
        .maybeSingle()
      if (!existing) break
      code = generateCode()
      attempts++
    }

    // Save it
    const { error: updateError } = await supabaseAdmin
      .from('venues_profiles')
      .update({ invite_code: code })
      .eq('slug', slug)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ code })
  } catch (err) {
    console.error('[invite-code] error:', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
