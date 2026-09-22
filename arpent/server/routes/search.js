"use strict";

const express = require("express");
const { geocodeAddress, suggestAddresses } = require("../services/geocode");
const { selectDepartments, fetchCompanies } = require("../services/sirene");
const { filterByRadius } = require("../utils/geo");
const { qualifyCompany } = require("../utils/qualification");
const secteurs = require("../data/secteurs.json");

const router = express.Router();

const MAX_RADIUS_KM = 200;
const MAX_RESULTS_RETURNED = 200;

router.get("/secteurs", (req, res) => {
  res.json(secteurs.map(({ id, label }) => ({ id, label })));
});

router.get("/adresses", async (req, res) => {
  try {
    const q = (req.query.q || "").toString();
    const suggestions = await suggestAddresses(q);
    res.json(suggestions);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { adresse, lat, lng, rayon, secteurs: secteurIds } = req.query;

    // Le centre de recherche peut être fourni soit en lat/lng déjà géocodés
    // (cas normal : le frontend a résolu l'adresse via /api/adresses au moment
    // de la saisie), soit en adresse brute (fallback, ré-géocodée ici).
    let center;
    if (lat && lng) {
      center = { lat: parseFloat(lat), lng: parseFloat(lng) };
    } else if (adresse) {
      center = await geocodeAddress(adresse.toString());
    } else {
      return res.status(400).json({ error: "Indiquez une adresse ou des coordonnées de départ." });
    }

    if (Number.isNaN(center.lat) || Number.isNaN(center.lng)) {
      return res.status(400).json({ error: "Coordonnées de départ invalides." });
    }

    let radiusKm = rayon ? parseFloat(rayon) : 25;
    if (Number.isNaN(radiusKm) || radiusKm <= 0) radiusKm = 25;
    radiusKm = Math.min(radiusKm, MAX_RADIUS_KM);

    const selectedSecteurIds = secteurIds
      ? secteurIds.toString().split(",").filter(Boolean)
      : [];
    const nafCodes = secteurs
      .filter((s) => selectedSecteurIds.includes(s.id))
      .flatMap((s) => s.nafCodes);

    const departementCodes = selectDepartments(center.lat, center.lng, radiusKm);
    if (departementCodes.length === 0) {
      return res.json({ center, radiusKm, total: 0, results: [] });
    }

    const rawCompanies = await fetchCompanies({ departementCodes, nafCodes });
    const inRadius = filterByRadius(rawCompanies, center.lat, center.lng, radiusKm);

    const qualified = inRadius.slice(0, MAX_RESULTS_RETURNED).map((company) => {
      const { score, badges } = qualifyCompany(company);
      return { ...company, score, badges };
    });
    qualified.sort((a, b) => b.score - a.score);

    res.json({
      center,
      radiusKm,
      departementsInterroges: departementCodes,
      total: inRadius.length,
      results: qualified,
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message || "Erreur lors de la recherche." });
  }
});

module.exports = router;
