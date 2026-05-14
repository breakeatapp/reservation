import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-[10px] tracking-[0.4em] text-gold/50 uppercase mb-4">404</p>
          <h1 className="font-playfair text-5xl text-cream mb-4">Page introuvable</h1>
          <p className="text-cream/40 mb-8">Cette adresse n&apos;existe pas dans notre catalogue.</p>
          <Link
            href="/"
            className="inline-block border border-gold/40 text-gold text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:bg-gold/10 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </>
  )
}
