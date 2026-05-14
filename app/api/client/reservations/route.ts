import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const supabase = supabaseAdmin

// GET /api/client/reservations?email=xxx&rpSlug=yyy
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim()
  const rpSlug = req.nextUrl.searchParams.get('rpSlug')

  if (!email) {
    return NextResponse.json({ error: 'Email requis' }, { status: 400 })
  }

  try {
    let query = supabase
      .from('reservations')
      .select('id, created_at, establishment, destination, date, time, guests, occasion, seating, special_requests, status, rp_slug')
      .ilike('email', email)
      .order('created_at', { ascending: false })

    if (rpSlug) {
      query = query.eq('rp_slug', rpSlug)
    }

    const { data, error } = await query

    if (error) {
      // Essayer sans le filtre rp_slug si la colonne n'existe pas encore
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('reservations')
        .select('id, created_at, establishment, destination, date, time, guests, occasion, seating, special_requests, status')
        .ilike('email', email)
        .order('created_at', { ascending: false })

      if (fallbackError) return NextResponse.json([])
      return NextResponse.json(fallbackData ?? [])
    }

    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}
