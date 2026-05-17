import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getRPProfile } from '@/lib/rp'

// GET /api/client/rps?email=xxx
// Retourne le prénom du client + la liste de tous ses RPs avec compteurs
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim()
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  try {
    // 1. Réservations de ce client
    const { data: resaData } = await supabaseAdmin
      .from('reservations')
      .select('first_name, rp_slug, status')
      .ilike('email', email)
      .order('created_at', { ascending: false })

    // 2. RPs qui ont ajouté ce client manuellement (même sans resa)
    const { data: clientNotes } = await supabaseAdmin
      .from('rp_client_notes')
      .select('rp_slug, client_name')
      .ilike('client_email', email)

    // Prénom : depuis les resas ou depuis client_notes
    const firstName = resaData?.[0]?.first_name
      || clientNotes?.[0]?.client_name?.split(' ')[0]
      || ''

    // Grouper les resas par rp_slug
    const grouped: Record<string, { total: number; pending: number; confirmed: number }> = {}
    for (const r of resaData ?? []) {
      const slug = r.rp_slug
      if (!slug) continue
      if (!grouped[slug]) grouped[slug] = { total: 0, pending: 0, confirmed: 0 }
      grouped[slug].total++
      if (r.status === 'pending')   grouped[slug].pending++
      if (r.status === 'confirmed') grouped[slug].confirmed++
    }

    // Ajouter les RPs depuis client_notes (ceux qui n'ont pas encore de resa)
    for (const note of clientNotes ?? []) {
      if (note.rp_slug && !grouped[note.rp_slug]) {
        grouped[note.rp_slug] = { total: 0, pending: 0, confirmed: 0 }
      }
    }

    if (Object.keys(grouped).length === 0) {
      return NextResponse.json({ firstName: '', rps: [] })
    }

    // Enrichir avec le nom d'affichage du RP
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

    rps.sort((a, b) => b.totalCount - a.totalCount)
    return NextResponse.json({ firstName, rps })
  } catch {
    return NextResponse.json({ firstName: '', rps: [] })
  }
}
