const WARSAW = [52.2297, 21.0122];

function droneIconHtml(heading = 0, speed = 0) {
  return `
    <div class="drone-marker__wrap">
      <div class="drone-marker__body" style="transform:rotate(${heading}deg)">
        <img class="drone-marker__svg" src="/static/icons/drone.svg" alt="" width="44" height="44" draggable="false">
      </div>
      <span class="drone-marker__speed">${Math.round(speed)} km/h</span>
    </div>
  `;
}

function pinIconHtml({ active = true, ghost = false, id = null } = {}) {
  const fill = ghost ? "#E85D04" : active ? "#E85D04" : "#D8DEE6";
  const stroke = active || ghost ? "none" : "#1A2332";
  const strokeW = active || ghost ? 0 : 1.5;
  const label = id == null ? "—" : String(id);
  return `
    <div class="pin-marker__wrap">
      <span class="pin-marker__id">${label}</span>
      <svg class="pin-marker__glyph" viewBox="0 0 28 36" aria-hidden="true">
        <path fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" d="M14 0C7.4 0 2 5.2 2 11.6c0 8.2 10.2 22.4 11 23.4a1.2 1.2 0 0 0 2 0c.8-1 11-15.2 11-23.4C26 5.2 20.6 0 14 0z"/>
        <circle cx="14" cy="12" r="4.2" fill="${active || ghost ? "#fff" : "#6B7785"}"/>
      </svg>
    </div>
  `;
}

const PIN_ICON_SIZE = [40, 52];
const PIN_ICON_ANCHOR = [20, 52];

export function createMissionMap(el) {
  const map = L.map(el, {
    zoomControl: false,
    attributionControl: false,
  }).setView(WARSAW, 15);

  const layers = {
    satellite: L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Tiles &copy; Esri" },
    ),
    streets: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }),
  };

  const satelliteLabels = L.layerGroup([
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, opacity: 0.95 },
    ),
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, opacity: 0.95 },
    ),
  ]);

  let activeLayer = "satellite";
  let labelsVisible = true;
  layers.satellite.addTo(map);
  satelliteLabels.addTo(map);

  function syncSatelliteLabels() {
    const want = activeLayer === "satellite" && labelsVisible;
    const on = map.hasLayer(satelliteLabels);
    if (want && !on) satelliteLabels.addTo(map);
    if (!want && on) map.removeLayer(satelliteLabels);
  }

  function setBaseLayer(name) {
    if (!layers[name] || name === activeLayer) return activeLayer;
    map.removeLayer(layers[activeLayer]);
    if (map.hasLayer(satelliteLabels)) map.removeLayer(satelliteLabels);
    layers[name].addTo(map);
    activeLayer = name;
    syncSatelliteLabels();
    return activeLayer;
  }

  function setLabelsVisible(on) {
    labelsVisible = Boolean(on);
    syncSatelliteLabels();
    return labelsVisible;
  }

  function getLabelsVisible() {
    return labelsVisible;
  }

  function getBaseLayer() {
    return activeLayer;
  }

  const droneMarker = L.marker(WARSAW, {
    icon: L.divIcon({
      className: "drone-marker",
      html: droneIconHtml(0, 0),
      iconSize: [72, 64],
      iconAnchor: [36, 22],
    }),
    zIndexOffset: 1000,
    interactive: false,
  }).addTo(map);

  const pinLayer = L.layerGroup().addTo(map);
  const pinMarkers = new Map();
  let ghostMarker = null;

  function updateDrone({ lat, lng, heading, speed_kmh = 0 }) {
    droneMarker.setLatLng([lat, lng]);
    const icon = droneMarker.getElement();
    if (icon) {
      const body = icon.querySelector(".drone-marker__body");
      const speedEl = icon.querySelector(".drone-marker__speed");
      if (body) body.style.transform = `rotate(${heading}deg)`;
      if (speedEl) speedEl.textContent = `${Math.round(speed_kmh)} km/h`;
    } else {
      droneMarker.setIcon(
        L.divIcon({
          className: "drone-marker",
          html: droneIconHtml(heading, speed_kmh),
          iconSize: [72, 64],
          iconAnchor: [36, 22],
        }),
      );
    }
  }

  function setGhostPin(lat, lng, id = null) {
    const latlng = [lat, lng];
    const html = pinIconHtml({ active: true, ghost: true, id });
    if (ghostMarker) {
      ghostMarker.setLatLng(latlng);
      ghostMarker.setIcon(
        L.divIcon({
          className: "pin-marker is-ghost",
          html,
          iconSize: PIN_ICON_SIZE,
          iconAnchor: PIN_ICON_ANCHOR,
        }),
      );
      return;
    }
    ghostMarker = L.marker(latlng, {
      icon: L.divIcon({
        className: "pin-marker is-ghost",
        html,
        iconSize: PIN_ICON_SIZE,
        iconAnchor: PIN_ICON_ANCHOR,
      }),
      interactive: false,
      zIndexOffset: 900,
    }).addTo(map);
  }

  function clearGhostPin() {
    if (!ghostMarker) return;
    map.removeLayer(ghostMarker);
    ghostMarker = null;
  }

  function setPins(pins, onSelect, filters = { active: true, inactive: true }) {
    const visible = pins.filter((p) => (p.active ? filters.active : filters.inactive));
    const keep = new Set(visible.map((p) => p.id));
    for (const [id, marker] of pinMarkers) {
      if (!keep.has(id)) {
        pinLayer.removeLayer(marker);
        pinMarkers.delete(id);
      }
    }

    for (const pin of visible) {
      const latlng = [pin.lat, pin.lng];
      const html = pinIconHtml({ active: pin.active, id: pin.id });
      let marker = pinMarkers.get(pin.id);
      if (!marker) {
        marker = L.marker(latlng, {
          icon: L.divIcon({
            className: `pin-marker${pin.active ? "" : " is-inactive"}`,
            html,
            iconSize: PIN_ICON_SIZE,
            iconAnchor: PIN_ICON_ANCHOR,
          }),
        });
        marker.on("click", () => onSelect(pin));
        pinLayer.addLayer(marker);
        pinMarkers.set(pin.id, marker);
      } else {
        marker.setLatLng(latlng);
        marker.setIcon(
          L.divIcon({
            className: `pin-marker${pin.active ? "" : " is-inactive"}`,
            html,
            iconSize: PIN_ICON_SIZE,
            iconAnchor: PIN_ICON_ANCHOR,
          }),
        );
        marker.off("click");
        marker.on("click", () => onSelect(pin));
      }
    }
  }

  function followDrone(lat, lng, { zoom = false, zoomLevel = 17 } = {}) {
    if (zoom) {
      map.flyTo([lat, lng], zoomLevel, {
        animate: true,
        duration: 0.85,
      });
      return;
    }
    map.setView([lat, lng], map.getZoom(), { animate: false });
  }

  function isOnScreen(lat, lng, pad = 48) {
    const size = map.getSize();
    const point = map.latLngToContainerPoint([lat, lng]);
    return (
      point.x >= pad &&
      point.x <= size.x - pad &&
      point.y >= pad &&
      point.y <= size.y - pad
    );
  }

  function fitLatLngs(points, { animate = false, pad = 56, maxZoom = 17 } = {}) {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], Math.min(map.getZoom(), maxZoom), { animate });
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, {
      padding: [pad, pad],
      maxZoom,
      animate,
      duration: animate ? 0.45 : 0,
    });
  }

  /** Smoothly ease map so all points stay framed — call every frame */
  function smoothFramePoints(points, { pad = 64, maxZoom = 17, ease = 0.12 } = {}) {
    if (points.length < 2) return;

    const bounds = L.latLngBounds(points);
    const targetCenter = bounds.getCenter();
    let targetZoom = map.getBoundsZoom(bounds, false, L.point(pad, pad));
    if (!Number.isFinite(targetZoom)) targetZoom = map.getZoom();
    targetZoom = Math.min(targetZoom, maxZoom);

    const cur = map.getCenter();
    const curZoom = map.getZoom();
    const lat = cur.lat + (targetCenter.lat - cur.lat) * ease;
    const lng = cur.lng + (targetCenter.lng - cur.lng) * ease;
    const zoom = curZoom + (targetZoom - curZoom) * ease;

    map.setView([lat, lng], zoom, { animate: false });
  }

  function formatDistance(meters) {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
  }

  function updateOffscreenIndicator(lat, lng, indicatorEl, distEl) {
    if (!indicatorEl || !distEl) return;

    const droneLatLng = L.latLng(lat, lng);
    const size = map.getSize();
    const pad = 36;
    const point = map.latLngToContainerPoint(droneLatLng);
    const onScreen =
      point.x >= pad &&
      point.x <= size.x - pad &&
      point.y >= pad &&
      point.y <= size.y - pad;

    if (onScreen) {
      indicatorEl.hidden = true;
      return;
    }

    const center = L.point(size.x / 2, size.y / 2);
    let dx = point.x - center.x;
    let dy = point.y - center.y;
    if (dx === 0 && dy === 0) {
      indicatorEl.hidden = true;
      return;
    }

    const scaleX = (size.x / 2 - pad) / Math.abs(dx);
    const scaleY = (size.y / 2 - pad) / Math.abs(dy);
    const scale = Math.min(scaleX, scaleY);
    const edgeX = center.x + dx * scale;
    const edgeY = center.y + dy * scale;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

    const meters = map.getCenter().distanceTo(droneLatLng);
    distEl.textContent = formatDistance(meters);
    indicatorEl.style.left = `${edgeX}px`;
    indicatorEl.style.top = `${edgeY}px`;
    const arrow = indicatorEl.querySelector(".offscreen-drone__arrow svg");
    if (arrow) arrow.style.transform = `rotate(${angle}deg)`;
    indicatorEl.hidden = false;
  }

  return {
    map,
    updateDrone,
    setPins,
    followDrone,
    setGhostPin,
    clearGhostPin,
    updateOffscreenIndicator,
    fitLatLngs,
    smoothFramePoints,
    setBaseLayer,
    getBaseLayer,
    setLabelsVisible,
    getLabelsVisible,
    droneMarker,
  };
}
