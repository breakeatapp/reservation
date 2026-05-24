import { NextResponse } from 'next/server'
import { stripe, PLAN_TABLE, PlanType } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'

// POST /api/stripe/sync-subscription
// Body: { subscriptionId, plan, profileSlug }
// Vérifie directement Stripe et met à jour Supabase + envoie les emails.
// Idempotent : si la sync a déjà été faite, n'envoie pas les emails une 2e fois.

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

const PLAN_LABELS: Record<PlanType, string> = {
  rp:    'Itinera RP — 19,90 € / mois',
  venue: 'Itinera Venue — 49,90 € / mois',
  group: 'Itinera Group — 149,90 € / mois',
}

const PLAN_COLORS: Record<PlanType, string> = {
  rp: '#6E5BFF',
  venue: '#10B981',
  group: '#F59E0B',
}

export async function POST(req: Request) {
  try {
    const { subscriptionId, plan, profileSlug } = await req.json()

    if (!subscriptionId || !plan || !profileSlug) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
    }

    const planType = plan as PlanType
    const table = PLAN_TABLE[planType]
    if (!table) {
      return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 })
    }

    // ── Récupérer la subscription Stripe ────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any

    // ── Vérification de sécurité : la metadata doit correspondre ─
    const meta = subscription.metadata as Record<string, string> | undefined
    if (meta?.profileSlug !== profileSlug || meta?.planType !== planType) {
      console.error('[sync-subscription] metadata mismatch', { meta, profileSlug, planType })
      return NextResponse.json({ error: 'Subscription introuvable.' }, { status: 403 })
    }

    const status: string = subscription.status

    // Seulement si actif ou en période d'essai
    if (status !== 'active' && status !== 'trialing') {
      return NextResponse.json({ synced: false, status })
    }

    // ── Vérifier si déjà synchronisé (idempotence) ──────────────
    const { data: profile } = await supabaseAdmin
      .from(table)
      .select('subscription_status, email')
      .eq('slug', profileSlug)
      .maybeSingle()

    const alreadySynced = profile?.subscription_status === 'active'

    if (!alreadySynced) {
      const periodEnd = subscription.current_period_end
        ? new Date((subscription.current_period_end as number) * 1000).toISOString()
        : null

      // ── Mettre à jour Supabase ────────────────────────────────
      await supabaseAdmin
        .from(table)
        .update({
          subscription_status: 'active',
          subscription_tier: planType,
          subscription_end_date: periodEnd,
          stripe_customer_id: subscription.customer as string,
        })
        .eq('slug', profileSlug)

      // ── Emails (fire-and-forget — on ne bloque pas la réponse) ─
      const subscriberEmail: string | null = profile?.email ?? null
      const managerEmail = process.env.MANAGER_EMAIL

      const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

      if (managerEmail && process.env.RESEND_API_KEY) {
        resend.emails.send({
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
                ${subscriberEmail ? `<tr><td style="padding:8px 0;color:#999">Email</td><td style="padding:8px 0">${subscriberEmail}</td></tr>` : ''}
              </table>
              <p style="margin-top:24px;font-size:11px;color:#555">Itinera · ${date}</p>
            </div>
          `,
        }).catch(err => console.error('[sync-subscription] admin email error:', err))
      }

      if (subscriberEmail && process.env.RESEND_API_KEY) {
        const color = PLAN_COLORS[planType]
        resend.emails.send({
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
              <a href="https://www.itinera.click" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 24px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">
                Accéder à mon dashboard →
              </a>
              <p style="margin-top:24px;font-size:11px;color:#444">
                Un reçu de paiement vous a également été envoyé par Stripe.<br>
                Questions ? Répondez à cet email.
              </p>
            </div>
          `,
        }).catch(err => console.error('[sync-subscription] welcome email error:', err))
      }
    }

    return NextResponse.json({ synced: true, alreadySynced, status })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne.'
    console.error('[sync-subscription]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
