import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// GET /api/test-email?to=votremail@email.com
// Teste l'envoi Resend et retourne le résultat brut (erreur ou succès)
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to') || process.env.MANAGER_EMAIL || ''
  if (!to) return NextResponse.json({ error: 'Paramètre ?to= requis' }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'breakeat.app@breakeatapp.com'

  if (!apiKey) {
    return NextResponse.json({
      error: 'RESEND_API_KEY non défini dans les variables d\'environnement Vercel',
      hint: 'Allez dans Vercel → Settings → Environment Variables → ajoutez RESEND_API_KEY',
    }, { status: 500 })
  }

  const resend = new Resend(apiKey)

  try {
    const result = await resend.emails.send({
      from: `ITINERA Test <${fromEmail}>`,
      to: [to],
      subject: '✦ Test email ITINERA',
      html: '<p>Ceci est un email de test. Si vous le recevez, Resend fonctionne correctement.</p>',
    })

    return NextResponse.json({
      success: true,
      result,
      from: fromEmail,
      to,
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
    })
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number; name?: string }
    return NextResponse.json({
      success: false,
      error: error?.message || String(err),
      statusCode: error?.statusCode,
      name: error?.name,
      from: fromEmail,
      to,
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      hint: error?.message?.includes('domain')
        ? 'Le domaine expéditeur n\'est pas vérifié dans Resend. Allez sur resend.com → Domains.'
        : error?.message?.includes('API key')
        ? 'La clé API Resend est invalide ou expirée.'
        : 'Vérifiez les logs Resend sur resend.com → Emails',
    }, { status: 500 })
  }
}
