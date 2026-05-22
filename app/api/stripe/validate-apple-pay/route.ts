import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

const PMD_ID = 'pmd_1Ta1F46e9euPeTHcTp5Wu5nh'

// POST /api/stripe/validate-apple-pay
// Déclenche la validation du domaine Apple Pay chez Stripe
export async function POST() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (stripe.paymentMethodDomains as any).validate(PMD_ID)

    return NextResponse.json({
      success: true,
      domain: result.domain_name ?? result.domain ?? PMD_ID,
      apple_pay: result.apple_pay,
      google_pay: result.google_pay,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne.'
    console.error('[validate-apple-pay]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET — status du domaine
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (stripe.paymentMethodDomains as any).retrieve(PMD_ID)

    return NextResponse.json({
      id: result.id,
      domain: result.domain_name ?? result.domain,
      enabled: result.enabled,
      apple_pay: result.apple_pay,
      google_pay: result.google_pay,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
