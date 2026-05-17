import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/rp/exists?slug=xxx
// Vérifie si un profil RP existe encore en base (sans auth)
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ exists: false })

  const { data } = await supabaseAdmin
    .from('rp_profiles')
    .select('slug')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  return NextResponse.json({ exists: !!data })
}
