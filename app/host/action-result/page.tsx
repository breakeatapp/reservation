'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ActionResultContent() {
  const params = useSearchParams()
  const status = params.get('status')
  const error = params.get('error')
  const already = params.get('already')
  const establishment = params.get('establishment') || ''
  const guest = params.get('guest') || ''

  const isConfirmed = status === 'confirmed'
  const isDeclined = status === 'declined'
  const isAlready = already === 'true'

  if (error) {
    const messages: Record<string, string> = {
      missing: 'Paramètres manquants.',
      invalid: 'Action invalide.',
      unauthorized: 'Lien invalide ou expiré.',
      notfound: 'Réservation introuvable.',
      update: 'Erreur lors de la mise à jour. Veuillez réessayer.',
    }
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-6">⚠️</div>
          <h1 className="text-white text-2xl font-light italic mb-4">Une erreur est survenue</h1>
          <p className="text-[#888] text-sm leading-relaxed">{messages[error] || 'Erreur inconnue.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full">

        <div className={`border-t-2 ${isConfirmed ? 'border-green-500' : 'border-red-500'} bg-[#141414] p-10 text-center`}>
          <div className="text-5xl mb-6">{isConfirmed ? '✅' : '❌'}</div>

          <div className={`text-xs tracking-[0.3em] uppercase mb-4 ${isConfirmed ? 'text-green-400' : 'text-red-400'}`}>
            {isAlready
              ? 'Déjà traitée'
              : isConfirmed
              ? 'Réservation confirmée'
              : 'Réservation déclinée'}
          </div>

          <h1 className="text-white text-2xl font-light italic mb-6">
            {isAlready
              ? 'Cette réservation a déjà été traitée'
              : isConfirmed
              ? 'La réservation est confirmée'
              : 'La réservation a été déclinée'}
          </h1>

          {(guest || establishment) && (
            <div className="bg-[#1e1e1e] border border-white/5 p-4 mb-6 text-left">
              {guest && (
                <p className="text-[#9a9a9a] text-sm mb-1">
                  <span className="text-[#666] text-[9px] tracking-widest uppercase block mb-1">Client</span>
                  {guest}
                </p>
              )}
              {establishment && (
                <p className="text-[#9a9a9a] text-sm mt-3">
                  <span className="text-[#666] text-[9px] tracking-widest uppercase block mb-1">Établissement</span>
                  {establishment}
                </p>
              )}
            </div>
          )}

          <p className="text-[#555] text-xs leading-relaxed">
            {isAlready
              ? `Le statut actuel est : ${status === 'confirmed' ? 'confirmée' : 'déclinée'}.`
              : isConfirmed
              ? 'Le client et son concierge ont été notifiés automatiquement.'
              : 'Le client et son concierge ont été notifiés. Votre concierge va proposer une alternative.'}
          </p>
        </div>

        <p className="text-[#333] text-[10px] text-center mt-6 tracking-widest uppercase">
          ITINERA — Système de réservation privé
        </p>
      </div>
    </div>
  )
}

export default function ActionResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#555] text-sm">Chargement…</div>
      </div>
    }>
      <ActionResultContent />
    </Suspense>
  )
}
