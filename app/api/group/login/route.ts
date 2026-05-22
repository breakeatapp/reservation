import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/group/login  { email, password }
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email?.trim() || !password?.trim()) {
      return Response.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('hospitality_groups')
      .select('*')
      .ilike('email', email.trim())
      .eq('password', password)
      .eq('active', true)
      .maybeSingle()

    if (error) console.error('[group/login]', error)

    if (!data) {
      return Response.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 })
    }

    return Response.json({ success: true, slug: data.slug, group_name: data.group_name })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
