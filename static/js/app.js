import { createPin, fetchPins, OWNER_ID, patchPin } from "./api.js";
import { createMissionMap } from "./map.js";

const $ = (sel, root = document) => root.querySelector(sel);

/** Same orbit as Flask mock_drone — client-side for smooth motion */
const DRONE_ORIGIN = [52.2297, 21.0122];
const DRONE_RADIUS = 0.004;

function sampleDrone(t = Date.now() / 1000) {
  const angle = t * 0.15;
  return {
    lat: DRONE_ORIGIN[0] + Math.sin(angle) * DRONE_RADIUS,
    lng: DRONE_ORIGIN[1] + Math.cos(angle) * DRONE_RADIUS,
    heading: (angle * (180 / Math.PI) + 90) % 360,
    speed_kmh: 28 + 6 * Math.sin(t * 0.4),
    altitude_m: 85 + 8 * Math.sin(t * 0.25),
    live: true,
  };
}

const els = {
  telemetry: $("#telemetry"),
  btnLocate: $("#btn-locate"),
  btnOffscreen: $("#btn-offscreen"),
  offscreenDist: $("#offscreen-dist"),
  btnMapMenu: $("#btn-map-menu"),
  mapMenu: $("#map-menu"),
  filterActive: $("#filter-active"),
  filterInactive: $("#filter-inactive"),
  backdrop: $("#sheet-backdrop"),
  sheetAdd: $("#sheet-add"),
  sheetDetail: $("#sheet-detail"),
  form: $("#form-add-pin"),
  note: $("#pin-note"),
  addCoords: $("#add-coords"),
  detailStatus: $("#detail-status"),
  detailNote: $("#detail-note"),
  detailMeta: $("#detail-meta"),
  btnToggle: $("#btn-toggle-active"),
  toast: $("#toast"),
};

let drone = sampleDrone();
let pins = [];
let selectedPin = null;
let draftCoords = null;
let follow = true;
let followResumeAt = 0;
let pinFilters = { active: true, inactive: true };

const mission = createMissionMap($("#map"));

function setFollow(on) {
  follow = on;
  els.btnLocate.classList.toggle("is-following", on);
}

function recenterOnDrone() {
  setFollow(true);
  followResumeAt = performance.now() + 900;
  mission.followDrone(drone.lat, drone.lng, { zoom: true, zoomLevel: 17 });
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  els.toast.appendChild(node);
  setTimeout(() => node.remove(), 2800);
}

function openSheet(sheet) {
  closeSheets(false, { clearDraft: false });
  els.backdrop.hidden = false;
  requestAnimationFrame(() => {
    els.backdrop.classList.add("is-open");
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
  });
}

function closeSheets(animate = true, { clearDraft = true } = {}) {
  const sheets = [els.sheetAdd, els.sheetDetail];
  for (const sheet of sheets) {
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
  }
  els.backdrop.classList.remove("is-open");
  if (clearDraft) {
    draftCoords = null;
    mission.clearGhostPin();
  }
  if (!animate) {
    els.backdrop.hidden = true;
    return;
  }
  setTimeout(() => {
    if (!els.backdrop.classList.contains("is-open")) els.backdrop.hidden = true;
  }, 420);
}

function formatWhen(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

function formatCoords(lat, lng) {
  return `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
}

function renderHud() {
  els.telemetry.textContent = `alt ${drone.altitude_m.toFixed(0)} m · hd ${drone.heading.toFixed(0)}°`;
}

function renderPins() {
  mission.setPins(pins, openPinDetail, pinFilters);
}

function setMapMenuOpen(open) {
  els.mapMenu.hidden = !open;
  els.btnMapMenu.setAttribute("aria-expanded", open ? "true" : "false");
}

function openAddSheet(lat, lng) {
  draftCoords = { lat, lng };
  els.note.value = "";
  els.addCoords.textContent = formatCoords(lat, lng);
  openSheet(els.sheetAdd);
  mission.setGhostPin(lat, lng);
  setTimeout(() => els.note.focus(), 450);
}

function openPinDetail(pin) {
  draftCoords = null;
  mission.clearGhostPin();
  selectedPin = pin;
  els.detailNote.textContent = pin.note;
  els.detailStatus.dataset.active = pin.active ? "true" : "false";
  els.detailStatus.setAttribute("aria-label", pin.active ? "Aktywna" : "Nieaktywna");
  els.detailMeta.innerHTML = `
    <div>
      <dt>Właściciel</dt>
      <dd>${pin.owner_id}</dd>
    </div>
    <div>
      <dt>Data</dt>
      <dd>${formatWhen(pin.created_at)}</dd>
    </div>
    <div>
      <dt>Koordynaty</dt>
      <dd>${formatCoords(pin.lat, pin.lng)}</dd>
    </div>
  `;
  els.btnToggle.textContent = pin.active ? "Dezaktywuj" : "Aktywuj";
  els.btnToggle.className = "btn btn-primary";
  openSheet(els.sheetDetail);
}

async function refreshPins() {
  pins = await fetchPins();
  renderPins();
}

function tickDrone(now) {
  drone = sampleDrone(now / 1000);
  mission.updateDrone(drone);
  renderHud();

  if (follow && now > followResumeAt) {
    mission.followDrone(drone.lat, drone.lng);
    els.btnOffscreen.hidden = true;
  } else {
    mission.updateOffscreenIndicator(
      drone.lat,
      drone.lng,
      els.btnOffscreen,
      els.offscreenDist,
    );
  }

  requestAnimationFrame(tickDrone);
}

els.backdrop.addEventListener("click", () => closeSheets());
document.querySelectorAll("[data-close-sheet]").forEach((btn) => {
  btn.addEventListener("click", () => closeSheets());
});

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = els.note.value.trim();
  if (!note || !draftCoords) return;
  const btn = $("#btn-save-pin");
  btn.disabled = true;
  const { lat, lng } = draftCoords;
  try {
    const pin = await createPin({
      note,
      lat,
      lng,
      owner_id: OWNER_ID,
    });
    pins = [pin, ...pins.filter((p) => p.id !== pin.id)];
    renderPins();
    closeSheets();
    toast("Pinezka zapisana");
  } catch {
    toast("Nie udało się zapisać");
  } finally {
    btn.disabled = false;
  }
});

els.btnToggle.addEventListener("click", async () => {
  if (!selectedPin) return;
  try {
    const updated = await patchPin(selectedPin.id, { active: !selectedPin.active });
    pins = pins.map((p) => (p.id === updated.id ? updated : p));
    renderPins();
    openPinDetail(updated);
    toast(updated.active ? "Pinezka aktywna" : "Pinezka dezaktywowana");
  } catch {
    toast("Nie udało się zaktualizować");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSheets();
});

mission.map.on("dragstart", () => {
  setFollow(false);
});

mission.map.on("click", (e) => {
  if (els.sheetAdd.classList.contains("is-open") || els.sheetDetail.classList.contains("is-open")) return;
  openAddSheet(e.latlng.lat, e.latlng.lng);
});

els.btnLocate.addEventListener("click", (e) => {
  e.stopPropagation();
  recenterOnDrone();
});

els.btnOffscreen.addEventListener("click", (e) => {
  e.stopPropagation();
  recenterOnDrone();
});

els.btnMapMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  setMapMenuOpen(els.mapMenu.hidden);
});

els.mapMenu.addEventListener("click", (e) => {
  e.stopPropagation();
});

els.filterActive.addEventListener("change", () => {
  pinFilters = {
    active: els.filterActive.checked,
    inactive: els.filterInactive.checked,
  };
  renderPins();
});

els.filterInactive.addEventListener("change", () => {
  pinFilters = {
    active: els.filterActive.checked,
    inactive: els.filterInactive.checked,
  };
  renderPins();
});

document.addEventListener("click", () => {
  if (!els.mapMenu.hidden) setMapMenuOpen(false);
});

setFollow(true);

function startCameraFeed() {
  const video = $("#camera-feed");
  const placeholder = $("#camera-placeholder");
  if (!video) return;

  const showFeed = () => {
    placeholder.hidden = true;
  };
  const showFallback = () => {
    placeholder.hidden = false;
  };

  video.addEventListener("playing", showFeed);
  video.addEventListener("error", showFallback);

  const tryPlay = () => {
    const play = video.play();
    if (play && typeof play.then === "function") {
      play.then(showFeed).catch(showFallback);
    }
  };

  if (video.readyState >= 2) tryPlay();
  else video.addEventListener("canplay", tryPlay, { once: true });
}

startCameraFeed();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

await refreshPins();
requestAnimationFrame(tickDrone);
setInterval(() => {
  refreshPins().catch(() => {});
}, 15000);
