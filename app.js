const plantData = [
  {
    name: "PV-Anlage Schule Nord",
    einspeiseMaLo: "DE0073325707820000000000000088943",
    eeArt: "Solar",
    leistungKw: 6.0,
    status: "Aktiv",
    statusClass: "active",
    standort: "Frankfurt am Main"
  },
  {
    name: "Windkraftanlage Westpark",
    einspeiseMaLo: "DE00733257078200000000000000880945",
    eeArt: "Wind",
    leistungKw: 7.0,
    status: "In Prüfung",
    statusClass: "review",
    standort: "Köln"
  },
  {
    name: "PV-Anlage Wohnquartier Süd",
    einspeiseMaLo: "DE0001815707800000101300000139428",
    eeArt: "Solar",
    leistungKw: 5.5,
    status: "Registriert",
    statusClass: "registered",
    standort: "Mülheim an der Ruhr"
  }
];

function formatKw(value) {
  return `${value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kW`;
}

function renderPlantCard(plant) {
  return `
    <article class="plant-card">
      <div class="plant-card-header">
        <div>
          <h3 class="plant-name">${plant.name}</h3>
          <p class="plant-location">${plant.standort}</p>
        </div>
        <span class="status-badge status-badge--${plant.statusClass}">
          ${plant.status}
        </span>
      </div>
      <div class="plant-details">
        <div>
          <span class="detail-label">Einspeise-MaLo</span>
          <span class="detail-value">${plant.einspeiseMaLo}</span>
        </div>
        <div>
          <span class="detail-label">EE-Art</span>
          <span class="detail-value">${plant.eeArt}</span>
        </div>
        <div>
          <span class="detail-label">Leistung</span>
          <span class="detail-value">${formatKw(plant.leistungKw)}</span>
        </div>
        <div>
          <span class="detail-label">Status</span>
          <span class="detail-value">${plant.status}</span>
        </div>
      </div>
      <div class="plant-cta">
        Detailansicht und Zuordnung zur Community folgen in späteren Ausbaustufen.
      </div>
    </article>
  `;
}

function updateSummary(plants) {
  const totalCapacity = plants.reduce((sum, plant) => sum + plant.leistungKw, 0);
  const activePlantCount = plants.filter((plant) => plant.status === "Aktiv").length;

  document.getElementById("plantCount").textContent = plants.length;
  document.getElementById("totalCapacity").textContent = formatKw(totalCapacity);
  document.getElementById("activePlantCount").textContent = activePlantCount;
}

function mountApp() {
  const plantGrid = document.getElementById("plantGrid");
  const notice = document.getElementById("statusNotice");
  const registerButton = document.getElementById("registerPlantButton");

  if (plantGrid) {
    plantGrid.innerHTML = plantData.map(renderPlantCard).join("");
  }

  updateSummary(plantData);

  if (registerButton) {
    registerButton.addEventListener("click", () => {
      if (notice) {
        notice.hidden = false;
      }
      // Registration workflow is intentionally not implemented in this MVP step.
    });
  }
}

document.addEventListener("DOMContentLoaded", mountApp);
