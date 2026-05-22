// Route qui sert le fichier de vérification Apple Pay
// Apple exige ce fichier à : https://itinera.click/.well-known/apple-developer-merchantid-domain-association
// Stripe héberge ce fichier pour tous ses marchands

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Stripe héberge ce fichier publiquement pour tous ses marchands
    const res = await fetch(
      'https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association',
      { next: { revalidate: 86400 } } // cache 24h
    )

    if (!res.ok) {
      return new Response('File not found', { status: 404 })
    }

    const content = await res.text()

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new Response('Error fetching Apple Pay verification file', { status: 500 })
  }
}
