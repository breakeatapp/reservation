import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createHmac, randomBytes } from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://itinera.click'
const SECRET = process.env.RESET_SECRET || 'itinera-reset-secret-2024'

function generateResetToken(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 3600000 })).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

    const { data: rp } = await supabaseAdmin
      .from('rp_profiles')
      .select('slug, display_name, email')
      .ilike('email', email.trim())
      .single()

    // On répond toujours OK pour ne pas révéler si l'email existe
    if (!rp) return NextResponse.json({ success: true })

    const token = generateResetToken(rp.email)
    const resetLink = `${SITE_URL}/reset-password?token=${token}`

    await resend.emails.send({
      from: `ITINERA <contact@itinera.click>`,
      to: rp.email,
      subject: 'Réinitialisation de votre mot de passe — ITINERA',
      html: `
        <div style="background:#0F1115;color:#F5F7FA;font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:40px 32px;">
          <p style="font-size:10px;letter-spacing:0.5em;color:#6E5BFF;text-transform:uppercase;margin-bottom:8px;">ITINERA</p>
          <h1 style="font-size:24px;font-weight:400;margin-bottom:24px;">Réinitialisation<br/>de mot de passe</h1>
          <p style="color:#F5F7FA99;font-size:14px;line-height:1.6;margin-bottom:32px;">
            Bonjour ${rp.display_name},<br/><br/>
            Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable <strong style="color:#F5F7FA">1 heure</strong>.
          </p>
          <a href="${resetLink}" style="display:block;background:#6E5BFF;color:#fff;text-align:center;padding:14px 24px;text-decoration:none;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:24px;">
            Réinitialiser mon mot de passe →
          </a>
          <p style="color:#F5F7FA33;font-size:11px;line-height:1.6;">
            Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.<br/>
            Votre mot de passe ne sera pas modifié.
          </p>
          <hr style="border:none;border-top:1px solid #ffffff10;margin:32px 0"/>
          <p style="color:#F5F7FA20;font-size:10px;">ITINERA · Hospitality Planning</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
