import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createHmac } from 'crypto'

const SECRET = process.env.RESET_SECRET || 'itinera-reset-secret-2024'

function verifyToken(token: string): { email: string } | null {
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null
    const expected = createHmac('sha256', SECRET).update(payload).digest('base64url')
    if (sig !== expected) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (Date.now() > data.exp) return null
    return { email: data.email }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'Mot de passe trop court (6 caractères min)' }, { status: 400 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Lien invalide ou expiré. Recommencez la procédure.' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('rp_profiles')
      .update({ dashboard_password: password })
      .ilike('email', decoded.email)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
