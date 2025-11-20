# Kroni-Toudou

Gestionnaire de todolist avec votre mascotte Kroni. Application Next.js avec authentification Supabase et système de licences.

## Prérequis

- Node.js 18+ 
- Compte Supabase avec projet configuré
- Base de données Supabase avec les tables : `tasks`, `workdays`, `licences`

## Configuration

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site URL (pour les redirections email et OAuth)
# En développement : http://localhost:3000
# En production : https://votre-domaine.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Build de production

```bash
npm run build
npm start
```

## Déploiement

### Vercel (recommandé)

1. Connectez votre repository GitHub à Vercel
2. Configurez les variables d'environnement dans les paramètres du projet :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (URL de production)
3. Déployez automatiquement à chaque push sur la branche principale

### Autres plateformes

L'application peut être déployée sur toute plateforme supportant Next.js (Netlify, Railway, etc.).

**Important** : Configurez les mêmes variables d'environnement sur votre plateforme de déploiement.

## Structure du projet

- `app/` - Pages et routes Next.js
- `components/` - Composants React réutilisables
- `lib/` - Utilitaires, hooks, fonctions de base de données
- `proxy.ts` - Middleware pour l'authentification et la protection des routes

## Fonctionnalités

- Authentification avec Supabase
- Gestion de tâches (quotidiennes, hebdomadaires, mensuelles, dates spécifiques)
- Calendrier interactif
- Gestion des modes de travail (Présentiel/Distanciel/Congé)
- Système de licences
