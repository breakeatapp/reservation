import { supabaseAdmin } from '@/lib/supabase-admin'

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
