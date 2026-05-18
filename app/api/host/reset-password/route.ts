import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    const { venue_name, destination, email, new_password } = await req.json()

    if (!venue_name?.trim() || !destination?.trim() || !new_password?.trim()) {
      return Response.json({ error: 'Nom, ville et nouveau mot de passe sont requis.' }, { status: 400 })
    }

    if (new_password.length < 6) {
      return Response.json({ error: 'Le mot de passe doit faire au moins 6 caractères.' }, { status: 400 })
    }

    // Find the venue by name + destination (case-insensitive)
    let query = supabaseAdmin
      .from('venues_profiles')
      .select('id, slug, venue_name, email')
      .ilike('venue_name', venue_name.trim())
      .eq('destination', destination.trim())
      .eq('active', true)

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('[host/reset-password]', error)
    }

    if (!data) {
      return Response.json({ error: 'Aucun établissement trouvé avec ce nom et cette ville.' }, { status: 404 })
    }

    // If an email was provided, verify it matches (extra security)
    if (email?.trim()) {
      const registeredEmail = (data.email || '').toLowerCase()
      if (registeredEmail && registeredEmail !== email.trim().toLowerCase()) {
        return Response.json({ error: 'L\'email ne correspond pas à celui enregistré.' }, { status: 403 })
      }
    }

    // Update password
    const { error: updateError } = await supabaseAdmin
      .from('venues_profiles')
      .update({ password: new_password })
      .eq('id', data.id)

    if (updateError) {
      console.error('[host/reset-password] update error:', updateError)
      return Response.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
    }

    return Response.json({ success: true, slug: data.slug })
  } catch (e) {
    console.error('[host/reset-password] exception:', e)
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
