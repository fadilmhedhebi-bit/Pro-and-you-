# Arpent

Application de prospection B2B géolocalisée : recense les entreprises dans une zone définie par l'utilisateur (adresse + rayon jusqu'à 200 km), filtrées par secteur d'activité, avec des signaux de qualification pour cibler les prospects les plus pertinents.

## Sources de données

- **[recherche-entreprises.api.gouv.fr](https://recherche-entreprises.api.gouv.fr)** — API officielle, publique et gratuite (Sirene/INSEE), sans clé. Fournit SIREN/SIRET, adresse, code NAF, effectif, coordonnées du siège.
- **[api-adresse.data.gouv.fr](https://api-adresse.data.gouv.fr)** — géocodage d'adresses (Base Adresse Nationale), publique et gratuite.
- **[Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)** — optionnel, à la demande, pour vérifier si une entreprise a un site web. Nécessite une clé API (voir ci-dessous).

Sirene/Adresse ne sont pas scrapées : elles proviennent de bases publiques réutilisables commercialement (Licence Ouverte Etalab), ce qui sécurise la revente du service. Google Places est une source tierce payante, appelée uniquement quand l'utilisateur clique sur « Vérifier présence web » sur une fiche précise — jamais en masse sur une liste de résultats.

## Lancer le projet

```bash
cp .env.example .env   # puis renseignez GOOGLE_PLACES_API_KEY (optionnel)
npm install
npm start        # http://localhost:3000
# ou npm run dev  pour le rechargement automatique
```

### Activer l'enrichissement web (optionnel)

1. Créez un projet sur [Google Cloud Console](https://console.cloud.google.com/), activez la facturation.
2. Activez l'API **Places API (New)**.
3. Créez une clé API et restreignez-la à cette API.
4. Renseignez `GOOGLE_PLACES_API_KEY` dans `.env` (local) ou dans les variables d'environnement du service Render (`arpent` → Environment).

Sans clé configurée, le bouton « Vérifier présence web » renvoie une erreur explicite ; le reste de l'application fonctionne normalement.

## Structure

```
server/
  index.js              serveur Express, sert l'API + le frontend statique
  routes/search.js       endpoints /api/search, /api/adresses, /api/secteurs
  services/sirene.js      appel à recherche-entreprises.api.gouv.fr
  services/geocode.js     appel à api-adresse.data.gouv.fr
  services/places.js      appel à Google Places (enrichissement site web, à la demande)
  utils/geo.js            distance haversine, filtrage par rayon
  utils/qualification.js  score de prospection + badges
  data/departements.json  centroïdes des départements (sélection de la zone à interroger)
  data/secteurs.json      secteurs d'activité -> codes NAF
public/
  index.html, styles.css, app.js   carte Leaflet, filtres, liste, export CSV
```

## Prochaines étapes possibles

- Comptes utilisateurs + sauvegarde de recherches
- Statut de prospection par fiche (contacté, relancé...)
- Export vers CRM (Hubspot, Pipedrive)
