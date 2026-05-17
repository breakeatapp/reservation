'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

type Reservation = {
  id: string
  first_name: string
  last_name: string
  establishment: string
  date: string
  time: string
  guests: number
  occasion?: string
  special_requests?: string
  status: string
}

type PageState = 'loading' | 'ready' | 'error' | 'done'

export default function HostConfirmPage() {
  const params = useParams()
  const id = params.id as string

  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [actionLoading, setActionLoading] = useState(false)
  const [resultStatus, setResultStatus] = useState<'confirmed' | 'declined' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/host/confirm/${id}`)
        if (!res.ok) {
          setErrorMsg('Réservation introuvable ou lien invalide.')
          setPageState('error')
          return
        }
        const data = await res.json()
        setReservation(data)
        setPageState('ready')
      } catch {
        setErrorMsg('Erreur réseau. Veuillez réessayer.')
        setPageState('error')
      }
    }
    load()
  }, [id])

  const handleAction = async (status: 'confirmed' | 'declined') => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/host/confirm/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setResultStatus(status)
        setPageState('done')
      } else {
        setErrorMsg('Une erreur est survenue. Veuillez réessayer.')
      }
    } catch {
      setErrorMsg('Erreur réseau. Veuillez réessayer.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F7FA] flex flex-col">

      {/* Navbar */}
      <nav className="px-6 py-5">
        <div>
          <span className="text-[8px] tracking-[0.5em] text-[#F5F7FA]/20 uppercase block">Itinera Host</span>
          <span className="font-playfair text-lg text-[#F5F7FA] tracking-wide">ITINERA</span>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">

          {pageState === 'loading' && (
            <div className="text-center py-20">
              <p className="text-[#F5F7FA]/20 text-xs tracking-[0.3em] uppercase animate-pulse">Chargement...</p>
            </div>
          )}

          {pageState === 'error' && (
            <div className="text-center py-20">
              <p className="text-red-400/60 text-sm">{errorMsg}</p>
            </div>
          )}

          {pageState === 'done' && reservation && (
            <div className="bg-[#181C23] border border-white/8 p-7 text-center">
              <span className={`text-3xl block mb-4`}>
                {resultStatus === 'confirmed' ? '✅' : '❌'}
              </span>
              <h2 className="font-playfair text-xl text-[#F5F7FA] mb-2">
                Réservation {resultStatus === 'confirmed' ? 'confirmée' : 'déclinée'}
              </h2>
              <p className="text-[#F5F7FA]/40 text-sm">
                Le guest sera notifié par l'équipe ITINERA.
              </p>
            </div>
          )}

          {pageState === 'ready' && reservation && (
            <>
              <div className="mb-6 text-center">
                <p className="text-[9px] tracking-[0.5em] uppercase text-[#6E5BFF]/60 mb-2">Demande de réservation</p>
                <h1 className="font-playfair text-2xl text-[#F5F7FA]">{reservation.establishment}</h1>
              </div>

              {/* Reservation card */}
              <div className="bg-[#181C23] border border-white/8 p-6 mb-5">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/30">Guest</span>
                    <span className="text-[#F5F7FA] text-sm font-medium">
                      {reservation.first_name} {reservation.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/30">Date</span>
                    <span className="text-[#F5F7FA] text-sm">{reservation.date}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/30">Heure</span>
                    <span className="text-[#F5F7FA] text-sm">{reservation.time}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/30">Couverts</span>
                    <span className="text-[#F5F7FA] text-sm">
                      {reservation.guests} personne{reservation.guests > 1 ? 's' : ''}
                    </span>
                  </div>
                  {reservation.occasion && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/30">Occasion</span>
                      <span className="text-[#F5F7FA] text-sm">{reservation.occasion}</span>
                    </div>
                  )}
                  {reservation.special_requests && (
                    <div className="pt-2 border-t border-white/5 mt-2">
                      <span className="text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/30 block mb-1.5">Demandes spéciales</span>
                      <p className="text-[#F5F7FA]/60 text-sm italic">"{reservation.special_requests}"</p>
                    </div>
                  )}
                </div>

                {/* Already actioned */}
                {reservation.status !== 'pending' && (
                  <div className="mt-4 pt-4 border-t border-white/5 text-center">
                    <span className={`text-xs tracking-[0.2em] uppercase ${
                      reservation.status === 'confirmed'
                        ? 'text-green-400'
                        : reservation.status === 'declined'
                        ? 'text-red-400'
                        : 'text-[#F5F7FA]/40'
                    }`}>
                      {reservation.status === 'confirmed' && '✓ Déjà confirmée'}
                      {reservation.status === 'declined' && '✗ Déjà déclinée'}
                      {reservation.status === 'cancelled' && 'Annulée'}
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {reservation.status === 'pending' && (
                <div className="space-y-3">
                  {errorMsg && (
                    <p className="text-red-400/60 text-xs text-center">{errorMsg}</p>
                  )}
                  <button
                    onClick={() => handleAction('confirmed')}
                    disabled={actionLoading}
                    className="w-full py-4 text-white text-[11px] tracking-[0.25em] uppercase bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-40"
                  >
                    ✓ Confirmer la réservation
                  </button>
                  <button
                    onClick={() => handleAction('declined')}
                    disabled={actionLoading}
                    className="w-full py-4 text-white text-[11px] tracking-[0.25em] uppercase bg-red-500/8 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-40"
                  >
                    ✗ Décliner
                  </button>
                </div>
              )}

              <p className="text-center text-[10px] text-[#F5F7FA]/15 mt-6 tracking-wider uppercase">
                ITINERA · Hospitality Planning
              </p>
            </>
          )}

        </div>
      </main>
    </div>
  )
}
