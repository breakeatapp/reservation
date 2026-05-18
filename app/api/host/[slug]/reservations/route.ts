import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendVenueStatusToClient, sendVenueStatusToRP } from '@/lib/email'

type HostProfile = {
  venue_name: string
  destination: string | null
}

// Parse French formatted date "lundi 15 janvier 2024" → Date for sorting
function parseFrenchDate(str: string): number {
  const months: Record<string, number> = {
    janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
  }
  const parts = (str || '').toLowerCase().split(' ')
  // parts: ['lundi', '15', 'janvier', '2024']
  if (parts.length < 4) return 0
  const day = parseInt(parts[1]) || 1
  const month = months[parts[2]] ?? 0
  const year = parseInt(parts[3]) || 2024
  return new Date(year, month, day).getTime()
}

// Resolve host slug → { venue_name, destination }, return null if not found or inactive
async function resolveHost(slug: string): Promise<HostProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('venues_profiles')
    .select('venue_name, destination')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error || !data) return null
  return data as HostProfile
}

// GET /api/host/[slug]/reservations
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const host = await resolveHost(slug)
    if (!host) {
      return Response.json({ error: 'Établissement introuvable.' }, { status: 401 })
    }

    // Filter reservations: prefer venue_slug match (reliable, set at booking time for trusted connections),
    // fallback to establishment name match (for older reservations pre-trust system).
    // Use OR via two queries and merge, deduplicating by id.
    const [bySlugRes, byNameRes] = await Promise.all([
      supabaseAdmin
        .from('reservations')
        .select('*')
        .eq('venue_slug', slug)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('reservations')
        .select('*')
        .ilike('establishment', host.venue_name)
        .is('venue_slug', null) // only fallback rows without venue_slug set
        .order('created_at', { ascending: true }),
    ])

    const error = bySlugRes.error || byNameRes.error
    const combined = [
      ...(bySlugRes.data ?? []),
      ...(byNameRes.data ?? []),
    ]
    // Deduplicate
    const seen = new Set<string>()
    const data = combined.filter((r: Record<string, unknown>) => {
      const id = r.id as string
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    if (error) {
      return Response.json({ error: 'Erreur lors du chargement.' }, { status: 500 })
    }

    const reservations = data ?? []

    // ── 1. Batch fetch RP display names ──────────────────────
    const rpSlugsSet: Record<string, true> = {}
    reservations.forEach((r: { rp_slug: string }) => { if (r.rp_slug) rpSlugsSet[r.rp_slug] = true })
    const rpSlugs = Object.keys(rpSlugsSet)
    let rpNames: Record<string, string> = {}

    if (rpSlugs.length > 0) {
      const { data: rpProfiles } = await supabaseAdmin
        .from('rp_profiles')
        .select('slug, display_name')
        .in('slug', rpSlugs)

      rpProfiles?.forEach((rp: { slug: string; display_name: string }) => {
        rpNames[rp.slug] = rp.display_name || rp.slug
      })
    }

    // ── 2. Batch fetch client notes (VIP, products, nationality) ──
    // Build list of (rp_slug, email) pairs to look up
    type ClientNoteKey = { rp_slug: string; email: string }
    const pairs: ClientNoteKey[] = reservations
      .filter((r: Record<string, unknown>) => r.rp_slug && r.email)
      .map((r: Record<string, unknown>) => ({ rp_slug: r.rp_slug as string, email: (r.email as string).toLowerCase() }))

    // Key: `${rp_slug}::${email}`
    const clientNoteMap: Record<string, { vip_tag: string; internal_note: string }> = {}

    if (pairs.length > 0) {
      // Fetch all matching client notes for this venue's reservations
      const emailSet: Record<string, true> = {}
      pairs.forEach(p => { emailSet[p.email] = true })
      const emails = Object.keys(emailSet)
      const { data: notes } = await supabaseAdmin
        .from('rp_client_notes')
        .select('rp_slug, client_email, vip_tag, internal_note')
        .in('client_email', emails)

      notes?.forEach((n: { rp_slug: string; client_email: string; vip_tag: string; internal_note: string }) => {
        const key = `${n.rp_slug}::${n.client_email.toLowerCase()}`
        clientNoteMap[key] = { vip_tag: n.vip_tag || '', internal_note: n.internal_note || '' }
      })
    }

    // ── 3. Enrich each reservation ────────────────────────────
    const enriched = reservations.map((r: Record<string, unknown>) => {
      const key = `${r.rp_slug}::${(r.email as string || '').toLowerCase()}`
      const clientNote = clientNoteMap[key]
      return {
        ...r,
        rp_name: rpNames[r.rp_slug as string] || r.rp_slug || '',
        vip_tag: clientNote?.vip_tag || r.vip_level || '',
        internal_note: clientNote?.internal_note || '',
      }
    })

    // Sort by parsed French date ascending
    enriched.sort((a, b) =>
      parseFrenchDate((a as Record<string, unknown>).date as string) -
      parseFrenchDate((b as Record<string, unknown>).date as string)
    )

    return Response.json(enriched)
  } catch {
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// PATCH /api/host/[slug]/reservations  { id, status }
export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const { id, status } = await req.json()

    if (!id || !status) {
      return Response.json({ error: 'Paramètres manquants.' }, { status: 400 })
    }

    if (!['confirmed', 'declined'].includes(status)) {
      return Response.json({ error: 'Statut invalide.' }, { status: 400 })
    }

    // Security: verify the host owns this reservation's establishment
    const host = await resolveHost(slug)
    if (!host) {
      return Response.json({ error: 'Non autorisé.' }, { status: 401 })
    }

    // Verify the reservation belongs to this venue (by ID + establishment name, case-insensitive)
    // Note: destination is intentionally excluded — it's stored in different formats
    // (slug "saint-tropez" in venues_profiles vs formatted "Saint Tropez" in reservations)
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('id, establishment')
      .eq('id', id)
      .ilike('establishment', host.venue_name)
      .maybeSingle()

    if (fetchError || !existing) {
      console.error('[venue/patch] verify failed — slug:', slug, 'id:', id, 'venue_name:', host.venue_name, 'fetchError:', fetchError?.message)
      return Response.json({ error: 'Non autorisé.' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('reservations')
      .update({ status })
      .eq('id', id)

    if (error) {
      return Response.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
    }

    console.log('[venue/patch] status updated — fetching resa for emails, id:', id)

    // ── Fetch full reservation + RP profile for emails ────────
    try {
      const { data: resa } = await supabaseAdmin
        .from('reservations')
        .select('*')
        .eq('id', id)
        .single()

      if (resa) {
        // Fetch RP profile for email + display name + whatsapp
        let rpEmail: string | undefined
        let rpDisplayName: string | undefined
        let rpWhatsapp: string | undefined
        if (resa.rp_slug) {
          const { data: rpProfile } = await supabaseAdmin
            .from('rp_profiles')
            .select('email, display_name, whatsapp')
            .eq('slug', resa.rp_slug)
            .single()
          rpEmail = rpProfile?.email
          rpDisplayName = rpProfile?.display_name
          rpWhatsapp = rpProfile?.whatsapp
        }

        const emailData = {
          firstName: resa.first_name,
          lastName: resa.last_name,
          email: resa.email,
          phone: resa.phone,
          establishment: resa.establishment,
          destination: resa.destination,
          date: resa.date,
          time: resa.time,
          guests: resa.guests,
          occasion: resa.occasion,
          specialRequests: resa.special_requests,
          status: status as 'confirmed' | 'declined',
          venueName: host.venue_name,
          rpEmail,
          rpDisplayName,
          rpWhatsapp,
        }

        console.log('[venue/patch] sending emails — client:', resa.email, '| rp:', rpEmail || '(none)')

        // Send to client and RP in parallel (non-blocking)
        const [clientResult, rpResult] = await Promise.allSettled([
          sendVenueStatusToClient(emailData),
          sendVenueStatusToRP(emailData),
        ])
        if (clientResult.status === 'rejected') {
          console.error('[venue/patch] sendVenueStatusToClient failed:', clientResult.reason)
        }
        if (rpResult.status === 'rejected') {
          console.error('[venue/patch] sendVenueStatusToRP failed:', rpResult.reason)
        }
      }
    } catch (emailErr) {
      console.error('[venue/patch] email error (non-bloquant):', emailErr)
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
