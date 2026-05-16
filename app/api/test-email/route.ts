import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// GET /api/test-email?to=votremail@email.com
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to') || process.env.MANAGER_EMAIL || ''
  if (!to) return NextResponse.json({ error: 'Paramètre ?to= requis' }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'breakeat.app@breakeatapp.com'

  if (!apiKey) {
    return NextResponse.json({
      error: 'RESEND_API_KEY non défini dans Vercel → Settings → Environment Variables',
    }, { status: 500 })
  }

  const resend = new Resend(apiKey)

  const result = await resend.emails.send({
    from: `ITINERA Test <${fromEmail}>`,
    to: [to],
    subject: '✦ Test email ITINERA',
    html: '<p>Test OK — Resend fonctionne correctement.</p>',
  })

  // Resend SDK v2 retourne {data, error} sans throw
  if (result.error) {
    const hint =
      result.error.name === 'validation_error' && (result.error as {statusCode?: number}).statusCode === 401
        ? '❌ Clé API invalide. Allez sur resend.com → API Keys → créez une nouvelle clé → mettez-la dans Vercel → Settings → Environment Variables → RESEND_API_KEY → puis Redeploy.'
        : result.error.name?.includes('domain')
        ? '❌ Domaine expéditeur non vérifié. Allez sur resend.com → Domains.'
        : '❌ Erreur Resend. Vérifiez resend.com → Emails pour les logs.'

    return NextResponse.json({
      success: false,
      error: result.error.message,
      name: result.error.name,
      statusCode: (result.error as {statusCode?: number}).statusCode,
      from: fromEmail,
      to,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      hint,
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    emailId: result.data?.id,
    from: fromEmail,
    to,
    message: '✅ Email envoyé avec succès ! Vérifiez votre boîte.',
  })
}
