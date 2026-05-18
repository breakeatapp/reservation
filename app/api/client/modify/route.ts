import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendModificationEmailToRP, sendModificationAckToClient } from '@/lib/email'
import { getRPProfile } from '@/lib/rp'

// PATCH /api/client/modify
// action: 'modify' | 'cancel'
// Le client peut modifier ou annuler une réservation pending ou confirmed
export async function PATCH(req: NextRequest) {
  try {
    const { id, email, date, time, guests, specialRequests, action } = await req.json()

    if (!id || !email) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
    }

    // Récupérer la réservation complète
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
    }

    // Vérifier que la réservation appartient bien à cet email
    if (reservation.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
    }

    // On ne peut pas modifier une résa déjà annulée ou refusée
    if (reservation.status === 'cancelled' || reservation.status === 'declined') {
      return NextResponse.json({
        error: 'Cette réservation ne peut plus être modifiée.',
      }, { status: 400 })
    }

    // ── Préparer les modifications ────────────────────────────────
    const updates: Record<string, unknown> = {}
    const isCancel = action === 'cancel'

    let newDateFormatted: string | undefined
    if (!isCancel) {
      if (date) {
        newDateFormatted = new Date(date).toLocaleDateString('fr-FR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
        updates.date = newDateFormatted
      }
      if (time) updates.time = time
      if (guests) updates.guests = parseInt(String(guests))
      if (specialRequests !== undefined) updates.special_requests = specialRequests
    } else {
      updates.status = 'cancelled'
    }

    // Appliquer en base
    const { error: updateError } = await supabaseAdmin
      .from('reservations')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // ── Envoyer les emails de notification (non-bloquant) ────────
    try {
      const rpSlug = reservation.rp_slug as string | undefined
      let rpEmail: string | undefined
      let rpDisplayName = ''
      let rpWhatsapp: string | undefined

      if (rpSlug) {
        const rpProfile = await getRPProfile(rpSlug)
        if (rpProfile) {
          rpEmail = rpProfile.email
          rpDisplayName = rpProfile.display_name
          rpWhatsapp = rpProfile.whatsapp
        }
      }

      // Fallback : email de l'établissement
      if (!rpEmail) rpEmail = reservation.establishment_email || undefined

      const basePayload = {
        firstName: reservation.first_name,
        lastName: reservation.last_name,
        email: reservation.email,
        phone: reservation.phone || undefined,
        establishment: reservation.establishment,
        destination: reservation.destination || '',
        date: reservation.date,
        originalDate: reservation.date,
        newDate: !isCancel ? newDateFormatted : undefined,
        newTime: !isCancel && time ? time : undefined,
        newGuests: !isCancel && guests ? parseInt(String(guests)) : undefined,
        newNotes: !isCancel ? specialRequests : undefined,
        action: isCancel ? 'cancelled' as const : 'modified' as const,
        rpDisplayName,
        rpEmail,
      }

      // Envoyer RP + client en parallèle — indépendants l'un de l'autre
      const tasks: Promise<unknown>[] = [
        sendModificationAckToClient({ ...basePayload, rpWhatsapp }),
      ]
      if (rpEmail) {
        tasks.push(sendModificationEmailToRP(basePayload))
      }

      const results = await Promise.allSettled(tasks)
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[modify] email task ${i} failed:`, r.reason)
        }
      })
    } catch (emailErr) {
      console.error('[modify] email setup error (non-bloquant):', emailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Client modify error:', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
