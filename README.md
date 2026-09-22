# Pro and You

Application de gestion de livraisons pour snacks et restaurants. Gestion des commandes, des tournees, du stock, et suivi GPS en temps reel.

## Demarrage rapide (local)

### Prerequis

- Node.js 18+
- PostgreSQL 14+

### Installation en 3 etapes

```bash
# 1. Copier la config et creer la base de donnees
cp server/.env.example server/.env
createdb tournee_snack

# 2. Installer, initialiser le schema et charger les donnees de demo
npm run setup

# 3. Lancer l'application
npm run dev
```

Le frontend demarre sur **http://localhost:5173** et le backend sur **http://localhost:3001**.

### Comptes de demonstration

| Role | Utilisateur | Mot de passe |
|------|-------------|--------------|
| Gestionnaire | `admin` | `admin123` |
| Livreur 1 | `karim.b` | `livreur123` |
| Livreur 2 | `sara.m` | `livreur123` |

### Donnees de demo

- 1 commerce (Snack El Baraka)
- 5 produits (3 snacks + 2 boissons)
- 3 commandes (CMD-1001 a CMD-1003)
- 1 code promo `BIENVENUE` (10% des 10 EUR)

### Pages publiques

- **Commander** : `http://localhost:5173/commander/00000000-0000-0000-0000-000000000001`
- **Suivi commande** : `http://localhost:5173/suivi/CMD-1001`

## Deploiement sur Render.com

### Methode 1 : Blueprint (recommande)

1. Forkez ce repo sur GitHub
2. Allez sur [dashboard.render.com](https://dashboard.render.com)
3. Cliquez **New** > **Blueprint**
4. Connectez votre repo GitHub
5. Render detecte automatiquement `render.yaml` et cree :
   - Une base PostgreSQL (`pro-and-you-db`)
   - Un web service (`pro-and-you`) qui sert le frontend et l'API
6. Attendez que le build et le deploy se terminent
7. Chargez les donnees de demo :
   - Allez dans le shell de votre web service (onglet **Shell**)
   - Executez : `cd /opt/render/project/src && npm run db:seed`

### Methode 2 : Configuration manuelle

1. Creez une base PostgreSQL (plan Free)
2. Creez un Web Service :
   - **Runtime** : Node
   - **Build command** : `npm run install:all && npm run build && npm run db:init`
   - **Start command** : `npm start`
   - **Variables d'environnement** :
     - `DATABASE_URL` : copiez l'Internal Database URL de votre base PostgreSQL
     - `JWT_SECRET` : une chaine aleatoire (ex: `openssl rand -hex 32`)
     - `NODE_ENV` : `production`

### Architecture en production

En production, le serveur Express sert a la fois l'API (`/api/*`) et le frontend (fichiers statiques depuis `client/dist`). Tout fonctionne sur la meme origine, pas besoin de CORS ni de configuration d'URL separee.

Pour un deploiement separe (frontend sur un CDN, backend ailleurs), definissez `VITE_API_URL` au build du frontend :

```bash
VITE_API_URL=https://mon-api.onrender.com npm run build
```

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le frontend et le backend (dev) |
| `npm run build` | Build le frontend pour la production |
| `npm start` | Lance le serveur de production |
| `npm run setup` | Installe + init DB + seed (tout-en-un) |
| `npm run db:init` | Initialise le schema PostgreSQL |
| `npm run db:seed` | Charge les donnees de demo |

## Architecture

```
client/          React 18 + Tailwind CSS + Vite
  src/pages/     Pages principales (Login, Dashboard, Livreur, Client, Suivi)
  src/pages/tabs/  Onglets du dashboard (Tournees, Stats, Stock, Equipe, Historique)
  src/stores/    Zustand (auth, notifications)
  src/utils/     API client avec token JWT en memoire

server/          Express + Socket.IO + PostgreSQL
  src/routes/    API REST (auth, products, orders, tours, promos, stats)
  src/config/    Base de donnees, schema SQL, seed
  src/middleware/ Authentification JWT
  src/utils/     Generateur de numeros, optimiseur de routes

render.yaml      Blueprint Render.com (PostgreSQL + Web Service)
```

## Variables d'environnement

Voir `server/.env.example` pour la configuration complete.

| Variable | Description | Defaut |
|----------|-------------|--------|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://postgres:postgres@localhost:5432/tournee_snack` |
| `JWT_SECRET` | Secret JWT | `tse-dev-secret-key-change-in-production` |
| `PORT` | Port du backend | `3001` |
| `VITE_API_URL` | URL de l'API (build frontend) | vide = meme origine |
