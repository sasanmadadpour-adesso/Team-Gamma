/**
 * Prototype context data for the dashboard.
 *
 * These values are intentionally marked as prototype/demo data. They are
 * centralized here so later integrations can replace them with actual
 * community, grid, metering, and measurement data without changing rendering.
 */
const prototypeContext = {
  community: {
    name: "Community Sonnenviertel",
    status: "Aktiv"
  },
  operator: {
    name: "Max Mustermann"
  },
  participation: {
    count: 24
  },
  grid: {
    // Temporary demo data. Replace later with integrated BTP/S/4 Bilanzierungsgebiet data.
    bilanzierungsgebiet: "Dortmund Netzgebiet 01",
    // Temporary demo data. Replace later with integrated Bilanzkreis/EIC data.
    bilanzkreisId: "11X-DEMO-ENERGY-1"
  },
  metering: {
    // Temporary demo data. Replace later with the actual Messlokation.
    messlokationId: "DE000562668020000000000000000001",
    meteringSystem: "iMSys",
    // Temporary demo data. Replace later with the actual MSB identifier.
    meteringOperator: "Westnetz GmbH"
  },
  dailyEnergy: {
    // Temporary MVP/demo energy values. Replace with integrated metering/backend values later.
    productionKwh: 42.8,
    communityUsageKwh: 31.6,
    surplusKwh: 11.2
  },
  economics: {
    // Temporary MVP/demo price values. Replace with integrated settlement/market values later.
    communityCompensationPerKwh: 0.24,
    directMarketingPricePerKwh: 0.09
  },
  energySeries: {
    // Future intended granularity: 15-minute measurement intervals.
    production: buildProductionEnergySeries(),
    communityConsumption: buildCommunityConsumptionEnergySeries()
  }
};

function buildProductionEnergySeries() {
  const series = [];

  for (let index = 0; index <= 96; index += 1) {
    const hour = index / 4;
    let value = 0;

    if (hour >= 5.5 && hour <= 18.5) {
      const normalizedHour = (hour - 5.5) / (18.5 - 5.5);
      value = Math.sin(normalizedHour * Math.PI) ** 2 * 5.2;
      value += Math.sin(index * 0.37) * 0.15;
      if (value < 0) {
        value = 0;
      }
    }

    series.push(Number(value.toFixed(3)));
  }

  return series;
}

function buildCommunityConsumptionEnergySeries() {
  const series = [];

  for (let index = 0; index <= 96; index += 1) {
    const hour = index / 4;
    const baseLoad = 1.4;
    const morningPeak = 2.3 * Math.exp(-Math.pow((hour - 7.5) / 1.7, 2));
    const middayPeak = 1.0 * Math.exp(-Math.pow((hour - 12.3) / 1.4, 2));
    const eveningPeak = 3.0 * Math.exp(-Math.pow((hour - 19.2) / 2.1, 2));
    const variation = Math.cos(index * 0.9) * 0.12;
    let value = baseLoad + morningPeak + middayPeak + eveningPeak + variation;

    if (value < 0.5) {
      value = 0.5;
    }

    series.push(Number(value.toFixed(3)));
  }

  return series;
}

/**
 * Prototype plant data.
 */
const initialPlantData = [
  {
    name: "PV-Anlage Schule Nord",
    einspeiseMaLo: "DE0073325707820000000000000088943",
    eeArt: "Solar",
    leistungKw: 6.0,
    status: "In Betrieb",
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

/**
 * Prototype-only persistence abstraction.
 */
const plantStorage = {
  storageKey: "team-gamma.einspeisung.prototype.plants",

  load() {
    try {
      const rawValue = window.localStorage.getItem(this.storageKey);
      if (!rawValue) {
        return [];
      }

      const parsedValue = JSON.parse(rawValue);
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch (error) {
      console.warn("Persisted plant data could not be loaded.", error);
      return [];
    }
  },

  save(plants) {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(plants));
    } catch (error) {
      console.warn("Persisted plant data could not be saved.", error);
    }
  },

  upsertPlant(plant) {
    const persistedPlants = this.load();
    const normalizedPlant = normalizePlant(plant);
    const existingIndex = persistedPlants.findIndex(
      (item) => item.einspeiseMaLo === normalizedPlant.einspeiseMaLo
    );

    if (existingIndex >= 0) {
      persistedPlants[existingIndex] = normalizedPlant;
    } else {
      persistedPlants.push(normalizedPlant);
    }

    this.save(persistedPlants);
    return persistedPlants;
  },

  clear() {
    try {
      window.localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn("Persisted plant data could not be cleared.", error);
    }
  }
};

function normalizePlant(plant) {
  return {
    name: plant.name,
    einspeiseMaLo: plant.einspeiseMaLo,
    eeArt: plant.eeArt,
    leistungKw: Number(plant.leistungKw),
    status: plant.status,
    statusClass: plant.statusClass,
    standort: plant.standort
  };
}

function upsertPlantInList(plants, plant) {
  const normalizedPlant = normalizePlant(plant);
  const existingIndex = plants.findIndex(
    (item) => item.einspeiseMaLo === normalizedPlant.einspeiseMaLo
  );

  if (existingIndex >= 0) {
    plants[existingIndex] = normalizedPlant;
  } else {
    plants.push(normalizedPlant);
  }

  return plants;
}

function mergePersistedPlants(plants) {
  const mergedPlants = plants.map(normalizePlant);
  plantStorage.load().forEach((plant) => {
    upsertPlantInList(mergedPlants, plant);
  });
  return mergedPlants;
}

let plantData = mergePersistedPlants(initialPlantData);

let draftPlant = null;
let externalResult = null;
let takeoverConfirmed = false;
let checkTimers = [];
let takeoverTimers = [];

const views = {
  overview: document.getElementById("overviewView"),
  registration: document.getElementById("registrationView"),
  summary: document.getElementById("summaryView"),
  check: document.getElementById("checkView"),
  takeover: document.getElementById("takeoverView"),
  result: document.getElementById("resultView")
};

const form = document.getElementById("plantRegistrationForm");
const malooInput = document.getElementById("einspeiseMaLoInput");
const eeArtInput = document.getElementById("eeArtInput");
const leistungInput = document.getElementById("leistungInput");
const malooError = document.getElementById("maLoError");
const eeArtError = document.getElementById("eeArtError");
const leistungError = document.getElementById("leistungError");

const checkMaLo = document.getElementById("checkMaLo");
const checkEeArt = document.getElementById("checkEeArt");
const checkLeistung = document.getElementById("checkLeistung");
const checkEeStatus = document.getElementById("checkEeStatus");
const checkAreaStatus = document.getElementById("checkAreaStatus");
const checkMeterStatus = document.getElementById("checkMeterStatus");
const checkSuccessMessage = document.getElementById("checkSuccessMessage");
const checkInfoMessage = document.getElementById("checkInfoMessage");

const takeoverMaLo = document.getElementById("takeoverMaLo");
const takeoverEeArt = document.getElementById("takeoverEeArt");
const takeoverLeistung = document.getElementById("takeoverLeistung");
const takeoverStatusMessage = document.getElementById("takeoverStatusMessage");
const takeoverSuccessExplanation = document.getElementById("takeoverSuccessExplanation");
const takeoverDemoSection = document.getElementById("takeoverDemoSection");
const simulateTakeoverButton = document.getElementById("simulateTakeoverButton");

const externalProcessing = {
  received: document.getElementById("externalResponseReceivedText"),
  status: document.getElementById("externalResponseStatusText"),
  release: document.getElementById("plantReleaseText"),
  plantStatus: document.getElementById("plantStatusText"),
  heading: document.getElementById("resultHeading"),
  badge: document.getElementById("resultStatus"),
  maloo: document.getElementById("resultMaLo"),
  eeArt: document.getElementById("resultEeArt"),
  leistung: document.getElementById("resultLeistung"),
  explanation: document.getElementById("resultExplanation")
};

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
      </div>
      <div class="plant-cta">
        Detailansicht und Zuordnung zur Community folgen in späteren Ausbaustufen.
      </div>
    </article>
  `;
}

function updateSummary() {
  const plantCountElement = document.getElementById("plantCount");
  const totalCapacityElement = document.getElementById("totalCapacity");
  const activePlantCountElement = document.getElementById("activePlantCount");

  if (!plantCountElement && !totalCapacityElement && !activePlantCountElement) {
    return;
  }

  const totalCapacity = plantData.reduce((sum, plant) => sum + plant.leistungKw, 0);
  const activePlantCount = plantData.filter((plant) => plant.status === "Aktiv").length;

  if (plantCountElement) {
    plantCountElement.textContent = plantData.length;
  }
  if (totalCapacityElement) {
    totalCapacityElement.textContent = formatKw(totalCapacity);
  }
  if (activePlantCountElement) {
    activePlantCountElement.textContent = activePlantCount;
  }
}

function clearCheckTimers() {
  checkTimers.forEach((timer) => window.clearTimeout(timer));
  checkTimers = [];
}

function clearTakeoverTimers() {
  takeoverTimers.forEach((timer) => window.clearTimeout(timer));
  takeoverTimers = [];
}

function showView(viewName) {
  clearCheckTimers();
  clearTakeoverTimers();
  Object.entries(views).forEach(([name, element]) => {
    if (element) {
      element.hidden = name !== viewName;
    }
  });

  if (viewName === "registration" && malooInput) {
    malooInput.focus();
  }
}

function renderDashboardContext() {
  const setValue = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  };

  setValue("communityName", prototypeContext.community.name);
  setValue("communityStatus", prototypeContext.community.status);
  setValue("operatorName", `Anlagenbetreiber: ${prototypeContext.operator.name}`);
  setValue("participantCount", prototypeContext.participation.count);
  setValue("bilanzierungsgebietValue", prototypeContext.grid.bilanzierungsgebiet);
  setValue("bilanzkreisValue", prototypeContext.grid.bilanzkreisId);
  setValue("messlokationValue", prototypeContext.metering.messlokationId);
  setValue("messsystemValue", prototypeContext.metering.meteringSystem);
  setValue("msbValue", prototypeContext.metering.meteringOperator);

  renderEnergyChart(document.getElementById("energyChart"), prototypeContext.energySeries);
}

function createSmoothSvgPath(points) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previousPoint = points[Math.max(0, index - 1)];
    const currentPoint = points[index];
    const nextPoint = points[index + 1];
    const followingPoint = points[Math.min(points.length - 1, index + 2)];

    const controlPoint1X = currentPoint.x + (nextPoint.x - previousPoint.x) / 6;
    const controlPoint1Y = currentPoint.y + (nextPoint.y - previousPoint.y) / 6;
    const controlPoint2X = nextPoint.x - (followingPoint.x - currentPoint.x) / 6;
    const controlPoint2Y = nextPoint.y - (followingPoint.y - currentPoint.y) / 6;

    path += ` C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${nextPoint.x} ${nextPoint.y}`;
  }

  return path;
}

function renderEnergyChart(container, energySeries) {
  if (!container || !energySeries) {
    return;
  }

  const width = 640;
  const height = 300;
  const padding = { top: 16, right: 14, bottom: 34, left: 44 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const pointCount = energySeries.production.length;
  const allValues = [...energySeries.production, ...energySeries.communityConsumption];
  const maxValue = Math.max(...allValues, 1);
  const roundedMax = Math.ceil(maxValue * 1.15);

  const xForIndex = (index) => padding.left + (index / (pointCount - 1)) * innerWidth;
  const yForValue = (value) => padding.top + innerHeight - (value / roundedMax) * innerHeight;

  const productionPoints = energySeries.production.map((value, index) => ({
    x: xForIndex(index),
    y: yForValue(value)
  }));
  const consumptionPoints = energySeries.communityConsumption.map((value, index) => ({
    x: xForIndex(index),
    y: yForValue(value)
  }));

  const productionPath = createSmoothSvgPath(productionPoints);
  const consumptionPath = createSmoothSvgPath(consumptionPoints);

  const yTicks = [];
  for (let value = 0; value <= roundedMax; value += Math.max(1, Math.round(roundedMax / 4))) {
    if (value > roundedMax) {
      break;
    }
    yTicks.push(value);
  }
  if (!yTicks.includes(roundedMax)) {
    yTicks.push(roundedMax);
  }

  const xLabels = [
    { index: 0, label: "00:00" },
    { index: 24, label: "06:00" },
    { index: 48, label: "12:00" },
    { index: 72, label: "18:00" },
    { index: 96, label: "24:00" }
  ];

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Tagesverlauf von Erzeugung und Community-Verbrauch" preserveAspectRatio="xMidYMid meet">
      ${yTicks.map((value) => `
        <line class="chart-grid" x1="${padding.left}" y1="${yForValue(value)}" x2="${width - padding.right}" y2="${yForValue(value)}"></line>
        <text class="chart-axis-label" x="${padding.left - 8}" y="${yForValue(value) + 4}" text-anchor="end">${value}</text>
      `).join("")}
      <line class="chart-grid" x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${width - padding.right}" y2="${padding.top + innerHeight}"></line>
      ${xLabels.map((label) => `
        <text class="chart-axis-label" x="${xForIndex(label.index)}" y="${height - 10}" text-anchor="middle">${label.label}</text>
      `).join("")}
      <text class="chart-axis-label" x="8" y="${padding.top + innerHeight / 2}" text-anchor="middle" transform="rotate(-90 8 ${padding.top + innerHeight / 2})">kWh</text>
      <path class="chart-series-production" d="${productionPath}"></path>
      <path class="chart-series-consumption" d="${consumptionPath}"></path>
    </svg>
    <div class="chart-legend">
      <span class="chart-legend-item">
        <span class="chart-legend-swatch production"></span>
        Erzeugung der Anlage
      </span>
      <span class="chart-legend-item">
        <span class="chart-legend-swatch consumption"></span>
        Community-Verbrauch
      </span>
    </div>
  `;
}

function formatKwh(value) {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatEuroPerKwh(value) {
  return `${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/kWh`;
}

function formatEuro(value) {
  return `${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function renderEnergyEarnings(context) {
  const dailyEnergy = context.dailyEnergy;
  const economics = context.economics;

  const communityUsagePercent = (dailyEnergy.communityUsageKwh / dailyEnergy.productionKwh) * 100;
  const communityRevenue = dailyEnergy.communityUsageKwh * economics.communityCompensationPerKwh;
  const directMarketingRevenue = dailyEnergy.surplusKwh * economics.directMarketingPricePerKwh;
  const totalRevenue = communityRevenue + directMarketingRevenue;

  const setValue = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  };

  setValue("dailyProductionValue", formatKwh(dailyEnergy.productionKwh));
  setValue("dailyCommunityUsageValue", formatKwh(dailyEnergy.communityUsageKwh));
  setValue("dailySurplusValue", formatKwh(dailyEnergy.surplusKwh));
  setValue(
    "dailyCommunityUsagePercent",
    `${communityUsagePercent.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % der Erzeugung in der Community genutzt`
  );
  setValue("communityCompensationValue", formatEuroPerKwh(economics.communityCompensationPerKwh));
  setValue("directMarketingPriceValue", formatEuroPerKwh(economics.directMarketingPricePerKwh));
  setValue("communityRevenueValue", formatEuro(communityRevenue));
  setValue("directMarketingRevenueValue", formatEuro(directMarketingRevenue));
  setValue("totalRevenueValue", formatEuro(totalRevenue));
  setValue("surplusMarketingValue", `${formatKwh(dailyEnergy.surplusKwh)} kWh → Direktvermarktung`);
}

function clearErrors() {
  [malooInput, eeArtInput, leistungInput].forEach((input) => {
    if (input) {
      input.setAttribute("aria-invalid", "false");
    }
  });

  if (malooError) {
    malooError.textContent = "";
  }
  if (eeArtError) {
    eeArtError.textContent = "";
  }
  if (leistungError) {
    leistungError.textContent = "";
  }
}

function setError(input, errorElement, message) {
  if (input) {
    input.setAttribute("aria-invalid", "true");
  }
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function validateForm() {
  clearErrors();
  let isValid = true;

  const malooValue = malooInput ? malooInput.value.trim() : "";
  const eeArtValue = eeArtInput ? eeArtInput.value : "";
  const leistungValue = leistungInput ? leistungInput.value : "";
  const leistungNumber = Number(leistungValue);

  if (!malooValue) {
    setError(malooInput, malooError, "Bitte geben Sie eine Einspeise-MaLo ein.");
    isValid = false;
  }

  if (!eeArtValue) {
    setError(eeArtInput, eeArtError, "Bitte wählen Sie eine EE-Art aus.");
    isValid = false;
  }

  if (!leistungValue.trim() || Number.isNaN(leistungNumber) || leistungNumber <= 0) {
    setError(leistungInput, leistungError, "Bitte geben Sie eine Leistung größer als 0 kW ein.");
    isValid = false;
  }

  return isValid;
}

function populateFormFromDraft() {
  if (!draftPlant || !form) {
    return;
  }

  if (malooInput) {
    malooInput.value = draftPlant.einspeiseMaLo;
  }
  if (eeArtInput) {
    eeArtInput.value = draftPlant.eeArt;
  }
  if (leistungInput) {
    leistungInput.value = String(draftPlant.leistungKw);
  }
}

function resetForm() {
  if (form) {
    form.reset();
  }
  clearErrors();
  draftPlant = null;
  externalResult = null;
  takeoverConfirmed = false;
}

function populateSummary() {
  const summaryMaloo = document.getElementById("summaryMaLo");
  const summaryEeArt = document.getElementById("summaryEeArt");
  const summaryLeistung = document.getElementById("summaryLeistung");

  if (summaryMaloo && draftPlant) {
    summaryMaloo.textContent = draftPlant.einspeiseMaLo;
  }
  if (summaryEeArt && draftPlant) {
    summaryEeArt.textContent = draftPlant.eeArt;
  }
  if (summaryLeistung && draftPlant) {
    summaryLeistung.textContent = formatKw(draftPlant.leistungKw);
  }
}

function resetCheckDisplay() {
  if (checkEeStatus) {
    checkEeStatus.textContent = "Wird geprüft…";
    checkEeStatus.className = "check-status check-status--pending";
  }
  if (checkAreaStatus) {
    checkAreaStatus.textContent = "Wird geprüft…";
    checkAreaStatus.className = "check-status check-status--pending";
  }
  if (checkMeterStatus) {
    checkMeterStatus.textContent = "Wird geprüft…";
    checkMeterStatus.className = "check-status check-status--pending";
  }
  if (checkSuccessMessage) {
    checkSuccessMessage.hidden = true;
  }
  if (checkInfoMessage) {
    checkInfoMessage.hidden = true;
  }
  if (continueToTakeoverButton) {
    continueToTakeoverButton.disabled = true;
  }
}

function populateCheckFromDraft() {
  if (!draftPlant) {
    return;
  }

  if (checkMaLo) {
    checkMaLo.textContent = draftPlant.einspeiseMaLo;
  }
  if (checkEeArt) {
    checkEeArt.textContent = draftPlant.eeArt;
  }
  if (checkLeistung) {
    checkLeistung.textContent = formatKw(draftPlant.leistungKw);
  }
}

function startChecks() {
  resetCheckDisplay();

  checkTimers.push(
    window.setTimeout(() => {
      if (checkEeStatus) {
        checkEeStatus.textContent = "erfüllt";
        checkEeStatus.className = "check-status check-status--success";
      }
    }, 650)
  );

  checkTimers.push(
    window.setTimeout(() => {
      if (checkAreaStatus) {
        checkAreaStatus.textContent = "erfüllt";
        checkAreaStatus.className = "check-status check-status--success";
      }
    }, 1300)
  );

  checkTimers.push(
    window.setTimeout(() => {
      if (checkMeterStatus) {
        checkMeterStatus.textContent = "vorhanden";
        checkMeterStatus.className = "check-status check-status--success";
      }
    }, 1950)
  );

  checkTimers.push(
    window.setTimeout(() => {
      if (checkSuccessMessage) {
        checkSuccessMessage.hidden = false;
      }
      if (checkInfoMessage) {
        checkInfoMessage.hidden = false;
      }
      if (continueToTakeoverButton) {
        continueToTakeoverButton.disabled = false;
      }
    }, 2450)
  );
}

function populateTakeoverFromDraft() {
  if (!draftPlant) {
    return;
  }

  if (takeoverMaLo) {
    takeoverMaLo.textContent = draftPlant.einspeiseMaLo;
  }
  if (takeoverEeArt) {
    takeoverEeArt.textContent = draftPlant.eeArt;
  }
  if (takeoverLeistung) {
    takeoverLeistung.textContent = formatKw(draftPlant.leistungKw);
  }
}

function resetTakeoverDisplay() {
  if (takeoverStatusMessage) {
    takeoverStatusMessage.textContent = "Bereit zur Simulation der Übernahme.";
    takeoverStatusMessage.className = "status-notice";
  }
  if (takeoverSuccessExplanation) {
    takeoverSuccessExplanation.hidden = true;
  }
  if (takeoverDemoSection) {
    takeoverDemoSection.hidden = true;
  }
  if (simulateTakeoverButton) {
    simulateTakeoverButton.disabled = false;
  }
}

function setTakeoverConfirmedState() {
  if (takeoverStatusMessage) {
    takeoverStatusMessage.textContent = "Übernahme bestätigt";
    takeoverStatusMessage.className = "status-success";
  }
  if (takeoverSuccessExplanation) {
    takeoverSuccessExplanation.hidden = false;
  }
  if (takeoverDemoSection) {
    takeoverDemoSection.hidden = false;
  }
  if (simulateTakeoverButton) {
    simulateTakeoverButton.disabled = true;
  }
}

function startTakeoverSimulation() {
  if (takeoverConfirmed) {
    setTakeoverConfirmedState();
    return;
  }

  if (simulateTakeoverButton) {
    simulateTakeoverButton.disabled = true;
  }
  if (takeoverStatusMessage) {
    takeoverStatusMessage.textContent = "Übernahme wird bestätigt…";
    takeoverStatusMessage.className = "status-notice";
  }

  takeoverTimers.push(
    window.setTimeout(() => {
      takeoverConfirmed = true;
      setTakeoverConfirmedState();
    }, 1100)
  );
}

function persistSuccessfulPlantResult() {
  if (!draftPlant) {
    return;
  }

  const successfulPlant = {
    name: `${draftPlant.eeArt}-Anlage (Demo)`,
    einspeiseMaLo: draftPlant.einspeiseMaLo,
    eeArt: draftPlant.eeArt,
    leistungKw: draftPlant.leistungKw,
    status: "Bereit zur Zuordnung",
    statusClass: "registered",
    standort: "Demo-Datensatz"
  };

  upsertPlantInList(plantData, successfulPlant);
  plantStorage.upsertPlant(successfulPlant);
}

function populateResultView(isConfirmed) {
  const plantStatus = isConfirmed ? "Bereit zur Zuordnung" : "Abgelehnt";
  const releaseText = isConfirmed ? "Freigabe der Anlage: erfolgt" : "Freigabe der Anlage: nicht erfolgt";
  const statusText = isConfirmed ? "bestätigt" : "abgelehnt";
  externalResult = {
    received: true,
    status: statusText,
    released: isConfirmed,
    plantStatus
  };

  if (externalProcessing.received) {
    externalProcessing.received.textContent = "Externe Antwort empfangen: Ja";
  }
  if (externalProcessing.status) {
    externalProcessing.status.textContent = `Antwortstatus: ${statusText}`;
  }
  if (externalProcessing.release) {
    externalProcessing.release.textContent = releaseText;
  }
  if (externalProcessing.plantStatus) {
    externalProcessing.plantStatus.textContent = `Anlagenstatus: ${plantStatus}`;
  }

  if (externalProcessing.maloo && draftPlant) {
    externalProcessing.maloo.textContent = draftPlant.einspeiseMaLo;
  }
  if (externalProcessing.eeArt && draftPlant) {
    externalProcessing.eeArt.textContent = draftPlant.eeArt;
  }
  if (externalProcessing.leistung && draftPlant) {
    externalProcessing.leistung.textContent = formatKw(draftPlant.leistungKw);
  }

  if (externalProcessing.heading) {
    externalProcessing.heading.textContent = isConfirmed
      ? "Anlage ist angemeldet"
      : "Anmeldung abgelehnt";
  }

  if (externalProcessing.badge) {
    externalProcessing.badge.textContent = plantStatus;
    externalProcessing.badge.className = isConfirmed
      ? "status-badge status-badge--registered"
      : "status-badge status-badge--rejected";
  }

  if (externalProcessing.explanation) {
    externalProcessing.explanation.textContent = isConfirmed
      ? "Die Anlage ist angemeldet und kann später dem Prozess „Einspeiseanlage zuordnen“ übergeben werden."
      : "Die Anlage ist nicht für die Community-Zuordnung verfügbar.";
    externalProcessing.explanation.className = isConfirmed ? "status-success" : "status-notice";
  }

  if (isConfirmed) {
    persistSuccessfulPlantResult();
  }
}

function processExternalResult(isConfirmed) {
  if (!draftPlant) {
    return;
  }
  populateResultView(isConfirmed);
  showView("result");
}

function mountApp() {
  const plantGrid = document.getElementById("plantGrid");
  const registerButton = document.getElementById("registerPlantButton");
  const cancelButton = document.getElementById("cancelRegistrationButton");
  const checkRequirementsButton = document.getElementById("checkRequirementsButton");
  const editButton = document.getElementById("editRegistrationButton");
  const backToSummaryFromCheckButton = document.getElementById("backToSummaryFromCheckButton");
  const continueToTakeoverButton = document.getElementById("continueToTakeoverButton");
  const backToCheckButton = document.getElementById("backToCheckButton");
  const externalConfirmationButton = document.getElementById("externalConfirmationButton");
  const externalRejectionButton = document.getElementById("externalRejectionButton");
  const returnToOverviewButton = document.getElementById("returnToOverviewButton");

  if (plantGrid) {
    plantGrid.innerHTML = plantData.map(renderPlantCard).join("");
  }

  updateSummary();
  renderDashboardContext();
  renderEnergyEarnings(prototypeContext);
  showView("overview");

  if (registerButton) {
    registerButton.addEventListener("click", () => {
      resetForm();
      showView("registration");
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      resetForm();
      showView("overview");
    });
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!validateForm()) {
        return;
      }

      draftPlant = {
        einspeiseMaLo: malooInput.value.trim(),
        eeArt: eeArtInput.value,
        leistungKw: Number(leistungInput.value)
      };

      populateSummary();
      showView("summary");
    });
  }

  if (editButton) {
    editButton.addEventListener("click", () => {
      populateFormFromDraft();
      showView("registration");
    });
  }

  if (checkRequirementsButton) {
    checkRequirementsButton.addEventListener("click", () => {
      populateCheckFromDraft();
      showView("check");
      startChecks();
    });
  }

  if (backToSummaryFromCheckButton) {
    backToSummaryFromCheckButton.addEventListener("click", () => {
      showView("summary");
    });
  }

  if (continueToTakeoverButton) {
    continueToTakeoverButton.addEventListener("click", () => {
      populateTakeoverFromDraft();
      if (takeoverConfirmed) {
        setTakeoverConfirmedState();
      } else {
        resetTakeoverDisplay();
      }
      showView("takeover");
    });
  }

  if (backToCheckButton) {
    backToCheckButton.addEventListener("click", () => {
      showView("check");
    });
  }

  if (simulateTakeoverButton) {
    simulateTakeoverButton.addEventListener("click", startTakeoverSimulation);
  }

  if (externalConfirmationButton) {
    externalConfirmationButton.addEventListener("click", () => {
      processExternalResult(true);
    });
  }

  if (externalRejectionButton) {
    externalRejectionButton.addEventListener("click", () => {
      processExternalResult(false);
    });
  }

  if (returnToOverviewButton) {
    returnToOverviewButton.addEventListener("click", () => {
      if (plantGrid) {
        plantGrid.innerHTML = plantData.map(renderPlantCard).join("");
      }
      updateSummary();
      renderDashboardContext();
      renderEnergyEarnings(prototypeContext);
      resetForm();
      showView("overview");
    });
  }
}

document.addEventListener("DOMContentLoaded", mountApp);
