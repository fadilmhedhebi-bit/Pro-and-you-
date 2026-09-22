"use strict";

/**
 * Wrapper autour de l'API Adresse (api-adresse.data.gouv.fr) — service public,
 * gratuit, sans clé, opéré par la Base Adresse Nationale (Etalab).
 * Sert à convertir une adresse saisie en point de départ (lat/lng),
 * et à alimenter l'autocomplete du champ adresse côté frontend.
 */

const BASE_URL = "https://api-adresse.data.gouv.fr";

/**
 * Recherche des suggestions d'adresses pour une saisie partielle.
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array<{label: string, lat: number, lng: number, city: string, postcode: string}>>}
 */
async function suggestAddresses(query, limit = 5) {
  if (!query || query.trim().length < 3) return [];

  const url = new URL(`${BASE_URL}/search/`);
  url.searchParams.set("q", query.trim());
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Service d'adresse indisponible (${res.status})`);
  }
  const data = await res.json();

  return (data.features || []).map((f) => ({
    label: f.properties.label,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    city: f.properties.city,
    postcode: f.properties.postcode,
  }));
}

/**
 * Géocode une adresse unique — retourne le meilleur résultat.
 * @param {string} query
 */
async function geocodeAddress(query) {
  const results = await suggestAddresses(query, 1);
  if (results.length === 0) {
    throw new Error(`Adresse introuvable : "${query}"`);
  }
  return results[0];
}

module.exports = { suggestAddresses, geocodeAddress };
