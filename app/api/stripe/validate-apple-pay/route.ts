import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

const PMD_ID = 'pmd_1Ta1F46e9euPeTHcTp5Wu5nh' // itinera.click

// POST /api/stripe/validate-apple-pay
// Enregistre www.itinera.click ET valide les deux domaines
export async function POST() {
  try {
    const results: Record<string, unknown> = {}

    // 1. Valider itinera.click (déjà enregistré)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r1 = await (stripe.paymentMethodDomains as any).validate(PMD_ID)
    results['itinera.click'] = { apple_pay: r1.apple_pay, google_pay: r1.google_pay }

    // 2. Créer + valider www.itinera.click s'il n'existe pas encore
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newDomain = await (stripe.paymentMethodDomains as any).create({
        domain_name: 'www.itinera.click',
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r2 = await (stripe.paymentMethodDomains as any).validate(newDomain.id)
      results['www.itinera.click'] = {
        id: newDomain.id,
        apple_pay: r2.apple_pay,
        google_pay: r2.google_pay,
      }
    } catch (wwwErr: unknown) {
      // Déjà existant ou autre erreur
      results['www.itinera.click'] = {
        note: wwwErr instanceof Error ? wwwErr.message : 'Erreur lors de la création',
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne.'
    console.error('[validate-apple-pay]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET — status des domaines
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = await (stripe.paymentMethodDomains as any).list({ limit: 10 })

    return NextResponse.json({
      domains: list.data.map((d: any) => ({
        id: d.id,
        domain: d.domain_name ?? d.domain,
        enabled: d.enabled,
        apple_pay: d.apple_pay,
        google_pay: d.google_pay,
      })),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
