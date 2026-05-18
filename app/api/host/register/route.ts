import { supabaseAdmin } from '@/lib/supabase-admin'

function generateSlug(venueName: string, destination: string): string {
  const nameSlug = venueName
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${nameSlug}-${destination}`
}

export async function POST(req: Request) {
  try {
    const { venue_name, destination, password, email, category } = await req.json()

    if (!venue_name?.trim() || !destination?.trim() || !password?.trim()) {
      return Response.json({ error: 'Nom, ville et mot de passe sont requis.' }, { status: 400 })
    }

    if (password.length < 6) {
      return Response.json({ error: 'Le mot de passe doit faire au moins 6 caractères.' }, { status: 400 })
    }

    // Check if a host profile with same venue_name + destination already exists (case-insensitive)
    const { data: existing } = await supabaseAdmin
      .from('host_profiles')
      .select('id')
      .ilike('venue_name', venue_name.trim())
      .ilike('destination', destination.trim())
      .maybeSingle()

    if (existing) {
      return Response.json({ error: 'Un compte existe déjà pour cet établissement dans cette ville.' }, { status: 409 })
    }

    // Generate unique slug
    let slug = generateSlug(venue_name.trim(), destination.trim())

    // Check slug uniqueness, append number if taken
    const { data: slugCheck } = await supabaseAdmin
      .from('host_profiles')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()

    if (slugCheck) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // Try full insert (with category + email columns)
    const fullInsert = {
      slug,
      venue_name: venue_name.trim(),
      destination: destination.trim(),
      password,
      email: email?.trim() || null,
      category: category || 'restaurant',
      active: true,
    }

    const { error: fullError } = await supabaseAdmin
      .from('host_profiles')
      .insert(fullInsert)

    if (fullError) {
      // Fallback: columns category/email may not exist yet — insert without them
      if (
        fullError.message?.includes('category') ||
        fullError.message?.includes('email') ||
        fullError.code === '42703'
      ) {
        const { error: fallbackError } = await supabaseAdmin
          .from('host_profiles')
          .insert({
            slug,
            venue_name: venue_name.trim(),
            destination: destination.trim(),
            password,
            active: true,
          })

        if (fallbackError) {
          console.error('[host/register] fallback insert error:', fallbackError)
          return Response.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 })
        }
      } else {
        console.error('[host/register]', fullError)
        return Response.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 })
      }
    }

    return Response.json({
      success: true,
      slug,
      venueName: venue_name.trim(),
      destination: destination.trim(),
    })
  } catch (e) {
    console.error('[host/register] exception:', e)
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
