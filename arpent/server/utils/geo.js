"use strict";

const EARTH_RADIUS_KM = 6371;

/**
 * Distance à vol d'oiseau entre deux points (formule de haversine), en km.
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Filtre une liste d'entreprises géolocalisées à celles situées à moins de
 * radiusKm du centre donné, et ajoute la distance calculée (km, arrondie au
 * dixième) à chaque résultat. Les entreprises sans coordonnées exploitables
 * sont écartées plutôt que gardées "au cas où".
 */
function filterByRadius(companies, centerLat, centerLng, radiusKm) {
  const withDistance = [];
  for (const company of companies) {
    if (company.lat == null || company.lng == null || Number.isNaN(company.lat) || Number.isNaN(company.lng)) {
      continue;
    }
    const distanceKm = haversineDistanceKm(centerLat, centerLng, company.lat, company.lng);
    if (distanceKm <= radiusKm) {
      withDistance.push({ ...company, distanceKm: Math.round(distanceKm * 10) / 10 });
    }
  }
  withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  return withDistance;
}

module.exports = { haversineDistanceKm, filterByRadius };
