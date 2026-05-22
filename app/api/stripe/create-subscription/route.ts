import { NextResponse } from 'next/server'
import { stripe, PRICE_IDS, PLAN_TABLE, PlanType } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Stripe from 'stripe'

// POST /api/stripe/create-subscription
// Body: { plan: 'rp' | 'venue' | 'group', profileSlug: string }
// Returns: { clientSecret: string, subscriptionId: string }
export async function POST(req: Request) {
  try {
    const { plan, profileSlug } = await req.json()

    if (!plan || !PRICE_IDS[plan as PlanType]) {
      return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 })
    }
    if (!profileSlug) {
      return NextResponse.json({ error: 'Profil requis.' }, { status: 400 })
    }

    const planType = plan as PlanType
    const table = PLAN_TABLE[planType]

    // ── Fetch profile ────────────────────────────────────────
    let email: string | null = null
    let displayName: string | null = null
    let profileId: string | null = null
    let existingCustomerId: string | null = null

    if (planType === 'rp') {
      const { data } = await supabaseAdmin
        .from('rp_profiles')
        .select('id, email, display_name, stripe_customer_id, subscription_status')
        .eq('slug', profileSlug)
        .single()
      if (data) {
        email = data.email
        displayName = data.display_name
        profileId = data.id
        existingCustomerId = data.stripe_customer_id
        if (data.subscription_status === 'active') {
          return NextResponse.json({ error: 'Abonnement déjà actif.' }, { status: 400 })
        }
      }
    } else if (planType === 'venue') {
      const { data } = await supabaseAdmin
        .from('venues_profiles')
        .select('id, email, venue_name, stripe_customer_id, subscription_status')
        .eq('slug', profileSlug)
        .single()
      if (data) {
        email = data.email
        displayName = data.venue_name
        profileId = data.id
        existingCustomerId = data.stripe_customer_id
        if (data.subscription_status === 'active') {
          return NextResponse.json({ error: 'Abonnement déjà actif.' }, { status: 400 })
        }
      }
    } else if (planType === 'group') {
      const { data } = await supabaseAdmin
        .from('hospitality_groups')
        .select('id, email, group_name, stripe_customer_id, subscription_status')
        .eq('slug', profileSlug)
        .single()
      if (data) {
        email = data.email
        displayName = data.group_name
        profileId = data.id
        existingCustomerId = data.stripe_customer_id
        if (data.subscription_status === 'active') {
          return NextResponse.json({ error: 'Abonnement déjà actif.' }, { status: 400 })
        }
      }
    }

    if (!email || !profileId) {
      return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
    }

    // ── Create or retrieve Stripe customer ───────────────────
    let customerId = existingCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: displayName || undefined,
        metadata: { planType, profileSlug },
      })
      customerId = customer.id

      // Persist customer ID immediately
      await supabaseAdmin
        .from(table)
        .update({ stripe_customer_id: customerId })
        .eq('id', profileId)
    } else {
      // Check if active subscription already exists in Stripe
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      })
      if (subs.data.length > 0) {
        return NextResponse.json({ error: 'Abonnement déjà actif.' }, { status: 400 })
      }
    }

    // ── Create subscription ──────────────────────────────────
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: PRICE_IDS[planType] }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card', 'link'],
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { planType, profileSlug },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = subscription.latest_invoice as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentIntent = invoice?.payment_intent as any

    const clientSecret: string | null =
      paymentIntent?.client_secret ?? null

    if (!clientSecret) {
      return NextResponse.json({ error: 'Impossible de créer le paiement.' }, { status: 500 })
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
    })
  } catch (err: any) {
    console.error('[stripe/create-subscription]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne.' }, { status: 500 })
  }
}
