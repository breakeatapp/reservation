import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getRPProfile } from '@/lib/rp'
import { sendStatusUpdateEmailToClient } from '@/lib/email'

const supabase = supabaseAdmin

type Params = { params: { slug: string } }

// Vérifier le mot de passe du RP
// Priorité : Supabase → fallback profil local (quand la table n'existe pas encore)
async function verifyRP(slug: string, password: string): Promise<boolean> {
  // 1. Essayer Supabase
  try {
    const { data, error } = await supabase
      .from('rp_profiles')
      .select('dashboard_password')
      .eq('slug', slug)
      .single()

    if (!error && data) {
      return data.dashboard_password === password
    }
  } catch {
    // Table inexistante → fallback
  }

  // 2. Fallback : vérifier contre le profil local codé en dur
  const profile = await getRPProfile(slug)
  return profile?.dashboard_password === password
}

// GET — Récupérer les réservations du RP
export async function GET(req: NextRequest, { params }: Params) {
  const password = req.headers.get('x-rp-password') || ''
  const authorized = await verifyRP(params.slug, password)
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('rp_slug', params.slug)
      .order('created_at', { ascending: false })

    if (error) {
      // Table reservations sans colonne rp_slug ou erreur → retourner liste vide
      console.error('Supabase reservations error:', error.message)
      return NextResponse.json([])
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('GET reservations error:', err)
    return NextResponse.json([])
  }
}

// PATCH — Mettre à jour le statut
export async function PATCH(req: NextRequest, { params }: Params) {
  const password = req.headers.get('x-rp-password') || ''
  const authorized = await verifyRP(params.slug, password)
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const { id, status, establishment, date, time, guests } = body

  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
  }

  // ── Mise à jour des champs de la réservation (modification RP) ──
  if (establishment !== undefined || date !== undefined || time !== undefined || guests !== undefined) {
    const updateData: Record<string, unknown> = {}
    if (establishment) updateData.establishment = establishment
    if (date) updateData.date = date
    if (time) updateData.time = time
    if (guests) updateData.guests = parseInt(guests)

    const { error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id)
      .eq('rp_slug', params.slug)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Mise à jour du statut ──
  if (!status) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  // Récupérer la réservation complète AVANT de modifier (pour l'email)
  // Note: pas de filtre rp_slug ici — c'est l'UPDATE qui garantit la sécurité
  const { data: reservation } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .eq('rp_slug', params.slug) // sécurité : un RP ne modifie que ses réservations

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Notifier le client par email si statut = confirmed ou declined ──
  if (reservation && (status === 'confirmed' || status === 'declined')) {
    try {
      const rpProfile = await getRPProfile(params.slug)
      await sendStatusUpdateEmailToClient({
        firstName: reservation.first_name,
        lastName: reservation.last_name,
        email: reservation.email,
        establishment: reservation.establishment,
        destination: reservation.destination,
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests,
        status,
        rpDisplayName: rpProfile?.display_name,
        rpWhatsapp: rpProfile?.whatsapp,
        rpEmail: rpProfile?.email,
      })
    } catch (emailErr) {
      // Non-bloquant — on log sans faire échouer la requête
      console.error('Email client notification error:', emailErr)
    }
  }

  return NextResponse.json({ success: true })
}
