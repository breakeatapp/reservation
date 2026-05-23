import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PLAN_TABLE, PlanType } from '@/lib/stripe'

// GET /api/stripe/subscription-status?plan=rp&slug=xxx
// Returns: { status: 'free' | 'active' | 'past_due' | 'canceled' | 'incomplete' }
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

  const { data } = await supabaseAdmin
    .from(table)
    .select('subscription_status, stripe_customer_id')
    .eq('slug', slug)
    .maybeSingle()

  return NextResponse.json({
    status: data?.subscription_status ?? 'free',
    hasCustomer: !!data?.stripe_customer_id,
  })
}
