import { NextResponse } from 'next/server'
import { stripe, PLAN_TABLE, PlanType } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Map Stripe subscription status → notre status
function mapStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':             return 'active'
    case 'trialing':           return 'active'
    case 'past_due':           return 'past_due'
    case 'unpaid':             return 'past_due'
    case 'canceled':           return 'canceled'
    case 'incomplete':         return 'incomplete'
    case 'incomplete_expired': return 'canceled'
    default:                   return stripeStatus
  }
}

async function updateProfile(planType: PlanType, profileSlug: string, updates: Record<string, unknown>) {
  const table = PLAN_TABLE[planType]
  const { error } = await supabaseAdmin
    .from(table)
    .update(updates)
    .eq('slug', profileSlug)

  if (error) {
    console.error(`[webhook] update ${table} slug=${profileSlug}`, error)
  }
}

// POST /api/stripe/webhook
export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // ── Signature verification ──────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any

  if (webhookSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[webhook] Invalid signature:', msg)
      return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
    }
  } else {
    // Dev / pas encore configuré
    try {
      event = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
  }

  // ── Handle events ──────────────────────────────────────────
  try {
    switch (event.type) {

      // ── Paiement réussi → abonnement actif ─────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription ?? invoice.parent?.subscription_details?.subscription

        if (!subscriptionId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
        const sub = subscription as unknown as Record<string, unknown>
        const meta = sub.metadata as Record<string, string> | undefined
        const planType = meta?.planType as PlanType | undefined
        const profileSlug = meta?.profileSlug

        if (!planType || !profileSlug) break

        const periodEnd = (sub.current_period_end as number)
          ? new Date((sub.current_period_end as number) * 1000).toISOString()
          : null

        await updateProfile(planType, profileSlug, {
          subscription_status: 'active',
          subscription_tier: planType,
          subscription_end_date: periodEnd,
          stripe_customer_id: sub.customer,
        })
        break
      }

      // ── Paiement échoué ─────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription ?? invoice.parent?.subscription_details?.subscription

        if (!subscriptionId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
        const sub = subscription as unknown as Record<string, unknown>
        const meta = sub.metadata as Record<string, string> | undefined
        const planType = meta?.planType as PlanType | undefined
        const profileSlug = meta?.profileSlug

        if (!planType || !profileSlug) break

        await updateProfile(planType, profileSlug, {
          subscription_status: 'past_due',
        })
        break
      }

      // ── Abonnement mis à jour (renouvellement, changement de statut) ──
      case 'customer.subscription.updated': {
        const sub = event.data.object as Record<string, unknown>
        const meta = sub.metadata as Record<string, string> | undefined
        const planType = meta?.planType as PlanType | undefined
        const profileSlug = meta?.profileSlug

        if (!planType || !profileSlug) break

        const periodEnd = (sub.current_period_end as number)
          ? new Date((sub.current_period_end as number) * 1000).toISOString()
          : null

        await updateProfile(planType, profileSlug, {
          subscription_status: mapStatus(sub.status as string),
          subscription_tier: planType,
          subscription_end_date: periodEnd,
        })
        break
      }

      // ── Abonnement résilié ──────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Record<string, unknown>
        const meta = sub.metadata as Record<string, string> | undefined
        const planType = meta?.planType as PlanType | undefined
        const profileSlug = meta?.profileSlug

        if (!planType || !profileSlug) break

        await updateProfile(planType, profileSlug, {
          subscription_status: 'canceled',
          subscription_tier: 'free',
          subscription_end_date: null,
        })
        break
      }

      default:
        // Évènement non géré
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] handler error:', msg)
    return NextResponse.json({ error: 'Webhook handler error.' }, { status: 500 })
  }
}
