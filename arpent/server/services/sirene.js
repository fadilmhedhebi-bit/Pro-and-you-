"use strict";

const departements = require("../data/departements.json");
const { haversineDistanceKm } = require("../utils/geo");

const BASE_URL = "https://recherche-entreprises.api.gouv.fr/search";
const MAX_PER_PAGE = 25; // limite imposée par l'API
const MAX_PAGES = 6; // garde-fou anti-rate-limit (7 req/s max) — ~150 établissements/département interrogé
const RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_BASE_DELAY_MS = 1000;
const PAGE_PACING_DELAY_MS = 200; // marge de sécurité entre deux pages, sous la limite de 7 req/s

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Interroge l'URL donnée, avec re-tentatives (backoff exponentiel) en cas de
 * 429 — la base Sirene applique une limite de 7 req/s par IP, et une simple
 * salve de requêtes (même séquentielles) peut ponctuellement la dépasser.
 */
async function fetchWithRetry(url, retries = RATE_LIMIT_RETRIES) {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status !== 429 || attempt >= retries) return res;
    await sleep(RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt);
  }
}

/**
 * Rayon approximatif (en km) d'un département français "moyen", utilisé
 * comme marge de sécurité quand on sélectionne les départements à interroger
 * à partir de la distance entre leur centroïde et le point de recherche.
 * Les départements sont grands (jusqu'à ~100km de large), donc la marge
 * évite de rater des communes en bordure de département.
 */
const DEPARTMENT_BUFFER_KM = 60;

/**
 * Détermine la liste des départements dont le centroïde se trouve à moins de
 * (radiusKm + marge) du point de recherche. Approximation volontaire :
 * le filtrage précis se fait ensuite établissement par établissement grâce
 * aux coordonnées réelles renvoyées par l'API.
 */
function selectDepartments(centerLat, centerLng, radiusKm) {
  const reach = radiusKm + DEPARTMENT_BUFFER_KM;
  return departements
    .filter((d) => haversineDistanceKm(centerLat, centerLng, d.lat, d.lng) <= reach)
    .map((d) => d.code);
}

/**
 * Normalise un résultat brut de l'API recherche-entreprises vers le format
 * utilisé par Arpent.
 */
function normalizeCompany(raw) {
  const siege = raw.siege || {};
  const lat = siege.latitude != null ? parseFloat(siege.latitude) : null;
  const lng = siege.longitude != null ? parseFloat(siege.longitude) : null;

  return {
    siren: raw.siren,
    siret: siege.siret || null,
    nom: raw.nom_complet || raw.nom_raison_sociale || "Entreprise sans nom déclaré",
    naf: raw.activite_principale || null,
    nafLibelle: raw.libelle_activite_principale || null,
    adresse: siege.adresse || null,
    codePostal: siege.code_postal || null,
    commune: siege.libelle_commune || null,
    lat,
    lng,
    dateCreation: raw.date_creation || null,
    trancheEffectif: raw.tranche_effectif_salarie || null,
    etatAdministratif: raw.etat_administratif || null,
  };
}

/**
 * Interroge l'API recherche-entreprises pour un ensemble de départements et
 * un ou plusieurs codes d'activité NAF, avec pagination bornée.
 *
 * @param {object} params
 * @param {string[]} params.departementCodes
 * @param {string[]} [params.nafCodes]
 * @returns {Promise<object[]>} entreprises normalisées (non filtrées par rayon)
 */
async function fetchCompanies({ departementCodes, nafCodes }) {
  if (!departementCodes || departementCodes.length === 0) return [];

  const results = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = new URL(BASE_URL);
    url.searchParams.set("departement", departementCodes.join(","));
    url.searchParams.set("etat_administratif", "A");
    url.searchParams.set("per_page", String(MAX_PER_PAGE));
    url.searchParams.set("page", String(page));
    if (nafCodes && nafCodes.length > 0) {
      url.searchParams.set("activite_principale", nafCodes.join(","));
    }

    const res = await fetchWithRetry(url);
    if (res.status === 429) {
      throw new Error("Trop de requêtes vers la base Sirene, réessayez dans quelques secondes.");
    }
    if (!res.ok) {
      throw new Error(`Recherche d'entreprises indisponible (${res.status})`);
    }

    const data = await res.json();
    const pageResults = (data.results || []).map(normalizeCompany);
    results.push(...pageResults);

    totalPages = Math.min(Math.ceil((data.total_results || 0) / MAX_PER_PAGE), MAX_PAGES);
    page += 1;
    if (page <= totalPages) await sleep(PAGE_PACING_DELAY_MS);
  } while (page <= totalPages);

  return results;
}

module.exports = { selectDepartments, fetchCompanies, normalizeCompany };
