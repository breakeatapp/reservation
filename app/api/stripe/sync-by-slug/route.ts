import { NextResponse } from 'next/server'
import { stripe, PLAN_TABLE, PlanType } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'

// POST /api/stripe/sync-by-slug
// Body: { plan: 'rp' | 'venue' | 'group', profileSlug: string }
// Cherche l'abonnement Stripe actif via stripe_customer_id stocké en base.
// Plus robuste que sync-subscription : pas de metadata check, juste le customer_id.

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
    const { plan, profileSlug } = await req.json()

    if (!plan || !profileSlug) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
    }

    const planType = plan as PlanType
    const table = PLAN_TABLE[planType]
    if (!table) {
      return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 })
    }

    // ── Récupérer le profil Supabase ─────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from(table)
      .select('stripe_customer_id, subscription_status, email')
      .eq('slug', profileSlug)
      .maybeSingle()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ synced: false, reason: 'no_customer' })
    }

    const customerId = profile.stripe_customer_id

    // ── Chercher l'abonnement actif dans Stripe ──────────────────
    const [activeSubs, trialingSubs, pastDueSubs] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 5 }),
      stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 5 }),
      stripe.subscriptions.list({ customer: customerId, status: 'past_due', limit: 5 }),
    ])

    const allSubs = [...activeSubs.data, ...trialingSubs.data, ...pastDueSubs.data]

    if (allSubs.length === 0) {
      // Pas d'abonnement actif — on vérifie si Supabase a un status incorrect
      if (profile.subscription_status === 'active') {
        // Mettre à jour Supabase avec cancelled
        await supabaseAdmin
          .from(table)
          .update({ subscription_status: 'cancelled' })
          .eq('slug', profileSlug)
        return NextResponse.json({ synced: true, status: 'cancelled', reason: 'no_active_sub_in_stripe' })
      }
      return NextResponse.json({ synced: false, reason: 'no_active_sub_in_stripe' })
    }

    // Prendre le premier abonnement trouvé (actif > trialing > past_due)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = allSubs[0] as any
    const status: string = subscription.status

    const periodEnd = subscription.current_period_end
      ? new Date((subscription.current_period_end as number) * 1000).toISOString()
      : null

    const alreadySynced = profile.subscription_status === 'active'

    // ── Mettre à jour Supabase ────────────────────────────────────
    await supabaseAdmin
      .from(table)
      .update({
        subscription_status: status === 'active' || status === 'trialing' ? 'active' : status,
        subscription_tier: planType,
        subscription_end_date: periodEnd,
        stripe_customer_id: customerId,
      })
      .eq('slug', profileSlug)

    // ── Emails (seulement si pas encore synchronisé) ─────────────
    if (!alreadySynced && (status === 'active' || status === 'trialing')) {
      const subscriberEmail: string | null = profile.email ?? null
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
        }).catch(err => console.error('[sync-by-slug] admin email error:', err))
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
        }).catch(err => console.error('[sync-by-slug] welcome email error:', err))
      }
    }

    return NextResponse.json({ synced: true, alreadySynced, status })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne.'
    console.error('[sync-by-slug]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
