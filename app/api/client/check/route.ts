import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/client/check?email=xxx&rp=remi
// Vérifie si un email est un client enregistré d'un RP
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim()
  const rp = req.nextUrl.searchParams.get('rp')?.toLowerCase().trim()

  if (!email || !rp) {
    return NextResponse.json({ registered: false })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('rp_client_notes')
      .select('client_name, vip_tag')
      .eq('rp_slug', rp)
      .eq('client_email', email)
      .single()

    if (error || !data) {
      return NextResponse.json({ registered: false })
    }

    return NextResponse.json({
      registered: true,
      clientName: data.client_name || '',
    })
  } catch {
    return NextResponse.json({ registered: false })
  }
}
