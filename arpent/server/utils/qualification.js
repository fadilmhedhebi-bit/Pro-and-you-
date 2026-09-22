"use strict";

/**
 * Libellés des tranches d'effectif salarié INSEE (codes utilisés par Sirene).
 * cf. https://www.insee.fr/fr/information/2028129 (liste des variables Sirene)
 */
const TRANCHE_EFFECTIF_LABELS = {
  NN: "Effectif non renseigné",
  "00": "0 salarié",
  "01": "1 à 2 salariés",
  "02": "3 à 5 salariés",
  "03": "6 à 9 salariés",
  11: "10 à 19 salariés",
  12: "20 à 49 salariés",
  21: "50 à 99 salariés",
  22: "100 à 199 salariés",
  31: "200 à 249 salariés",
  32: "250 à 499 salariés",
  41: "500 à 999 salariés",
  42: "1 000 à 1 999 salariés",
  51: "2 000 à 4 999 salariés",
  52: "5 000 à 9 999 salariés",
  53: "10 000 salariés et plus",
};

// Tranches correspondant à une TPE (moins de 10 salariés) — cœur de cible
// pour une agence marketing locale : peu de chances d'avoir une équipe
// marketing en interne.
const TPE_TRANCHES = new Set(["00", "01", "02", "03"]);

// Sections NAF dont l'activité repose typiquement sur une clientèle locale
// et bénéficie directement d'une meilleure visibilité en ligne (site,
// réseaux sociaux, fiche d'établissement) : commerce, restauration,
// hébergement, services à la personne, santé/beauté, artisanat.
const NAF_PREFIXES_CIBLES = [
  "47", // commerce de détail
  "56", // restauration
  "55", // hébergement
  "96", // services personnels (coiffure, beauté...)
  "93", // sport et loisirs
  "10",
  "11", // fabrication de denrées / boissons (artisanat alimentaire)
  "74", // autres activités spécialisées (design, photo...)
  "43", // travaux de construction spécialisés (artisanat du bâtiment)
];

function trancheEffectifLabel(code) {
  if (!code) return TRANCHE_EFFECTIF_LABELS.NN;
  return TRANCHE_EFFECTIF_LABELS[code] || TRANCHE_EFFECTIF_LABELS.NN;
}

function isSecteurCible(nafCode) {
  if (!nafCode) return false;
  const prefix2 = nafCode.slice(0, 2);
  return NAF_PREFIXES_CIBLES.includes(prefix2);
}

function ageEnAnnees(dateCreation) {
  if (!dateCreation) return null;
  const created = new Date(dateCreation);
  if (Number.isNaN(created.getTime())) return null;
  const diffMs = Date.now() - created.getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * Calcule un score de prospection (0-100) et les badges associés, à partir
 * des seules données disponibles côté Sirene (effectif, secteur, ancienneté).
 *
 * Important : Sirene ne renseigne ni site web ni réseaux sociaux. Ce n'est
 * pas une donnée manquante par erreur — l'INSEE ne la collecte pas. Le badge
 * "présence web à vérifier" le signale explicitement plutôt que d'inventer
 * un statut ; l'enrichissement (Google Places, contrôle du site déclaré au
 * greffe, etc.) est un chantier ultérieur, pas un mock.
 */
function qualifyCompany(company) {
  const badges = [];
  let score = 40; // base neutre

  const isTpe = TPE_TRANCHES.has(company.trancheEffectif);
  if (isTpe) {
    score += 20;
    badges.push({ label: "TPE — probablement sans équipe marketing", kind: "good" });
  } else if (company.trancheEffectif && company.trancheEffectif !== "NN") {
    score -= 10;
  }

  if (isSecteurCible(company.naf)) {
    score += 20;
    badges.push({ label: "Secteur à forte dépendance à la visibilité locale", kind: "good" });
  }

  const age = ageEnAnnees(company.dateCreation);
  if (age != null) {
    if (age < 3) {
      score += 15;
      badges.push({ label: "Jeune entreprise (< 3 ans)", kind: "good" });
    } else if (age > 15) {
      score -= 5;
      badges.push({ label: "Entreprise établie (> 15 ans)", kind: "neutral" });
    }
  }

  badges.push({ label: "Présence web à vérifier (hors Sirene)", kind: "info" });

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, badges };
}

module.exports = { qualifyCompany, trancheEffectifLabel, isSecteurCible };
