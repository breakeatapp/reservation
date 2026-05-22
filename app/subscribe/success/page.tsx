'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const PLAN_INFO: Record<string, { label: string; color: string; dashboardPath: (slug: string) => string }> = {
  rp: {
    label: 'Itinera RP',
    color: '#6E5BFF',
    dashboardPath: (slug) => `/${slug}/dashboard`,
  },
  venue: {
    label: 'Itinera Venue',
    color: '#10B981',
    dashboardPath: (slug) => `/host/${slug}`,
  },
  group: {
    label: 'Itinera Group',
    color: '#F59E0B',
    dashboardPath: (slug) => `/group/${slug}`,
  },
}

export default function SubscribeSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const plan = searchParams.get('plan') || ''
  const slug = searchParams.get('slug') || ''
  const planInfo = PLAN_INFO[plan]

  const [countdown, setCountdown] = useState(8)

  useEffect(() => {
    if (!planInfo || !slug) return
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          router.push(planInfo.dashboardPath(slug))
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [planInfo, slug, router])

  if (!planInfo) {
    return (
      <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
        <p className="text-white/40 text-sm">Page introuvable.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F7FA] flex flex-col items-center justify-center px-5">

      {/* Checkmark animé */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
        style={{ backgroundColor: `${planInfo.color}20`, border: `1px solid ${planInfo.color}40` }}
      >
        <svg className="w-10 h-10" fill="none" stroke={planInfo.color} strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Content */}
      <div className="text-center max-w-sm">
        <p className="text-[9px] tracking-[0.5em] uppercase mb-3" style={{ color: planInfo.color }}>
          Abonnement activé
        </p>
        <h1 className="text-3xl font-light tracking-wide mb-4">
          Bienvenue sur {planInfo.label}
        </h1>
        <p className="text-white/40 text-sm leading-relaxed mb-10">
          Votre paiement a bien été reçu. Votre compte est maintenant actif.<br />
          Toutes les fonctionnalités sont désormais disponibles.
        </p>

        {/* Redirect countdown */}
        <div className="bg-[#181C23] border border-white/8 px-6 py-4 mb-6">
          <p className="text-white/30 text-xs">
            Redirection vers votre dashboard dans{' '}
            <span className="text-white font-medium">{countdown}s</span>
          </p>
        </div>

        {/* Manual button */}
        <button
          onClick={() => router.push(planInfo.dashboardPath(slug))}
          className="w-full py-4 text-[10px] tracking-[0.4em] uppercase font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: planInfo.color, color: '#fff' }}
        >
          Accéder au dashboard →
        </button>
      </div>

      {/* Footer note */}
      <p className="mt-12 text-[10px] text-white/15 text-center max-w-xs leading-relaxed">
        Un reçu de paiement a été envoyé à votre adresse email par Stripe.<br />
        Pour gérer votre abonnement, rendez-vous dans les paramètres de votre dashboard.
      </p>
    </div>
  )
}
