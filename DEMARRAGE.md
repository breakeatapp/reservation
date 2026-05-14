# Guide de démarrage — Élite Reservations

## 1. Installer Node.js (une seule fois)

Télécharger et installer : https://nodejs.org/en/download
→ Choisir "Windows Installer (.msi)" version LTS

Redémarre ton terminal après l'installation.

## 2. Lancer le site en local

Ouvre un terminal dans ce dossier, puis :

```bash
npm install
npm run dev
```

→ Le site est accessible sur : http://localhost:3000

## 3. Configurer l'envoi d'emails

Édite le fichier `.env.local` :

```
RESEND_API_KEY=re_VOTRE_CLE
MANAGER_EMAIL=tonEmail@gmail.com
MANAGER_WHATSAPP=33612345678
MANAGER_NAME=Élite Reservations
```

### Obtenir une clé Resend gratuite :
1. Va sur https://resend.com
2. Crée un compte gratuit
3. Copie la clé API dans .env.local

## 4. Mettre en ligne gratuitement (Vercel)

1. Créer un compte sur https://vercel.com
2. Connecter ton GitHub
3. Importer le projet → Vercel déploie automatiquement
4. Ajouter les variables d'environnement dans les settings Vercel

## Structure des fichiers

```
app/
  page.tsx              → Page d'accueil
  destinations/[slug]/  → Pages par destination
  reservation/          → Formulaire de réservation
  api/reservation/      → Envoi email
components/
  Navbar.tsx
  Footer.tsx
  ReservationForm.tsx
lib/
  data.ts               → ← MODIFIER ICI pour ajouter des restaurants
  email.ts              → Template email
```

## Ajouter un restaurant

Dans `lib/data.ts`, copier un bloc dans le tableau `establishments[]` :

```typescript
{
  slug: 'nom-du-restaurant',          // URL slug (sans espaces)
  destination: 'saint-tropez',        // slug de la destination
  name: 'Nom du Restaurant',
  type: 'Restaurant',                 // Restaurant | Beach Club | Rooftop | Nightclub | Lounge
  shortDesc: 'Description courte',
  description: 'Description longue complète',
  image: 'URL_image_unsplash',
  cuisine: 'Type de cuisine',
  priceRange: '€€€€€',
  phone: '+33612345678',
  email: 'contact@restaurant.com',
  address: 'Adresse complète',
  openTime: '19:00',
  closeTime: '23:00',
  tags: ['Tag1', 'Tag2'],
},
```
