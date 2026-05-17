# Problème : page `/{slug}/mon-espace` retourne 404 malgré un profil existant

## Stack technique
- **Next.js 14** App Router (server components + client components)
- **Supabase** (PostgreSQL) via `supabase-admin` (service_role — bypass RLS)
- **Vercel** (déploiement)
- **TypeScript**

---

## Description du problème

La page `https://itinera.click/notta/mon-espace` affiche systématiquement "Page introuvable" (404 Next.js).

**Pourtant** : l'endpoint `https://itinera.click/api/rp/exists?slug=notta` retourne `{"exists":true}`, ce qui confirme que le profil RP avec slug `notta` existe bien en base Supabase avec `active = true`.

La fonction `getRPProfile('notta')` doit donc retourner `null` pour une raison inconnue, alors que la même requête Supabase dans l'endpoint `/api/rp/exists` fonctionne.

---

## Ce qu'on a déjà essayé (sans succès)

1. Ajout de `export const dynamic = 'force-dynamic'` et `export const revalidate = 0` sur la page → toujours 404
2. Normalisation du slug en lowercase dans `getRPProfile` (`slug.toLowerCase().trim()`) → toujours 404
3. Vérification des variables d'environnement Vercel : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont bien configurées

---

## Fichiers concernés

### 1. `app/[rp]/mon-espace/page.tsx`
```typescript
import { notFound } from 'next/navigation'
import { getRPProfile } from '@/lib/rp'
import ClientDashboard from '@/components/ClientDashboard'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: { rp: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getRPProfile(params.rp)
  if (!profile) return { title: 'Page introuvable' }
  return { title: `Mon espace — ${profile.display_name}` }
}

export default async function ClientSpacePage({ params }: Props) {
  const profile = await getRPProfile(params.rp)
  if (!profile) notFound()   // ← C'est ici que ça bloque, profile est null

  return <ClientDashboard profile={profile} />
}
```

---

### 2. `lib/rp.ts` — fonction `getRPProfile`
```typescript
import { RPProfile } from './supabase'
import { supabaseAdmin as supabase } from './supabase-admin'

const FALLBACK_PROFILES: Record<string, RPProfile> = {}

export async function getRPProfile(slug: string): Promise<RPProfile | null> {
  // Normaliser le slug en minuscules
  const normalizedSlug = slug.toLowerCase().trim()

  try {
    const { data, error } = await supabase
      .from('rp_profiles')
      .select('*')
      .eq('slug', normalizedSlug)
      .eq('active', true)
      .single()

    if (!error && data) {
      return data as RPProfile
    }
    // Si error (ex: PGRST116 = no rows) → tombe dans le fallback
  } catch {
    // Supabase pas configuré ou erreur réseau → fallback
  }

  return FALLBACK_PROFILES[normalizedSlug] ?? null
}
```

**Problème probable ici** : quand Supabase retourne une erreur (ex: `PGRST116` = zéro lignes trouvées, ou erreur de connexion), le `catch` ou le `if (!error && data)` tombe dans le fallback → retourne `null` → `notFound()`.

Mais pourquoi ? Le profil existe (`active=true`, slug=`notta` confirmé).

---

### 3. `lib/supabase-admin.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
```

---

### 4. `app/api/rp/exists/route.ts` (celui qui FONCTIONNE)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/rp/exists?slug=xxx
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ exists: false })

  const { data } = await supabaseAdmin
    .from('rp_profiles')
    .select('slug')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  return NextResponse.json({ exists: !!data })
}
```

---

### 5. Schéma Supabase — table `rp_profiles` (colonnes principales)
```sql
id              uuid primary key
slug            text unique not null
display_name    text
email           text
whatsapp        text
dashboard_password text
active          boolean default true
tagline         text
accent_color    text
logo_text       text
activated_destinations  text[]
activated_venues        text[]
created_at      timestamptz
updated_at      timestamptz
```

---

## Hypothèses à investiguer

1. **`select('*')` vs `select('slug')`** : l'endpoint `/exists` utilise `select('slug')` et ça marche. `getRPProfile` utilise `select('*')` → est-ce qu'une colonne retourne une erreur ? (ex: colonne inexistante, type mismatch, permission RLS sur certaines colonnes ?)

2. **Singleton Supabase partagé** : `supabaseAdmin` est créé au chargement du module. Dans le contexte d'un Server Component Next.js, est-ce que le client Supabase se retrouve dans un état invalide entre l'appel depuis l'API route (qui marche) et l'appel depuis le Server Component (qui ne marche pas) ?

3. **Variables d'environnement** : `process.env.SUPABASE_SERVICE_ROLE_KEY` est disponible dans les API routes (Node.js runtime) mais potentiellement pas dans les Server Components si Next.js les traite différemment ? (Peu probable mais à vérifier)

4. **RLS actif malgré service_role** : est-ce que les RLS policies Supabase pourraient bloquer `select('*')` même avec la clé service_role ? (Normalement non, service_role bypasse tout)

5. **Erreur silencieuse** : le `catch {}` vide dans `getRPProfile` avale toutes les erreurs. Il faut logger l'erreur pour voir ce qui se passe réellement.

---

## Fix suggéré à tester

Modifier `getRPProfile` pour logger l'erreur et distinguer "zéro résultats" d'une vraie erreur :

```typescript
export async function getRPProfile(slug: string): Promise<RPProfile | null> {
  const normalizedSlug = slug.toLowerCase().trim()

  try {
    const { data, error } = await supabase
      .from('rp_profiles')
      .select('*')
      .eq('slug', normalizedSlug)
      .eq('active', true)
      .single()

    // Logger pour debug
    console.log('[getRPProfile]', { slug: normalizedSlug, data: !!data, error: error?.code, message: error?.message })

    if (data) return data as RPProfile

    // PGRST116 = no rows found (normal) → pas une vraie erreur
    if (error && error.code !== 'PGRST116') {
      console.error('[getRPProfile] Supabase error:', error)
    }
  } catch (e) {
    console.error('[getRPProfile] Exception:', e)
  }

  return FALLBACK_PROFILES[normalizedSlug] ?? null
}
```

---

## Ce qui devrait se passer vs ce qui se passe

| Étape | Attendu | Réel |
|-------|---------|------|
| `/api/rp/exists?slug=notta` | `{"exists":true}` | ✅ `{"exists":true}` |
| `getRPProfile('notta')` dans Server Component | Retourne le profil | ❌ Retourne `null` |
| `/{slug}/mon-espace` | Affiche `ClientDashboard` | ❌ 404 "Page introuvable" |

---

## Question principale pour Codex

**Pourquoi `supabase.from('rp_profiles').select('*').eq('slug','notta').eq('active',true).single()` retourne `null` dans un Next.js 14 Server Component, alors que la même requête avec `select('slug')` dans une API Route fonctionne parfaitement ?**
