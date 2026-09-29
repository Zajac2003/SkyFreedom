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

const TTL_STEPS = [
  { minutes: null, label: "Bezterminowy" },
  { minutes: 15, label: "15 min" },
  { minutes: 60, label: "1 h" },
  { minutes: 360, label: "6 h" },
  { minutes: 1440, label: "24 h" },
];

const els = {
  telemetry: $("#telemetry"),
  btnLocate: $("#btn-locate"),
  btnLayers: $("#btn-layers"),
  layersMenu: $("#layers-menu"),
  btnOffscreen: $("#btn-offscreen"),
  offscreenDist: $("#offscreen-dist"),
  btnMapMenu: $("#btn-map-menu"),
  mapMenu: $("#map-menu"),
  filterActive: $("#filter-active"),
  filterInactive: $("#filter-inactive"),
  countActive: $("#count-active"),
  countInactive: $("#count-inactive"),
  backdrop: $("#sheet-backdrop"),
  sheetAdd: $("#sheet-add"),
  sheetDetail: $("#sheet-detail"),
  form: $("#form-add-pin"),
  note: $("#pin-note"),
  ttl: $("#pin-ttl"),
  ttlLabel: $("#ttl-label"),
  addCoords: $("#add-coords"),
  addPinId: $("#add-pin-id"),
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
  const activeCount = pins.filter((p) => p.active).length;
  const inactiveCount = pins.length - activeCount;
  els.countActive.textContent = String(activeCount);
  els.countInactive.textContent = String(inactiveCount);
}

function setMapMenuOpen(open) {
  els.mapMenu.hidden = !open;
  els.btnMapMenu.setAttribute("aria-expanded", open ? "true" : "false");
}

function setLayersMenuOpen(open) {
  els.layersMenu.hidden = !open;
  els.btnLayers.setAttribute("aria-expanded", open ? "true" : "false");
}

function formatTtl(minutes) {
  if (minutes == null) return "Bezterminowy";
  const step = TTL_STEPS.find((s) => s.minutes === minutes);
  return step ? step.label : `${minutes} min`;
}

function syncTtlLabel() {
  const step = TTL_STEPS[Number(els.ttl.value)] || TTL_STEPS[0];
  els.ttlLabel.textContent = step.label;
  els.ttl.setAttribute("aria-valuetext", step.label);
}

function nextPinIdPreview() {
  return pins.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

function openAddSheet(lat, lng) {
  draftCoords = { lat, lng };
  const previewId = nextPinIdPreview();
  els.note.value = "";
  els.ttl.value = "0";
  syncTtlLabel();
  els.addCoords.textContent = formatCoords(lat, lng);
  els.addPinId.textContent = String(previewId);
  setFollow(false);
  setLayersMenuOpen(false);
  setMapMenuOpen(false);
  openSheet(els.sheetAdd);
  mission.setGhostPin(lat, lng, previewId);
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
    <div>
      <dt>Żywotność</dt>
      <dd>${formatTtl(pin.ttl_minutes)}</dd>
    </div>
    <div>
      <dt>ID</dt>
      <dd>${pin.id}</dd>
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

  const addingPin = els.sheetAdd.classList.contains("is-open") && draftCoords;

  if (addingPin) {
    mission.smoothFramePoints(
      [
        [drone.lat, drone.lng],
        [draftCoords.lat, draftCoords.lng],
      ],
      { pad: 72, maxZoom: 17, ease: 0.14 },
    );
    els.btnOffscreen.hidden = true;
  } else if (follow && now > followResumeAt) {
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
      ttl_minutes: (TTL_STEPS[Number(els.ttl.value)] || TTL_STEPS[0]).minutes,
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
  if (!els.mapMenu.hidden) {
    setMapMenuOpen(false);
    return;
  }
  if (!els.layersMenu.hidden) {
    setLayersMenuOpen(false);
    return;
  }
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

els.btnLayers.addEventListener("click", (e) => {
  e.stopPropagation();
  setMapMenuOpen(false);
  setLayersMenuOpen(els.layersMenu.hidden);
});

els.layersMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  const btn = e.target.closest("[data-layer]");
  if (!btn) return;
  const layer = btn.dataset.layer;
  mission.setBaseLayer(layer);
  els.layersMenu.querySelectorAll("[data-layer]").forEach((el) => {
    const on = el.dataset.layer === layer;
    el.classList.toggle("is-active", on);
    el.setAttribute("aria-checked", on ? "true" : "false");
  });
  setLayersMenuOpen(false);
});

els.btnMapMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  setLayersMenuOpen(false);
  setMapMenuOpen(els.mapMenu.hidden);
});

els.mapMenu.addEventListener("click", (e) => {
  e.stopPropagation();
});

els.ttl.addEventListener("input", syncTtlLabel);

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
  if (!els.layersMenu.hidden) setLayersMenuOpen(false);
});

syncTtlLabel();
setFollow(true);

function initSplitter() {
  const split = $("#split");
  const splitter = $("#splitter");
  if (!split || !splitter) return;

  const MIN = 15;
  const MAX = 70;
  const KEY = "skyfreedom-split-camera";

  const saved = Number(localStorage.getItem(KEY));
  if (Number.isFinite(saved) && saved >= MIN && saved <= MAX) {
    split.style.setProperty("--split-camera", `${saved}%`);
    splitter.setAttribute("aria-valuenow", String(Math.round(saved)));
  }

  function applyPercent(pct) {
    const clamped = Math.min(MAX, Math.max(MIN, pct));
    split.style.setProperty("--split-camera", `${clamped}%`);
    splitter.setAttribute("aria-valuenow", String(Math.round(clamped)));
    localStorage.setItem(KEY, String(clamped));
    mission.map.invalidateSize({ animate: false });
  }

  function percentFromClientY(clientY) {
    const rect = split.getBoundingClientRect();
    if (rect.height <= 0) return 32;
    return ((clientY - rect.top) / rect.height) * 100;
  }

  let dragging = false;

  splitter.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    split.classList.add("is-resizing");
    splitter.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  splitter.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    applyPercent(percentFromClientY(e.clientY));
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    split.classList.remove("is-resizing");
    try {
      splitter.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    mission.map.invalidateSize({ animate: false });
  };

  splitter.addEventListener("pointerup", endDrag);
  splitter.addEventListener("pointercancel", endDrag);

  splitter.addEventListener("keydown", (e) => {
    const now = Number(splitter.getAttribute("aria-valuenow")) || 32;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      applyPercent(now - 3);
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      applyPercent(now + 3);
    }
  });
}

initSplitter();

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
