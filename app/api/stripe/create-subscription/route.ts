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
      },
      metadata: { planType, profileSlug },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscription as any

    // ── Chercher le clientSecret dans tous les endroits possibles ──
    // L'API Stripe 2026 a changé la structure — on teste plusieurs chemins
    let clientSecret: string | null = null

    // Chemin 1 : pending_setup_intent (premier paiement via SetupIntent)
    if (sub.pending_setup_intent) {
      const siId = typeof sub.pending_setup_intent === 'string'
        ? sub.pending_setup_intent
        : sub.pending_setup_intent?.id
      if (siId) {
        const si = await stripe.setupIntents.retrieve(siId)
        clientSecret = (si as any).client_secret ?? null
      }
    }

    // Chemin 2 : latest_invoice → payment_intent
    if (!clientSecret) {
      const invoiceId: string | null =
        typeof sub.latest_invoice === 'string'
          ? sub.latest_invoice
          : sub.latest_invoice?.id ?? null

      if (invoiceId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = await (stripe.invoices as any).retrieve(invoiceId, {
          expand: ['payment_intent', 'payments'],
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inv = invoice as any

        clientSecret =
          inv?.payment_intent?.client_secret
          ?? inv?.payments?.data?.[0]?.payment_intent?.client_secret
          ?? null

        // Si payment_intent est un ID string, on le récupère
        if (!clientSecret && typeof inv?.payment_intent === 'string') {
          const pi = await stripe.paymentIntents.retrieve(inv.payment_intent)
          clientSecret = (pi as any).client_secret ?? null
        }
      }
    }

    if (!clientSecret) {
      console.error('[stripe/create-subscription] clientSecret introuvable — sub:', {
        id: sub.id,
        status: sub.status,
        hasPendingSetupIntent: !!sub.pending_setup_intent,
        latestInvoice: sub.latest_invoice,
      })
      return NextResponse.json({ error: 'Impossible de créer le paiement. Contactez le support.' }, { status: 500 })
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
