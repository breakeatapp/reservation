import { NextResponse } from 'next/server'
import { stripe, PRICE_IDS } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/stripe/debug?slug=TON_SLUG
// Montre exactement ce que Stripe retourne — à supprimer après debug
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug requis' }, { status: 400 })
  }

  try {
    // Récupère le profil RP
    const { data: profile } = await supabaseAdmin
      .from('rp_profiles')
      .select('id, email, display_name, stripe_customer_id')
      .eq('slug', slug)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable', slug })
    }

    // Crée un client test si besoin
    let customerId = profile.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.display_name,
        metadata: { planType: 'rp', profileSlug: slug },
      })
      customerId = customer.id
    }

    // Crée une subscription test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = await (stripe.subscriptions as any).create({
      customer: customerId,
      items: [{ price: PRICE_IDS.rp }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: { planType: 'rp', profileSlug: slug, debug: 'true' },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscription as any

    // Récupère la facture si elle existe
    let invoiceData: any = null
    const invoiceId = typeof sub.latest_invoice === 'string'
      ? sub.latest_invoice
      : sub.latest_invoice?.id ?? null

    if (invoiceId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoiceData = await (stripe.invoices as any).retrieve(invoiceId, {
        expand: ['payment_intent', 'payments'],
      })
    }

    // Retourne tout pour diagnostic
    return NextResponse.json({
      subscription_id: sub.id,
      subscription_status: sub.status,
      // Clés importantes à inspecter
      client_secret_on_sub: sub.client_secret ?? null,
      pending_setup_intent: sub.pending_setup_intent ?? null,
      latest_invoice_id: invoiceId,
      invoice_payment_intent_type: typeof invoiceData?.payment_intent,
      invoice_payment_intent_client_secret: invoiceData?.payment_intent?.client_secret ?? null,
      invoice_payments: invoiceData?.payments ?? null,
      // Tous les champs de la sub pour inspection complète
      all_sub_keys: Object.keys(sub),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}
