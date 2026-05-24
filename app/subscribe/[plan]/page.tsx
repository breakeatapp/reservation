'use client'

import { useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

// ── Stripe init ──────────────────────────────────────────────
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// ── Plan data ────────────────────────────────────────────────
const PLAN_INFO: Record<string, {
  label: string; price: string; amount: number; currency: string; color: string; features: string[]
}> = {
  rp: {
    label: 'Itinera RP', price: '19,90 €', amount: 1990, currency: 'eur',
    color: '#6E5BFF',
    features: [
      'Réservations illimitées',
      'Page concierge personnalisée',
      'Gestion clients & notes VIP',
      'Connexion aux établissements partenaires',
      'Accès prioritaire aux nouvelles fonctionnalités',
    ],
  },
  venue: {
    label: 'Itinera Venue', price: '49,90 €', amount: 4990, currency: 'eur',
    color: '#10B981',
    features: [
      'Réservations illimitées',
      'Dashboard établissement complet',
      'Connexion concierges partenaires',
      'Statistiques & historique',
      'Accès prioritaire aux nouvelles fonctionnalités',
    ],
  },
  group: {
    label: 'Itinera Group', price: '149,90 €', amount: 14990, currency: 'eur',
    color: '#F59E0B',
    features: [
      'Gestion multi-établissements illimitée',
      'Concierges partenaires à l\'échelle du groupe',
      'Statistiques par RP & par établissement',
      'Dashboard groupe centralisé',
      'Accès prioritaire aux nouvelles fonctionnalités',
    ],
  },
}

// ── Checkout Form ────────────────────────────────────────────
function CheckoutForm({
  plan, slug, planInfo,
}: {
  plan: string; slug: string; planInfo: (typeof PLAN_INFO)[string]
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Promo code
  const [promoInput, setPromoInput] = useState('')
  const [promoApplied, setPromoApplied] = useState<{ code: string; label: string } | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    setPromoError('')
    setPromoApplied(null)
    try {
      const res = await fetch(`/api/stripe/validate-promo?code=${encodeURIComponent(promoInput.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setPromoError(data.error || 'Code invalide.')
      } else {
        setPromoApplied({ code: promoInput.trim(), label: data.label })
      }
    } catch {
      setPromoError('Erreur réseau.')
    } finally {
      setPromoLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError('')

    // 1. Valider le formulaire Stripe
    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || 'Erreur de validation.')
      setLoading(false)
      return
    }

    // 2. Créer la subscription côté serveur (avec promo si applicable)
    let clientSecret: string | null = null
    try {
      const res = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          profileSlug: slug,
          promoCode: promoApplied?.code ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création de l\'abonnement.')
        setLoading(false)
        return
      }
      clientSecret = data.clientSecret
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setLoading(false)
      return
    }

    if (!clientSecret) {
      setError('Impossible de créer le paiement.')
      setLoading(false)
      return
    }

    // 3. Confirmer le paiement
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/subscribe/success?plan=${plan}&slug=${slug}`,
      },
    })

    if (confirmError) {
      setError(confirmError.message || 'Paiement refusé.')
      setLoading(false)
    }
  }

  // Gestion Express Checkout (Apple Pay / Google Pay)
  const handleExpressConfirm = async () => {
    if (!stripe || !elements) return
    setLoading(true)
    setError('')

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || 'Erreur de validation.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/stripe/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, profileSlug: slug, promoCode: promoApplied?.code ?? null }),
    })
    const data = await res.json()
    if (!res.ok || !data.clientSecret) {
      setError(data.error || 'Impossible de créer le paiement. Veuillez réessayer.')
      setLoading(false)
      return
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      clientSecret: data.clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/subscribe/success?plan=${plan}&slug=${slug}`,
      },
      redirect: 'if_required',
    })

    if (confirmError) {
      // Paiement refusé
      setError(confirmError.message || 'Paiement refusé.')
      setLoading(false)
    } else {
      // Paiement Apple Pay / Google Pay réussi → redirection vers succès
      window.location.href = `${window.location.origin}/subscribe/success?plan=${plan}&slug=${slug}`
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Apple Pay / Google Pay ── */}
      <div>
        <ExpressCheckoutElement
          onConfirm={handleExpressConfirm}
          options={{
            buttonTheme: { applePay: 'black', googlePay: 'black' },
            buttonHeight: 48,
            paymentMethods: {
              applePay: 'always',
              googlePay: 'always',
              amazonPay: 'never',
              paypal: 'never',
              link: 'never',
            },
          }}
        />
      </div>

      {/* Séparateur */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] text-white/25 uppercase tracking-widest">ou</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* ── Code promo ── */}
      <div>
        <p className="text-[9px] tracking-[0.4em] uppercase text-white/30 mb-2">Code promo</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoInput}
            onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); setPromoApplied(null) }}
            placeholder="ITINERA6MOIS"
            className="flex-1 bg-[#0F1115] border border-white/10 px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            disabled={promoLoading || !promoInput.trim()}
            className="px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30"
          >
            {promoLoading ? '…' : 'Appliquer'}
          </button>
        </div>

        {promoError && (
          <p className="mt-1.5 text-[11px] text-red-400">{promoError}</p>
        )}
        {promoApplied && (
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-emerald-400">
            <span>✓</span>
            <span>Code <strong>{promoApplied.code}</strong> appliqué — {promoApplied.label}</span>
          </div>
        )}
      </div>

      {/* ── Payment Element ── */}
      <div className="bg-[#0F1115] border border-white/10 p-5">
        <p className="text-[9px] tracking-[0.4em] uppercase text-white/30 mb-4">Moyen de paiement</p>
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-4 text-[10px] tracking-[0.4em] uppercase font-medium transition-all disabled:opacity-50"
        style={{ backgroundColor: planInfo.color, color: '#fff' }}
      >
        {loading ? 'Traitement en cours…' : `Payer ${planInfo.price} / mois`}
      </button>

      <p className="text-center text-[10px] text-white/20 leading-relaxed">
        Abonnement mensuel. Résiliable à tout moment depuis votre dashboard.<br />
        Paiement sécurisé par Stripe — vos données bancaires ne nous sont jamais transmises.
      </p>
    </form>
  )
}

// ── Inner component ──────────────────────────────────────────
function SubscribeContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const plan = params.plan as string
  const slug = searchParams.get('slug') || ''
  const planInfo = PLAN_INFO[plan]

  if (!planInfo) {
    return (
      <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
        <p className="text-white/40 text-sm">Plan introuvable.</p>
      </div>
    )
  }

  // Stripe Elements — mode deferred (pas besoin de client_secret au chargement)
  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: planInfo.color,
      colorBackground: '#0F1115',
      colorText: '#F5F7FA',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '2px',
      fontSizeBase: '13px',
    },
    rules: {
      '.Input': { border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#181C23' },
      '.Input:focus': { border: `1px solid ${planInfo.color}`, boxShadow: 'none' },
      '.Tab': { border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#181C23' },
      '.Tab--selected': { border: `1px solid ${planInfo.color}`, backgroundColor: '#181C23' },
      '.Label': { color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' },
    },
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F7FA]">
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div>
          <span className="text-[8px] tracking-[0.5em] text-white/20 uppercase block">Itinera</span>
          <span className="text-lg text-white tracking-wide">ITINERA</span>
        </div>
        <button
          onClick={() => router.back()}
          className="text-white/30 text-[10px] tracking-[0.2em] uppercase hover:text-white/60 transition-colors"
        >
          ← Retour
        </button>
      </nav>

      <main className="max-w-4xl mx-auto px-5 py-12 grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* Left — Plan details */}
        <div>
          <p className="text-[9px] tracking-[0.5em] uppercase mb-2" style={{ color: planInfo.color }}>
            Abonnement
          </p>
          <h1 className="text-3xl font-light tracking-wide mb-1">{planInfo.label}</h1>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="text-4xl font-light">{planInfo.price}</span>
            <span className="text-white/30 text-sm">/ mois</span>
          </div>

          <div className="space-y-3 mb-10">
            {planInfo.features.map((f) => (
              <div key={f} className="flex items-start gap-3">
                <span className="text-lg leading-none mt-0.5" style={{ color: planInfo.color }}>✓</span>
                <span className="text-sm text-white/70 leading-relaxed">{f}</span>
              </div>
            ))}
          </div>

          <div className="border border-white/8 bg-[#181C23] px-5 py-4">
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/30 mb-1">Garantie</p>
            <p className="text-xs text-white/50 leading-relaxed">
              Résiliez à tout moment depuis votre dashboard, sans engagement ni frais supplémentaires.
            </p>
          </div>
        </div>

        {/* Right — Payment */}
        <div>
          <div className="bg-[#181C23] border border-white/8 p-7">
            <p className="text-[9px] tracking-[0.4em] uppercase text-white/30 mb-6">Paiement sécurisé</p>

            <Elements
              stripe={stripePromise}
              options={{
                mode: 'subscription',
                amount: planInfo.amount,
                currency: planInfo.currency,
                appearance,
              }}
            >
              <CheckoutForm plan={plan} slug={slug} planInfo={planInfo} />
            </Elements>
          </div>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-6 mt-5">
            <div className="flex items-center gap-1.5 text-white/20">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-[10px] tracking-wider uppercase">Paiement sécurisé</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/20">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
              <span className="text-[10px] tracking-wider uppercase">Stripe</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Default export with Suspense ─────────────────────────────
export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#6E5BFF] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SubscribeContent />
    </Suspense>
  )
}
