import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  sendPendingReminderToRP,
  sendPendingReminderToVenue,
  type PendingResa,
} from '@/lib/email'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://itinera.click'

// Vercel appelle cette route toutes les 6h via vercel.json
// Sécurisé par Authorization: Bearer CRON_SECRET
export async function GET(req: NextRequest) {
  // Vérification du secret Vercel cron
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = SITE_URL

  // ── 1. Toutes les réservations en attente ─────────────────
  const { data: pending, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[cron/remind-pending] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!pending || pending.length === 0) {
    console.log('[cron/remind-pending] aucune réservation en attente')
    return NextResponse.json({ sent: 0, skipped: 'no pending reservations' })
  }

  console.log(`[cron/remind-pending] ${pending.length} réservations en attente`)

  // Helper : convertir une ligne DB en PendingResa
  const toResa = (r: Record<string, unknown>): PendingResa => ({
    id:              r.id as string,
    first_name:      r.first_name as string,
    last_name:       r.last_name as string,
    establishment:   r.establishment as string,
    destination:     r.destination as string | undefined,
    date:            r.date as string,
    time:            r.time as string,
    guests:          r.guests as number,
    occasion:        r.occasion as string | undefined,
    special_requests: r.special_requests as string | undefined,
    created_at:      r.created_at as string | undefined,
    viewUrl:         `${baseUrl}/host/confirm/${r.id}`,
  })

  // ── 2. Grouper par rp_slug → rappel au concierge ─────────
  const byRP: Record<string, PendingResa[]> = {}
  for (const r of pending) {
    const slug = (r.rp_slug as string) || ''
    if (!slug) continue
    if (!byRP[slug]) byRP[slug] = []
    byRP[slug].push(toResa(r))
  }

  // Fetch les profils RP pour avoir leurs emails
  const rpSlugs = Object.keys(byRP)
  let rpEmailsSent = 0

  if (rpSlugs.length > 0) {
    const { data: rpProfiles } = await supabaseAdmin
      .from('rp_profiles')
      .select('slug, email, display_name')
      .in('slug', rpSlugs)
      .eq('active', true)

    const results = await Promise.allSettled(
      (rpProfiles ?? []).map(async rp => {
        if (!rp.email) return
        const resas = byRP[rp.slug] ?? []
        if (resas.length === 0) return
        await sendPendingReminderToRP(rp.email, rp.display_name, resas)
        rpEmailsSent++
        console.log(`[cron] rappel RP "${rp.slug}" — ${resas.length} résa(s)`)
      })
    )
    results.forEach(r => {
      if (r.status === 'rejected') console.error('[cron] RP email error:', r.reason)
    })
  }

  // ── 3. Grouper par venue_slug → rappel au venue ───────────
  // Uniquement les réservations avec venue_slug (connexions de confiance)
  const byVenueSlug: Record<string, PendingResa[]> = {}
  for (const r of pending) {
    const slug = (r.venue_slug as string) || ''
    if (!slug) continue
    if (!byVenueSlug[slug]) byVenueSlug[slug] = []
    byVenueSlug[slug].push(toResa(r))
  }

  let venueEmailsSent = 0
  const venueSlugs = Object.keys(byVenueSlug)

  if (venueSlugs.length > 0) {
    const { data: venueProfiles } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug, email, venue_name')
      .in('slug', venueSlugs)
      .eq('active', true)

    const results = await Promise.allSettled(
      (venueProfiles ?? []).map(async venue => {
        if (!venue.email) return
        const resas = byVenueSlug[venue.slug] ?? []
        if (resas.length === 0) return
        await sendPendingReminderToVenue(venue.email, venue.venue_name, resas)
        venueEmailsSent++
        console.log(`[cron] rappel venue "${venue.slug}" — ${resas.length} résa(s)`)
      })
    )
    results.forEach(r => {
      if (r.status === 'rejected') console.error('[cron] venue email error:', r.reason)
    })
  }

  return NextResponse.json({
    ok: true,
    total_pending: pending.length,
    rp_emails_sent: rpEmailsSent,
    venue_emails_sent: venueEmailsSent,
  })
}
