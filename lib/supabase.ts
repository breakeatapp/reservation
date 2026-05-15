import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type ReservationStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled'

export type RPClientNote = {
  id: string
  rp_slug: string
  client_email: string
  client_name?: string
  vip_tag: string
  internal_note: string
  total_resas: number
  created_at: string
  updated_at: string
}

export type Reservation = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  email: string
  phone: string
  establishment: string
  destination: string
  date: string
  time: string
  guests: number
  occasion: string
  seating: string
  vip_level: string
  budget_level: string
  nationality: string
  special_requests: string
  status: ReservationStatus
  establishment_phone: string
  establishment_email: string
  rp_slug: string
  itinerary_id?: string
}

export type RPProfile = {
  id: string
  slug: string
  display_name: string
  tagline: string
  email: string
  whatsapp: string
  dashboard_password: string
  active: boolean
  activated_destinations: string[]
  activated_venues: string[]   // vide = toutes les venues de ses destinations
  cover_image?: string
  logo_text?: string
  accent_color: string
  created_at: string
}
