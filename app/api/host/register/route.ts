import { supabaseAdmin } from '@/lib/supabase-admin'

const PERSONAL_DOMAINS = [
  'gmail.com','googlemail.com','yahoo.com','yahoo.fr','yahoo.co.uk',
  'hotmail.com','hotmail.fr','hotmail.co.uk','outlook.com','outlook.fr',
  'live.com','live.fr','msn.com','icloud.com','me.com','mac.com',
  'aol.com','free.fr','orange.fr','sfr.fr','wanadoo.fr','laposte.net',
  'bouyguestelecom.fr','numericable.fr','protonmail.com','proton.me',
  'gmx.com','gmx.fr','mail.com','ymail.com','pm.me','tutanota.com',
]

function isProfessionalEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] ?? ''
  return domain.length > 0 && !PERSONAL_DOMAINS.includes(domain)
}

function capitalizeName(name: string): string {
  return name.trim().replace(/\b\w/g, l => l.toUpperCase())
}

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
    const body = await req.json()
    const { venue_name, destination, password, email, category } = body

    if (!venue_name?.trim() || !destination?.trim() || !password?.trim()) {
      return Response.json({ error: 'Nom, ville et mot de passe sont requis.' }, { status: 400 })
    }

    if (password.length < 6) {
      return Response.json({ error: 'Le mot de passe doit faire au moins 6 caractères.' }, { status: 400 })
    }

    if (!email?.trim()) {
      return Response.json({ error: 'Un email professionnel est requis.' }, { status: 400 })
    }

    if (!isProfessionalEmail(email)) {
      return Response.json({
        error: 'Veuillez utiliser un email professionnel (adresse de votre établissement). Les adresses Gmail, Hotmail, Yahoo et similaires ne sont pas acceptées.',
      }, { status: 400 })
    }

    // Check if table exists first
    const { error: tableCheckError } = await supabaseAdmin
      .from('venues_profiles')
      .select('id')
      .limit(1)

    if (tableCheckError) {
      console.error('[host/register] table check error:', tableCheckError)
      // Table doesn't exist or connection issue
      return Response.json({
        error: `Base de données non configurée : ${tableCheckError.message}. Exécutez la migration SQL dans Supabase.`,
      }, { status: 500 })
    }

    // Check for duplicate venue+destination
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('venues_profiles')
      .select('id')
      .ilike('venue_name', venue_name.trim())
      .ilike('destination', destination.trim())
      .maybeSingle()

    if (existingError) {
      console.error('[host/register] duplicate check error:', existingError)
    }

    if (existing) {
      return Response.json({ error: 'Un compte existe déjà pour cet établissement dans cette ville.' }, { status: 409 })
    }

    // Generate unique slug
    let slug = generateSlug(venue_name.trim(), destination.trim())

    const { data: slugCheck } = await supabaseAdmin
      .from('venues_profiles')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()

    if (slugCheck) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // Try full insert (with category + email columns)
    const { error: fullError } = await supabaseAdmin
      .from('venues_profiles')
      .insert({
        slug,
        venue_name: capitalizeName(venue_name),
        destination: destination.trim(),
        password,
        email: email?.trim() || null,
        category: category || 'restaurant',
        active: true,
      })

    if (fullError) {
      console.error('[host/register] full insert error:', fullError)

      // Columns category/email missing → retry without them
      if (fullError.code === '42703' || fullError.message?.includes('column')) {
        const { error: fallbackError } = await supabaseAdmin
          .from('venues_profiles')
          .insert({
            slug,
            venue_name: capitalizeName(venue_name),
            destination: destination.trim(),
            password,
            active: true,
          })

        if (fallbackError) {
          console.error('[host/register] fallback error:', fallbackError)
          return Response.json({
            error: `Erreur base de données : ${fallbackError.message}`,
          }, { status: 500 })
        }
        // Fallback succeeded
        return Response.json({ success: true, slug, venueName: venue_name.trim(), destination: destination.trim() })
      }

      return Response.json({
        error: `Erreur lors de la création : ${fullError.message}`,
      }, { status: 500 })
    }

    return Response.json({
      success: true,
      slug,
      venueName: venue_name.trim(),
      destination: destination.trim(),
    })

  } catch (e) {
    console.error('[host/register] exception:', e)
    return Response.json({ error: `Erreur serveur : ${String(e)}` }, { status: 500 })
  }
}
