# Arpent

Application de prospection B2B géolocalisée : recense les entreprises dans une zone définie par l'utilisateur (adresse + rayon jusqu'à 200 km), filtrées par secteur d'activité, avec des signaux de qualification pour cibler les prospects les plus pertinents.

## Sources de données

- **[recherche-entreprises.api.gouv.fr](https://recherche-entreprises.api.gouv.fr)** — API officielle, publique et gratuite (Sirene/INSEE), sans clé. Fournit SIREN/SIRET, adresse, code NAF, effectif, coordonnées du siège.
- **[api-adresse.data.gouv.fr](https://api-adresse.data.gouv.fr)** — géocodage d'adresses (Base Adresse Nationale), publique et gratuite.

Aucune donnée n'est scrapée : tout provient de bases publiques réutilisables commercialement (Licence Ouverte Etalab), ce qui sécurise la revente du service.

**Limite connue** : ni le site web ni les réseaux sociaux d'une entreprise ne sont dans Sirene. Le score de qualification actuel se base donc sur l'effectif, le secteur et l'ancienneté ; l'enrichissement web (Google Places ou équivalent) est la prochaine étape logique, pas encore branché.

## Lancer le projet

```bash
npm install
npm start        # http://localhost:3000
# ou npm run dev  pour le rechargement automatique
```

## Structure

```
server/
  index.js              serveur Express, sert l'API + le frontend statique
  routes/search.js       endpoints /api/search, /api/adresses, /api/secteurs
  services/sirene.js      appel à recherche-entreprises.api.gouv.fr
  services/geocode.js     appel à api-adresse.data.gouv.fr
  utils/geo.js            distance haversine, filtrage par rayon
  utils/qualification.js  score de prospection + badges
  data/departements.json  centroïdes des départements (sélection de la zone à interroger)
  data/secteurs.json      secteurs d'activité -> codes NAF
public/
  index.html, styles.css, app.js   carte Leaflet, filtres, liste, export CSV
```

## Prochaines étapes possibles

- Enrichissement site web / réseaux sociaux (API tierce)
- Comptes utilisateurs + sauvegarde de recherches
- Statut de prospection par fiche (contacté, relancé...)
- Export vers CRM (Hubspot, Pipedrive)
