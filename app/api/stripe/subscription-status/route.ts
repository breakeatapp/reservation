import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PLAN_TABLE, PlanType } from '@/lib/stripe'

// GET /api/stripe/subscription-status?plan=rp|venue|group&slug=xxx
// Returns: { status, hasCustomer, coveredByGroup?, groupName? }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const plan = searchParams.get('plan') as PlanType | null
  const slug = searchParams.get('slug')?.trim()

  if (!plan || !slug) {
    return NextResponse.json({ error: 'plan et slug requis.' }, { status: 400 })
  }

  const table = PLAN_TABLE[plan]
  if (!table) {
    return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 })
  }

  // ── Venue : vérifier si couvert par un groupe actif ──────────
  if (plan === 'venue') {
    const { data: venue } = await supabaseAdmin
      .from('venues_profiles')
      .select('subscription_status, stripe_customer_id, group_id')
      .eq('slug', slug)
      .maybeSingle()

    // Si venue appartient à un groupe → vérifier le statut du groupe
    if (venue?.group_id) {
      const { data: group } = await supabaseAdmin
        .from('hospitality_groups')
        .select('group_name, subscription_status')
        .eq('id', venue.group_id)
        .maybeSingle()

      if (group?.subscription_status === 'active') {
        return NextResponse.json({
          status: 'active',
          coveredByGroup: true,
          groupName: group.group_name,
          hasCustomer: false,
        })
      }
    }

    return NextResponse.json({
      status: venue?.subscription_status ?? 'free',
      hasCustomer: !!venue?.stripe_customer_id,
      coveredByGroup: false,
    })
  }

  // ── RP et Group : logique standard ──────────────────────────
  const { data } = await supabaseAdmin
    .from(table)
    .select('subscription_status, stripe_customer_id')
    .eq('slug', slug)
    .maybeSingle()

  return NextResponse.json({
    status: data?.subscription_status ?? 'free',
    hasCustomer: !!data?.stripe_customer_id,
    coveredByGroup: false,
  })
}
