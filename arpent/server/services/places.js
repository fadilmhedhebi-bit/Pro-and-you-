"use strict";

/**
 * Wrapper autour de Google Places API (New) — Text Search.
 * Sirene ne contient ni site web ni réseaux sociaux ; on interroge Places
 * par nom + adresse pour savoir si l'entreprise a une fiche avec un site.
 * Appelé à la demande (un établissement à la fois), jamais en masse sur une
 * liste de résultats, pour garder le coût et la latence sous contrôle.
 */

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
].join(",");

/**
 * @param {object} params
 * @param {string} params.nom
 * @param {string} [params.adresse]
 * @param {string} [params.commune]
 * @returns {Promise<{found: boolean, siteWeb?: string|null, telephone?: string|null, note?: number|null, avis?: number|null}>}
 */
async function findWebPresence({ nom, adresse, commune }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY n'est pas configurée sur le serveur.");
  }

  const query = [nom, adresse, commune].filter(Boolean).join(", ");
  if (!query) {
    throw new Error("Nom d'entreprise requis pour l'enrichissement.");
  }

  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, languageCode: "fr", regionCode: "FR" }),
  });

  if (!res.ok) {
    throw new Error(`Google Places indisponible (${res.status})`);
  }

  const data = await res.json();
  const place = (data.places || [])[0];
  if (!place) {
    return { found: false };
  }

  return {
    found: true,
    placeId: place.id || null,
    nomTrouve: place.displayName?.text || null,
    siteWeb: place.websiteUri || null,
    telephone: place.nationalPhoneNumber || null,
    note: place.rating ?? null,
    avis: place.userRatingCount ?? null,
  };
}

module.exports = { findWebPresence };
