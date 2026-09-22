"use strict";

const state = {
  center: null, // { lat, lng, label }
  radiusKm: 25,
  secteurs: [], // ids sélectionnés
  results: [],
  markers: [],
  radiusCircle: null,
};

const els = {
  addrInput: document.getElementById("addr-input"),
  suggestions: document.getElementById("addr-suggestions"),
  radiusInput: document.getElementById("radius-input"),
  radiusValue: document.getElementById("radius-value"),
  chipGroup: document.getElementById("secteur-chips"),
  searchBtn: document.getElementById("search-btn"),
  exportBtn: document.getElementById("export-btn"),
  resultsList: document.getElementById("results-list"),
  resultsTitle: document.getElementById("results-title"),
  statusBar: document.getElementById("status-bar"),
};

// ---------- Carte ----------
const map = L.map("map", { zoomControl: true }).setView([43.6108, 3.8767], 8); // Montpellier par défaut
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 18,
}).addTo(map);

const centerMarkerIcon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#1B2430;border:2px solid #fff;box-shadow:0 0 0 2px #1B2430;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
let centerMarker = null;

function setStatus(text, isError = false) {
  els.statusBar.textContent = text;
  els.statusBar.classList.toggle("error", isError);
}

// ---------- Secteurs ----------
async function loadSecteurs() {
  const res = await fetch("/api/secteurs");
  const secteurs = await res.json();
  els.chipGroup.innerHTML = "";
  secteurs.forEach((s) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = s.label;
    chip.dataset.id = s.id;
    chip.addEventListener("click", () => {
      chip.classList.toggle("on");
      state.secteurs = [...els.chipGroup.querySelectorAll(".chip.on")].map((c) => c.dataset.id);
    });
    els.chipGroup.appendChild(chip);
  });
}

// ---------- Autocomplete adresse ----------
let addrDebounce = null;
els.addrInput.addEventListener("input", () => {
  clearTimeout(addrDebounce);
  const q = els.addrInput.value;
  if (q.trim().length < 3) {
    els.suggestions.hidden = true;
    return;
  }
  addrDebounce = setTimeout(async () => {
    try {
      const res = await fetch(`/api/adresses?q=${encodeURIComponent(q)}`);
      const list = await res.json();
      renderSuggestions(list);
    } catch (err) {
      els.suggestions.hidden = true;
    }
  }, 250);
});

function renderSuggestions(list) {
  els.suggestions.innerHTML = "";
  if (!list.length) {
    els.suggestions.hidden = true;
    return;
  }
  list.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.label;
    li.addEventListener("click", () => {
      els.addrInput.value = item.label;
      state.center = { lat: item.lat, lng: item.lng, label: item.label };
      els.suggestions.hidden = true;
      placeCenterMarker();
    });
    els.suggestions.appendChild(li);
  });
  els.suggestions.hidden = false;
}

document.addEventListener("click", (e) => {
  if (!els.suggestions.contains(e.target) && e.target !== els.addrInput) {
    els.suggestions.hidden = true;
  }
});

function placeCenterMarker() {
  if (!state.center) return;
  const { lat, lng } = state.center;
  if (centerMarker) map.removeLayer(centerMarker);
  centerMarker = L.marker([lat, lng], { icon: centerMarkerIcon }).addTo(map);
  map.setView([lat, lng], 10);
}

// ---------- Rayon ----------
els.radiusInput.addEventListener("input", () => {
  state.radiusKm = parseInt(els.radiusInput.value, 10);
  els.radiusValue.textContent = state.radiusKm;
});

// ---------- Recherche ----------
els.searchBtn.addEventListener("click", runSearch);

async function ensureCenter() {
  if (state.center) return state.center;
  // Fallback : géocoder le texte actuel du champ si l'utilisateur n'a pas
  // cliqué une suggestion.
  const q = els.addrInput.value.trim();
  if (!q) throw new Error("Indiquez une adresse de départ.");
  const res = await fetch(`/api/adresses?q=${encodeURIComponent(q)}`);
  const list = await res.json();
  if (!list.length) throw new Error(`Adresse introuvable : "${q}"`);
  state.center = { lat: list[0].lat, lng: list[0].lng, label: list[0].label };
  placeCenterMarker();
  return state.center;
}

async function runSearch() {
  els.searchBtn.disabled = true;
  els.exportBtn.disabled = true;
  setStatus("Recherche en cours…");
  els.resultsList.innerHTML = '<div class="loading-state">Recherche des établissements dans la zone…</div>';

  try {
    const center = await ensureCenter();
    const params = new URLSearchParams({
      lat: center.lat,
      lng: center.lng,
      rayon: state.radiusKm,
    });
    if (state.secteurs.length) params.set("secteurs", state.secteurs.join(","));

    const res = await fetch(`/api/search?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur lors de la recherche.");

    state.results = data.results;
    renderResults(data);
    renderMapMarkers(data);
    setStatus(`${data.total} établissement(s) trouvé(s) dans un rayon de ${data.radiusKm} km`);
    els.exportBtn.disabled = data.results.length === 0;
  } catch (err) {
    setStatus(err.message, true);
    els.resultsList.innerHTML = `<div class="error-state">${escapeHtml(err.message)}</div>`;
  } finally {
    els.searchBtn.disabled = false;
  }
}

// ---------- Rendu résultats ----------
function renderResults(data) {
  els.resultsTitle.textContent = `Résultats (${data.results.length})`;
  els.resultsList.innerHTML = "";

  if (data.results.length === 0) {
    els.resultsList.innerHTML = '<div class="empty-state">Aucune entreprise ne correspond à ces critères. Élargissez le rayon ou les secteurs.</div>';
    return;
  }

  data.results.forEach((company) => {
    const card = document.createElement("div");
    card.className = "company-card";
    card.dataset.siren = company.siren;

    const badgesHtml = company.badges
      .map((b) => `<span class="badge ${b.kind}">${escapeHtml(b.label)}</span>`)
      .join("");

    card.innerHTML = `
      <div class="cc-top">
        <div>
          <div class="cc-name">${escapeHtml(company.nom)}</div>
          <div class="cc-naf">${escapeHtml(company.naf || "NAF inconnu")} — ${escapeHtml(company.nafLibelle || "")}</div>
        </div>
        <div class="cc-score">${company.score}<span class="lbl">score</span></div>
      </div>
      <div class="cc-meta">
        <span>${escapeHtml([company.adresse, company.codePostal, company.commune].filter(Boolean).join(", "))}</span>
        <span class="mono">${company.distanceKm} km du centre</span>
        <span class="mono">SIRET ${escapeHtml(company.siret || "—")}</span>
      </div>
      <div class="cc-badges">${badgesHtml}</div>
    `;
    card.addEventListener("click", () => focusCompanyOnMap(company));
    els.resultsList.appendChild(card);
  });
}

function renderMapMarkers(data) {
  state.markers.forEach((m) => map.removeLayer(m));
  state.markers = [];
  if (state.radiusCircle) map.removeLayer(state.radiusCircle);

  state.radiusCircle = L.circle([data.center.lat, data.center.lng], {
    radius: data.radiusKm * 1000,
    color: "#C1732F",
    weight: 1.5,
    dashArray: "5 5",
    fillColor: "#C1732F",
    fillOpacity: 0.05,
  }).addTo(map);

  const bounds = [[data.center.lat, data.center.lng]];
  data.results.forEach((company) => {
    if (company.lat == null || company.lng == null) return;
    const marker = L.circleMarker([company.lat, company.lng], {
      radius: 6,
      color: "#fff",
      weight: 2,
      fillColor: "#C1732F",
      fillOpacity: 0.9,
    }).addTo(map);
    marker.bindPopup(
      `<strong>${escapeHtml(company.nom)}</strong><br>${escapeHtml(company.adresse || "")}<br>Score : ${company.score}`
    );
    marker.on("click", () => highlightCard(company.siren));
    state.markers.push(marker);
    bounds.push([company.lat, company.lng]);
  });

  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
  }
}

function focusCompanyOnMap(company) {
  if (company.lat == null || company.lng == null) return;
  map.setView([company.lat, company.lng], 14);
  highlightCard(company.siren);
  const marker = state.markers.find(
    (m) => m.getLatLng().lat === company.lat && m.getLatLng().lng === company.lng
  );
  if (marker) marker.openPopup();
}

function highlightCard(siren) {
  document.querySelectorAll(".company-card").forEach((c) => {
    c.classList.toggle("highlight", c.dataset.siren === siren);
  });
}

// ---------- Export CSV ----------
els.exportBtn.addEventListener("click", () => {
  if (!state.results.length) return;
  const headers = ["Nom", "SIREN", "SIRET", "NAF", "Activité", "Adresse", "Code postal", "Commune", "Distance (km)", "Score", "Signaux"];
  const rows = state.results.map((c) => [
    c.nom,
    c.siren,
    c.siret || "",
    c.naf || "",
    c.nafLibelle || "",
    c.adresse || "",
    c.codePostal || "",
    c.commune || "",
    c.distanceKm,
    c.score,
    c.badges.map((b) => b.label).join(" | "),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(";"))
    .join("\r\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `arpent-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[;"\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---------- Init ----------
(async function init() {
  await loadSecteurs();
  setStatus("Prêt — choisissez une adresse et lancez la recherche.");
})();
