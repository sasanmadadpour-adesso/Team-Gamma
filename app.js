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

let draftPlant = null;
let checkTimers = [];

const views = {
  overview: document.getElementById("overviewView"),
  registration: document.getElementById("registrationView"),
  summary: document.getElementById("summaryView"),
  check: document.getElementById("checkView")
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
const nextStepNotice = document.getElementById("nextStepNotice");
const continueToTakeoverButton = document.getElementById("continueToTakeoverButton");

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

function updateSummary() {
  const totalCapacity = plantData.reduce((sum, plant) => sum + plant.leistungKw, 0);
  const activePlantCount = plantData.filter((plant) => plant.status === "Aktiv").length;

  document.getElementById("plantCount").textContent = plantData.length;
  document.getElementById("totalCapacity").textContent = formatKw(totalCapacity);
  document.getElementById("activePlantCount").textContent = activePlantCount;
}

function clearCheckTimers() {
  checkTimers.forEach((timer) => window.clearTimeout(timer));
  checkTimers = [];
}

function showView(viewName) {
  clearCheckTimers();
  Object.entries(views).forEach(([name, element]) => {
    if (element) {
      element.hidden = name !== viewName;
    }
  });

  if (viewName === "registration" && malooInput) {
    malooInput.focus();
  }
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
  if (nextStepNotice) {
    nextStepNotice.hidden = true;
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
      if (continueToTakeoverButton) {
        continueToTakeoverButton.disabled = false;
      }
    }, 2450)
  );
}

function mountApp() {
  const plantGrid = document.getElementById("plantGrid");
  const registerButton = document.getElementById("registerPlantButton");
  const cancelButton = document.getElementById("cancelRegistrationButton");
  const checkButton = document.getElementById("checkRequirementsButton");
  const editButton = document.getElementById("editRegistrationButton");
  const backToSummaryButton = document.getElementById("backToSummaryButton");

  if (plantGrid) {
    plantGrid.innerHTML = plantData.map(renderPlantCard).join("");
  }

  updateSummary();
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

  if (checkButton) {
    checkButton.addEventListener("click", () => {
      populateCheckFromDraft();
      showView("check");
      startChecks();
    });
  }

  if (backToSummaryButton) {
    backToSummaryButton.addEventListener("click", () => {
      showView("summary");
    });
  }

  if (continueToTakeoverButton) {
    continueToTakeoverButton.addEventListener("click", () => {
      if (nextStepNotice) {
        nextStepNotice.hidden = false;
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", mountApp);
