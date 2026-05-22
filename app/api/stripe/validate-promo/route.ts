import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

// GET /api/stripe/validate-promo?code=ITINERA6MOIS
// Valide un code promo et retourne son libellé
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim()

  if (!code) {
    return NextResponse.json({ error: 'Code requis.' }, { status: 400 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promoCodes = await (stripe.promotionCodes as any).list({
      code,
      active: true,
      limit: 1,
    })

    if (!promoCodes.data.length) {
      return NextResponse.json({ error: 'Code promo invalide ou expiré.' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promo = promoCodes.data[0] as any
    const coupon = promo.coupon

    // Construire le libellé lisible
    let label = ''
    if (coupon.percent_off) {
      label = `-${coupon.percent_off}%`
    } else if (coupon.amount_off) {
      label = `-${(coupon.amount_off / 100).toFixed(2).replace('.', ',')} €`
    }
    if (coupon.duration === 'repeating' && coupon.duration_in_months) {
      label += ` pendant ${coupon.duration_in_months} mois`
    } else if (coupon.duration === 'forever') {
      label += ` pour toujours`
    } else if (coupon.duration === 'once') {
      label += ` (1er mois)`
    }

    return NextResponse.json({
      id: promo.id,
      code: promo.code,
      label: label || 'Réduction appliquée',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
