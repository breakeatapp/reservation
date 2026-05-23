import { NextResponse } from 'next/server'
import { stripe, PLAN_TABLE, PlanType } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/stripe/customer-portal
// Body: { plan: 'rp' | 'venue' | 'group', profileSlug: string, returnUrl: string }
// Returns: { url: string }
export async function POST(req: Request) {
  try {
    const { plan, profileSlug, returnUrl } = await req.json()

    if (!plan || !profileSlug) {
      return NextResponse.json({ error: 'plan et profileSlug requis.' }, { status: 400 })
    }

    const table = PLAN_TABLE[plan as PlanType]
    if (!table) {
      return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 })
    }

    const { data } = await supabaseAdmin
      .from(table)
      .select('stripe_customer_id')
      .eq('slug', profileSlug)
      .single()

    if (!data?.stripe_customer_id) {
      return NextResponse.json({ error: 'Aucun abonnement trouvé pour ce profil.' }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: returnUrl || 'https://itinera.click',
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne.'
    console.error('[customer-portal]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
