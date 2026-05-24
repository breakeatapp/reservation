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

// Récupère l'email du profil depuis Supabase
async function getProfileEmail(planType: PlanType, profileSlug: string): Promise<string | null> {
  const table = PLAN_TABLE[planType]
  const { data } = await supabaseAdmin
    .from(table)
    .select('email')
    .eq('slug', profileSlug)
    .maybeSingle()
  return data?.email ?? null
}

// Email de bienvenue à l'abonné
async function sendWelcomeEmail(subscriberEmail: string, planType: PlanType, profileSlug: string) {
  if (!process.env.RESEND_API_KEY) return
  const PLAN_COLORS: Record<PlanType, string> = { rp: '#6E5BFF', venue: '#10B981', group: '#F59E0B' }
  const color = PLAN_COLORS[planType]
  try {
    await resend.emails.send({
      from: 'Itinera <contact@itinera.click>',
      to: subscriberEmail,
      subject: `✦ Votre abonnement Itinera est actif`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0F1115;color:#F5F7FA;padding:32px;border-radius:8px;">
          <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:${color};margin:0 0 8px">Itinera</p>
          <h1 style="font-size:24px;font-weight:300;margin:0 0 8px">✦ Bienvenue</h1>
          <p style="color:#999;font-size:13px;margin:0 0 24px">Votre abonnement est maintenant actif.</p>
          <div style="background:#181C23;border:1px solid #2a2a2a;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:#999">Plan souscrit</p>
            <p style="margin:0;font-size:16px;font-weight:500;color:${color}">${PLAN_LABELS[planType]}</p>
          </div>
          <p style="font-size:13px;color:#999;line-height:1.6;margin:0 0 24px">
            Toutes les fonctionnalités de votre plan sont désormais disponibles.<br>
            Vous pouvez gérer ou résilier votre abonnement à tout moment depuis votre dashboard.
          </p>
          <a href="https://itinera.click" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 24px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">
            Accéder à mon dashboard →
          </a>
          <p style="margin-top:24px;font-size:11px;color:#444">
            Un reçu de paiement vous a également été envoyé par Stripe.<br>
            Questions ? Répondez à cet email.
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[webhook] sendWelcomeEmail error:', err)
  }
}

// Notification admin + email abonné lors de la résiliation
async function handleCancellation(planType: PlanType, profileSlug: string, subscriberEmail?: string) {
  const managerEmail = process.env.MANAGER_EMAIL
  if (!process.env.RESEND_API_KEY) return

  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  // 1. Email à l'admin
  if (managerEmail) {
    try {
      await resend.emails.send({
        from: 'Itinera <contact@itinera.click>',
        to: managerEmail,
        subject: `🔴 Résiliation — ${PLAN_LABELS[planType]}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0F1115;color:#F5F7FA;padding:32px;border-radius:8px;">
            <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;margin:0 0 8px">Itinera · Résiliation</p>
            <h1 style="font-size:22px;font-weight:300;margin:0 0 24px">🔴 Abonnement résilié</h1>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:8px 0;color:#999;border-bottom:1px solid #222">Plan</td><td style="padding:8px 0;border-bottom:1px solid #222">${PLAN_LABELS[planType]}</td></tr>
              <tr><td style="padding:8px 0;color:#999;border-bottom:1px solid #222">Profil</td><td style="padding:8px 0;border-bottom:1px solid #222;font-family:monospace">${profileSlug}</td></tr>
              ${subscriberEmail ? `<tr><td style="padding:8px 0;color:#999">Email</td><td style="padding:8px 0">${subscriberEmail}</td></tr>` : ''}
            </table>
            <p style="margin-top:24px;font-size:11px;color:#555">Itinera · ${date}</p>
          </div>
        `,
      })
    } catch (err) {
      console.error('[webhook] handleCancellation admin email error:', err)
    }
  }

  // 2. Email de confirmation à l'abonné
  if (subscriberEmail) {
    try {
      await resend.emails.send({
        from: 'Itinera <contact@itinera.click>',
        to: subscriberEmail,
        subject: `Votre abonnement Itinera a été résilié`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0F1115;color:#F5F7FA;padding:32px;border-radius:8px;">
            <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#999;margin:0 0 8px">Itinera</p>
            <h1 style="font-size:22px;font-weight:300;margin:0 0 8px">Résiliation confirmée</h1>
            <p style="color:#999;font-size:13px;margin:0 0 24px">Votre abonnement ${PLAN_LABELS[planType]} a bien été résilié.</p>
            <div style="background:#181C23;border:1px solid #2a2a2a;padding:16px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
                Votre accès reste actif jusqu'à la fin de la période en cours.<br>
                Après cette date, votre compte passera en mode gratuit.
              </p>
            </div>
            <p style="font-size:13px;color:#999;line-height:1.6;margin:0 0 24px">
              Vous pouvez vous réabonner à tout moment depuis votre dashboard.<br>
              Merci d'avoir utilisé Itinera.
            </p>
            <a href="https://itinera.click" style="display:inline-block;background:#1a1a1a;border:1px solid #333;color:#F5F7FA;text-decoration:none;padding:12px 24px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">
              Mon dashboard →
            </a>
            <p style="margin-top:24px;font-size:11px;color:#444">Itinera · ${date}</p>
          </div>
        `,
      })
    } catch (err) {
      console.error('[webhook] handleCancellation subscriber email error:', err)
    }
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

        // Email admin + email de bienvenue à l'abonné
        const customerEmail: string | undefined = (event.data.object as any).customer_email
          ?? await getProfileEmail(planType, profileSlug)
          ?? undefined
        await Promise.all([
          notifyNewSubscription(planType, profileSlug, customerEmail),
          customerEmail ? sendWelcomeEmail(customerEmail, planType, profileSlug) : Promise.resolve(),
        ])
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

        // Récupérer l'email avant de réinitialiser le profil
        const cancelEmail = await getProfileEmail(planType, profileSlug)

        await updateProfile(planType, profileSlug, {
          subscription_status: 'canceled',
          subscription_tier: 'free',
          subscription_end_date: null,
        })

        // Email admin + email de confirmation à l'abonné
        await handleCancellation(planType, profileSlug, cancelEmail ?? undefined)
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
