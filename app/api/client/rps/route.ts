import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getRPProfile } from '@/lib/rp'

// GET /api/client/rps?email=xxx
// Retourne le prénom du client + la liste de tous ses RPs avec compteurs
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim()
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  try {
    // Toutes les réservations de ce client (toutes destinations confondues)
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select('first_name, rp_slug, status')
      .ilike('email', email)
      .order('created_at', { ascending: false })

    if (error || !data) return NextResponse.json({ firstName: '', rps: [] })

    if (data.length === 0) return NextResponse.json({ firstName: '', rps: [] })

    // Prénom depuis la première réservation trouvée
    const firstName = data[0]?.first_name ?? ''

    // Grouper par rp_slug
    const grouped: Record<string, { total: number; pending: number; confirmed: number }> = {}
    for (const r of data) {
      const slug = r.rp_slug || 'unknown'
      if (!grouped[slug]) grouped[slug] = { total: 0, pending: 0, confirmed: 0 }
      grouped[slug].total++
      if (r.status === 'pending')   grouped[slug].pending++
      if (r.status === 'confirmed') grouped[slug].confirmed++
    }

    // Enrichir avec le nom d'affichage du RP (Supabase → fallback local)
    const rps = await Promise.all(
      Object.entries(grouped).map(async ([slug, counts]) => {
        const rpProfile = await getRPProfile(slug)
        return {
          slug,
          displayName: rpProfile?.display_name ?? slug,
          accentColor: rpProfile?.accent_color ?? '#5B3DF5',
          logoText: rpProfile?.logo_text ?? slug.toUpperCase().slice(0, 4),
          totalCount: counts.total,
          pendingCount: counts.pending,
          confirmedCount: counts.confirmed,
        }
      })
    )

    // Trier par nombre total décroissant
    rps.sort((a, b) => b.totalCount - a.totalCount)

    return NextResponse.json({ firstName, rps })
  } catch {
    return NextResponse.json({ firstName: '', rps: [] })
  }
}
