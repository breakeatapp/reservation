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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// POST /api/group/register
export async function POST(req: Request) {
  try {
    const { group_name, email, password } = await req.json()

    if (!group_name?.trim() || !email?.trim() || !password?.trim()) {
      return Response.json({ error: 'Nom du groupe, email et mot de passe sont requis.' }, { status: 400 })
    }
    if (password.length < 6) {
      return Response.json({ error: 'Le mot de passe doit faire au moins 6 caractères.' }, { status: 400 })
    }
    if (!isProfessionalEmail(email)) {
      return Response.json({
        error: 'Veuillez utiliser un email professionnel (adresse de votre groupe). Les adresses Gmail, Hotmail, Yahoo et similaires ne sont pas acceptées.',
      }, { status: 400 })
    }

    // Vérifier doublon email
    const { data: existing } = await supabaseAdmin
      .from('hospitality_groups')
      .select('id')
      .ilike('email', email.trim())
      .maybeSingle()

    if (existing) {
      return Response.json({ error: 'Un compte existe déjà avec cet email.' }, { status: 409 })
    }

    // Générer slug unique
    let slug = generateSlug(group_name.trim())
    const { data: slugCheck } = await supabaseAdmin
      .from('hospitality_groups')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()

    if (slugCheck) slug = `${slug}-${Date.now().toString(36)}`

    const { error } = await supabaseAdmin
      .from('hospitality_groups')
      .insert({
        slug,
        group_name: group_name.trim(),
        email: email.trim().toLowerCase(),
        password,
        active: true,
      })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, slug, group_name: group_name.trim() })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
