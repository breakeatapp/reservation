import { NextResponse } from 'next/server'
import { stripe, PLAN_TABLE, PlanType } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

const PLAN_LABELS: Record<PlanType, string> = {
  rp:    'Itinera RP — 19,90 € / mois',
  venue: 'Itinera Venue — 49,90 € / mois',
  group: 'Itinera Group — 149,90 € / mois',
}

async function notifyNewSubscription(planType: PlanType, profileSlug: string, customerEmail?: string) {
  const managerEmail = process.env.MANAGER_EMAIL
  if (!managerEmail || !process.env.RESEND_API_KEY) return
  try {
    await resend.emails.send({
      from: 'Itinera <contact@itinera.click>',
      to: managerEmail,
      subject: `💳 Nouvel abonnement — ${PLAN_LABELS[planType]}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0F1115;color:#F5F7FA;padding:32px;border-radius:8px;">
          <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#6E5BFF;margin:0 0 8px">Itinera · Nouvel abonnement</p>
          <h1 style="font-size:22px;font-weight:300;margin:0 0 24px">💳 Paiement reçu</h1>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr><td style="padding:8px 0;color:#999;border-bottom:1px solid #222">Plan</td><td style="padding:8px 0;border-bottom:1px solid #222"><strong>${PLAN_LABELS[planType]}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#999;border-bottom:1px solid #222">Profil</td><td style="padding:8px 0;border-bottom:1px solid #222;font-family:monospace">${profileSlug}</td></tr>
            ${customerEmail ? `<tr><td style="padding:8px 0;color:#999">Email</td><td style="padding:8px 0">${customerEmail}</td></tr>` : ''}
          </table>
          <p style="margin-top:24px;font-size:11px;color:#555">Itinera · ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[webhook] notifyNewSubscription error:', err)
  }
}

async function notifyPaymentFailed(planType: PlanType, profileSlug: string) {
  const managerEmail = process.env.MANAGER_EMAIL
  if (!managerEmail || !process.env.RESEND_API_KEY) return
  try {
    await resend.emails.send({
      from: 'Itinera <contact@itinera.click>',
      to: managerEmail,
      subject: `⚠️ Paiement échoué — ${PLAN_LABELS[planType]}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0F1115;color:#F5F7FA;padding:32px;border-radius:8px;">
          <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;margin:0 0 8px">Itinera · Alerte paiement</p>
          <h1 style="font-size:22px;font-weight:300;margin:0 0 24px">⚠️ Paiement échoué</h1>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr><td style="padding:8px 0;color:#999;border-bottom:1px solid #222">Plan</td><td style="padding:8px 0;border-bottom:1px solid #222">${PLAN_LABELS[planType]}</td></tr>
            <tr><td style="padding:8px 0;color:#999">Profil</td><td style="padding:8px 0;font-family:monospace">${profileSlug}</td></tr>
          </table>
          <p style="margin-top:24px;font-size:11px;color:#555">Itinera · ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[webhook] notifyPaymentFailed error:', err)
  }
}

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

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET non configuré')
    return NextResponse.json({ error: 'Webhook non configuré.' }, { status: 500 })
  }

  if (!signature) {
    console.error('[webhook] stripe-signature manquant')
    return NextResponse.json({ error: 'Signature manquante.' }, { status: 400 })
  }

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] Invalid signature:', msg)
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
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

        // Notifier l'admin
        const customerEmail = (event.data.object as any).customer_email ?? undefined
        await notifyNewSubscription(planType, profileSlug, customerEmail)
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

        // Notifier l'admin
        await notifyPaymentFailed(planType, profileSlug)
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
