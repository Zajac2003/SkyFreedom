const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const droneData = {
  '01': { temperature: 21.4, humidity: 68, smoke: .02, noise: 54, battery: 78 },
  '02': { temperature: 19.8, humidity: 84, smoke: .01, noise: 48, battery: 69 },
  '03': { temperature: 23.1, humidity: 63, smoke: .14, noise: 61, battery: 86 },
};
const route = [{ x: 25, y: 69 }, { x: 29, y: 66 }, { x: 34, y: 61 }, { x: 39, y: 56 }, { x: 43, y: 52 }, { x: 47, y: 47 }, { x: 52, y: 43 }, { x: 57, y: 39 }, { x: 61, y: 35 }, { x: 64, y: 31 }];
const initialHistory = [
  { time: '07:39', text: 'Dron 01 gotowy do rozpoznania' },
  { time: '07:31', text: 'Jednostka 04 skierowana do sektora' },
  { time: '07:18', text: 'Rozpoczęto operację' },
];
let role = null;
let selectedDrone = '01';
let incident = null;
let flightActive = false;
let flightTimer = null;
let sensorTimer = null;
let routeIndex = 0;
let demoSeconds = 0;
let sensorPhase = 0;
let cameraMode = 'rgb';
let cameraZoom = 1;
let mapZoom = 1;
let mapPan = { x: 0, y: 0 };
let mapDrag = null;
let airspaceRestricted = false;
let toastTimer = null;
let reportOpener = null;
let historyItems = [...initialHistory];

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, 2800);
}

function demoTime() {
  demoSeconds += 1;
  const minute = 42 + Math.floor(demoSeconds / 60);
  return `07:${String(minute).padStart(2, '0')}:${String(demoSeconds % 60).padStart(2, '0')}`;
}

function addHistory(message) {
  historyItems.unshift({ time: demoTime(), text: message });
  renderHistory();
}

function renderHistory() {
  const list = $('#timeline');
  list.replaceChildren();
  for (const item of historyItems) {
    const li = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = item.time;
    const text = document.createElement('span');
    text.textContent = item.text;
    li.append(time, text);
    list.append(li);
  }
  $('#history-count').textContent = String(historyItems.length);
}

function setRole(nextRole, focusHeading = true) {
  role = nextRole;
  $('#role-screen').hidden = true;
  $('#workspace').hidden = false;
  $('#workspace').dataset.role = role;
  $('#change-role').hidden = false;
  $('#reset-demo').hidden = false;
  const headings = {
    commander: ['CENTRUM OPERACJI', 'Obraz sytuacji'],
    operator: ['DRON 01', 'Kamera operatora'],
    ground: ['JEDNOSTKA 04', 'Alerty na trasie'],
  };
  $('#role-kicker').textContent = headings[role][0];
  $('#role-title').textContent = headings[role][1];
  $$('.role-tabs button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.role === role)));
  $('#operator-stage').hidden = role !== 'operator';
  $('#fleet-section').hidden = role !== 'commander';
  $('#sensor-section').hidden = role === 'ground';
  $('#airspace-banner').hidden = !(airspaceRestricted && role === 'operator');
  selectDrone(role === 'operator' ? '01' : selectedDrone);
  renderIncident();
  updateLoops();
  if (focusHeading) $('#role-title').focus();
}

function chooseRoleScreen() {
  $('#workspace').hidden = true;
  $('#role-screen').hidden = false;
  $('#change-role').hidden = true;
  $('#reset-demo').hidden = true;
  updateLoops();
  $(`.role-choice[data-role="${role || 'commander'}"]`)?.focus();
}

function selectDrone(id) {
  selectedDrone = id;
  $$('.fleet-feed').forEach((button) => {
    const selected = button.dataset.drone === id;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $$('.drone-marker').forEach((marker) => marker.classList.toggle('selected', (marker.dataset.droneMarker || '01') === id));
  $('#sensor-drone').textContent = `drona ${id}`;
  renderSensors();
}

function renderSensors() {
  if (!role || role === 'ground') return;
  const values = droneData[selectedDrone];
  const wobble = Math.sin(sensorPhase * .7 + Number(selectedDrone)) * .15;
  const temperature = values.temperature + wobble;
  const humidity = values.humidity + Math.round(Math.sin(sensorPhase * .55) * 2);
  const smoke = values.smoke + Math.max(0, Math.sin(sensorPhase * .4 + 1) * .01);
  const noise = values.noise + Math.round(Math.sin(sensorPhase * .8) * 2);
  const battery = Math.max(40, values.battery - (flightActive && selectedDrone === '01' ? Math.floor(demoSeconds / 8) : 0));
  $('#sensor-temperature').textContent = temperature.toFixed(1);
  $('#sensor-humidity').textContent = String(humidity);
  $('#sensor-smoke').textContent = smoke.toFixed(2);
  $('#sensor-noise').textContent = String(noise);
  $('#sensor-battery').textContent = String(battery);
  $('#bar-temperature').style.setProperty('--sensor-level', String(Math.min(1, temperature * .028)));
  $('#bar-humidity').style.setProperty('--sensor-level', String(humidity / 100));
  $('#bar-smoke').style.setProperty('--sensor-level', String(Math.min(1, smoke * 4)));
  $('#bar-noise').style.setProperty('--sensor-level', String(Math.min(1, noise / 100)));
  $('#bar-battery').style.setProperty('--sensor-level', String(battery / 100));
  const warning = selectedDrone === '03';
  $('#sensor-smoke').closest('.sensor-cell').classList.toggle('warning', warning);
  $('#sensor-status').textContent = warning ? 'Dym podwyższony · obraz poglądowy' : 'Odczyty symulowane';
}

function advanceFlight() {
  routeIndex = (routeIndex + 1) % route.length;
  const point = route[routeIndex];
  const marker = $('#drone-marker');
  marker.style.setProperty('--x', `${point.x}%`);
  marker.style.setProperty('--y', `${point.y}%`);
  $('#camera-alt').textContent = String(82 + routeIndex % 5);
  $('#camera-time').textContent = `00:${String(Math.floor(demoSeconds / 60)).padStart(2, '0')}:${String(demoSeconds % 60).padStart(2, '0')}`;
  demoSeconds += 1;
  sensorPhase += 1;
  renderSensors();
}

function updateLoops() {
  clearInterval(flightTimer);
  clearInterval(sensorTimer);
  flightTimer = null;
  sensorTimer = null;
  if (document.hidden || $('#workspace').hidden) return;
  if (flightActive) flightTimer = setInterval(advanceFlight, 1250);
  sensorTimer = setInterval(() => { sensorPhase += 1; renderSensors(); }, 2100);
}

function setFlight(active) {
  flightActive = active;
  document.body.classList.toggle('flight-active', active);
  const button = $('#flight-toggle');
  button.querySelector('span').textContent = active ? 'Zatrzymaj lot' : 'Uruchom lot';
  button.querySelector('svg').innerHTML = active ? '<path d="M7 5h4v14H7zm6 0h4v14h-4z"/>' : '<path d="m8 5 11 7-11 7V5Z"/>';
  $('#operator-flight-label').textContent = active ? 'W LOCIE' : 'GOTOWY';
  $('#fleet-01-status').textContent = active ? 'W LOCIE' : 'GOTOWY';
  $('.feed-status').classList.toggle('flying', active);
  $('#hero-camera').classList.toggle('flying', active);
  $('#map-viewport').classList.toggle('flying', active);
  addHistory(active ? 'Dron 01 rozpoczął symulowany lot' : 'Dron 01 zatrzymał symulowany lot');
  toast(active ? 'Symulowany lot uruchomiony' : 'Symulowany lot zatrzymany');
  updateLoops();
}

function setCameraMode(mode) {
  cameraMode = mode;
  $('#hero-camera').dataset.mode = mode;
  $('#camera-mode-name').textContent = mode === 'thermal' ? 'TERMICZNY · SYMULACJA' : 'RGB';
  $$('.camera-mode').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function setCameraZoom(zoom) {
  cameraZoom = Math.max(1, Math.min(2.5, zoom));
  $('#hero-camera').style.setProperty('--camera-scale', String(cameraZoom * 1.05));
  $('#camera-zoom-value').textContent = `${cameraZoom.toFixed(1)}×`;
}

function setMapZoom(zoom) {
  mapZoom = Math.max(1, Math.min(2.4, zoom));
  updateMapTransform();
}

function updateMapTransform() {
  const viewport = $('#map-viewport');
  const limitX = viewport.clientWidth * (mapZoom - 1) / 2;
  const limitY = viewport.clientHeight * (mapZoom - 1) / 2;
  mapPan.x = Math.min(limitX, Math.max(-limitX, mapPan.x));
  mapPan.y = Math.min(limitY, Math.max(-limitY, mapPan.y));
  $('#map-world').style.setProperty('--map-scale', mapZoom.toFixed(2));
  $('#map-world').style.setProperty('--pan-x', `${mapPan.x}px`);
  $('#map-world').style.setProperty('--pan-y', `${mapPan.y}px`);
}

function setMapLayer(layer) {
  $('#map-viewport').dataset.layer = layer;
  $$('.map-filter').forEach((button) => {
    const active = button.dataset.layer === layer;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function renderIncident() {
  const visible = incident && (role !== 'ground' || ['ACTIVE', 'CLEARED'].includes(incident.status));
  $('#incident-empty').hidden = Boolean(visible);
  $('#incident-content').hidden = !visible;
  $('#incident-marker').hidden = !visible || ['CLEARED', 'REJECTED'].includes(incident.status);
  const open = visible && !['CLEARED', 'REJECTED'].includes(incident.status);
  $('#incident-count').textContent = open ? '01' : '00';
  $('#situation-label').textContent = open ? (incident.status === 'ACTIVE' ? 'Alert przekazany jednostce' : 'Zgłoszenie do decyzji') : 'Brak aktywnego alertu';
  $('.situation-strip').classList.toggle('alert', Boolean(open));
  const status = visible ? incident.status : 'NONE';
  const labels = { NONE: 'BRAK', REPORTED: 'ZGŁOSZONE', VERIFIED: 'POTWIERDZONE', ACTIVE: 'AKTYWNE', CLEARED: 'ZAMKNIĘTE', REJECTED: 'ODRZUCONE' };
  $('#incident-status').textContent = labels[status];
  $('#incident-status').dataset.status = status;
  if (!visible) return;
  $('#incident-heading').textContent = role === 'ground' && status === 'ACTIVE' ? 'Droga 14 nieprzejezdna' : incident.title;
  $('#incident-description').textContent = incident.description;
  $('#incident-priority').textContent = `${incident.priority} priorytet`;
  const incidentImage = $('#incident-content .incident-photo img');
  incidentImage.src = incident.kind === 'flood' ? 'assets/drone-river.png' : 'assets/drone-road.png';
  incidentImage.alt = incident.kind === 'flood' ? 'Poglądowy obraz z drona: rozlana rzeka' : 'Poglądowy obraz z drona: uszkodzona droga po nawałnicy';
  const advice = {
    blocked: ['Omiń drogę 14', 'Objazd przez most północny.'],
    flood: ['Omiń zalany odcinek', 'Nie wjeżdżaj na drogę 14.'],
    infrastructure: ['Omijaj uszkodzenie', 'Zatrzymaj się przed drogą 14.'],
    other: ['Zachowaj odstęp', 'Poczekaj na decyzję dowódcy.'],
  }[incident.kind];
  $('#ground-guidance strong').textContent = advice[0];
  $('#ground-guidance span').textContent = advice[1];
  $('#ground-guidance').hidden = !(role === 'ground' && status === 'ACTIVE');
  const actions = $('#incident-actions');
  actions.replaceChildren();
  if (role !== 'commander') return;
  const addAction = (label, action, primary = false) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = primary ? 'action-primary' : 'action-secondary';
    button.dataset.action = action;
    button.textContent = label;
    actions.append(button);
  };
  if (status === 'REPORTED') { addAction('Odrzuć', 'reject'); addAction('Potwierdź zdarzenie', 'verify', true); }
  if (status === 'VERIFIED') { addAction('Odrzuć', 'reject'); addAction('Przekaż alert jednostce', 'activate', true); }
  if (status === 'ACTIVE') addAction('Zamknij zdarzenie', 'clear', true);
}

function changeIncident(action) {
  if (!incident) return;
  if (action === 'verify' && incident.status === 'REPORTED') { incident.status = 'VERIFIED'; addHistory('Dowódca potwierdził zgłoszenie'); toast('Zdarzenie potwierdzone'); }
  else if (action === 'activate' && incident.status === 'VERIFIED') { incident.status = 'ACTIVE'; addHistory('Alert przekazano jednostce 04'); toast('Alert trafił do jednostki terenowej'); }
  else if (action === 'clear' && incident.status === 'ACTIVE') { incident.status = 'CLEARED'; addHistory('Zdarzenie zamknięte'); toast('Zdarzenie zamknięte'); }
  else if (action === 'reject' && ['REPORTED', 'VERIFIED'].includes(incident.status)) { incident.status = 'REJECTED'; addHistory('Dowódca odrzucił zgłoszenie'); toast('Zgłoszenie odrzucone'); }
  renderIncident();
  $('#incident-content').classList.remove('state-change');
  void $('#incident-content').offsetWidth;
  $('#incident-content').classList.add('state-change');
  const next = $('#incident-actions button.action-primary') || $('#incident-status');
  if (next instanceof HTMLElement) { next.tabIndex = next.tagName === 'BUTTON' ? 0 : -1; next.focus(); }
}

function openReport() {
  if (incident && !['CLEARED', 'REJECTED'].includes(incident.status)) { toast('Najpierw zakończ bieżące zdarzenie'); return; }
  reportOpener = document.activeElement;
  $('#report-overlay').hidden = false;
  $('#event-description').focus();
}

function closeReport() {
  if ($('#report-overlay').hidden) return;
  $('#report-overlay').hidden = true;
  if (reportOpener?.isConnected) reportOpener.focus();
  reportOpener = null;
}

function submitReport(event) {
  event.preventDefault();
  const kind = $('#event-type').value;
  const content = {
    blocked: ['Droga 14 zablokowana', 'Przewrócone drzewo blokuje przejazd do punktu ewakuacji.'],
    flood: ['Podtopienie przy drodze 14', 'Woda może uniemożliwić przejazd drogą 14.'],
    infrastructure: ['Uszkodzona infrastruktura', 'Uszkodzenie infrastruktury przy trasie ewakuacyjnej.'],
    other: ['Nowe zagrożenie', 'Operator zauważył zagrożenie wymagające sprawdzenia.'],
  }[kind];
  const description = $('#event-description').value.trim() || content[1];
  const priority = { medium: 'Średni', high: 'Wysoki', critical: 'Krytyczny' }[$('input[name="severity"]:checked').value];
  incident = { status: 'REPORTED', kind, title: content[0], description, priority };
  closeReport();
  addHistory('Dron 01 przekazał zgłoszenie do dowódcy');
  setRole('commander', false);
  renderIncident();
  $('#incident-content').classList.add('state-change');
  $('#incident-actions button.action-primary')?.focus();
  toast('Zgłoszenie przekazano dowódcy');
}

function setAirspace(restricted) {
  airspaceRestricted = restricted;
  $('#airspace-pill').classList.toggle('restricted', restricted);
  $('#airspace-pill span').textContent = restricted ? 'Przestrzeń ograniczona' : 'Przestrzeń otwarta';
  $('#sidebar-airspace').textContent = restricted ? 'Ograniczona' : 'Otwarta';
  $('#safety-control').textContent = restricted ? 'Przywróć przestrzeń' : 'Symuluj ograniczenie';
  $('#airspace-banner').hidden = !(restricted && role === 'operator');
  addHistory(restricted ? 'Wprowadzono ograniczenie przestrzeni' : 'Przywrócono przestrzeń');
  toast(restricted ? 'Przestrzeń ograniczona — operator otrzymał alert' : 'Przestrzeń otwarta');
}

function resetDemo() {
  flightActive = false;
  document.body.classList.remove('flight-active');
  incident = null;
  airspaceRestricted = false;
  historyItems = [...initialHistory];
  demoSeconds = 0;
  sensorPhase = 0;
  routeIndex = 0;
  selectedDrone = '01';
  $('#drone-marker').style.setProperty('--x', '25%');
  $('#drone-marker').style.setProperty('--y', '69%');
  $('#airspace-pill').classList.remove('restricted');
  $('#airspace-pill span').textContent = 'Przestrzeń otwarta';
  $('#sidebar-airspace').textContent = 'Otwarta';
  $('#safety-control').textContent = 'Symuluj ograniczenie';
  $('#airspace-banner').hidden = true;
  $('#hero-camera').classList.remove('flying');
  $('#map-viewport').classList.remove('flying');
  $('.feed-status').classList.remove('flying');
  $('#operator-flight-label').textContent = 'GOTOWY';
  $('#fleet-01-status').textContent = 'GOTOWY';
  $('#flight-toggle span').textContent = 'Uruchom lot';
  $('#flight-toggle svg').innerHTML = '<path d="m8 5 11 7-11 7V5Z"/>';
  $('#camera-time').textContent = '00:00:00';
  $('#camera-alt').textContent = '82';
  setCameraMode('rgb');
  setCameraZoom(1);
  mapPan = { x: 0, y: 0 };
  setMapZoom(1);
  setMapLayer('all');
  renderHistory();
  closeReport();
  chooseRoleScreen();
  renderIncident();
  toast('Pokaz został zresetowany');
}

$$('.role-choice').forEach((button) => button.addEventListener('click', () => setRole(button.dataset.role)));
$$('.role-tabs button').forEach((button) => button.addEventListener('click', () => setRole(button.dataset.role)));
$('#change-role').addEventListener('click', chooseRoleScreen);
$('#reset-demo').addEventListener('click', resetDemo);
$$('.fleet-feed').forEach((button) => button.addEventListener('click', () => selectDrone(button.dataset.drone)));
$('#flight-toggle').addEventListener('click', () => setFlight(!flightActive));
$('#operator-report').addEventListener('click', openReport);
$('#prompt-report').addEventListener('click', openReport);
$$('.camera-mode').forEach((button) => button.addEventListener('click', () => setCameraMode(button.dataset.mode)));
$('#camera-zoom-in').addEventListener('click', () => setCameraZoom(cameraZoom + .25));
$('#camera-zoom-out').addEventListener('click', () => setCameraZoom(cameraZoom - .25));
$('#map-zoom-in').addEventListener('click', () => setMapZoom(mapZoom + .25));
$('#map-zoom-out').addEventListener('click', () => setMapZoom(mapZoom - .25));
$('#map-reset-view').addEventListener('click', () => { mapPan = { x: 0, y: 0 }; setMapZoom(1); });
$$('.map-filter').forEach((button) => button.addEventListener('click', () => setMapLayer(button.dataset.layer)));
$('#incident-actions').addEventListener('click', (event) => { const action = event.target.closest('button')?.dataset.action; if (action) changeIncident(action); });
$('#safety-control').addEventListener('click', () => setAirspace(!airspaceRestricted));
$('#ack-airspace').addEventListener('click', () => { $('#airspace-banner').hidden = true; $('#flight-toggle').focus(); });
$('#close-report').addEventListener('click', closeReport);
$('#report-overlay').addEventListener('click', (event) => { if (event.target === $('#report-overlay')) closeReport(); });
$('#report-form').addEventListener('submit', submitReport);
$('#event-type').addEventListener('change', (event) => {
  $('#event-description').value = {
    blocked: 'Przewrócone drzewo blokuje przejazd do punktu ewakuacji przy drodze 14.',
    flood: 'Woda wdarła się na drogę 14 i może uniemożliwić przejazd.',
    infrastructure: 'Widać uszkodzenie infrastruktury przy trasie ewakuacyjnej.',
    other: '',
  }[event.target.value];
});
document.addEventListener('keydown', (event) => {
  if ($('#report-overlay').hidden) return;
  if (event.key === 'Escape') { closeReport(); return; }
  if (event.key !== 'Tab') return;
  const focusables = [...$('#report-overlay').querySelectorAll('button,select,textarea,input')].filter((item) => !item.disabled);
  if (event.shiftKey && document.activeElement === focusables[0]) { event.preventDefault(); focusables.at(-1).focus(); }
  else if (!event.shiftKey && document.activeElement === focusables.at(-1)) { event.preventDefault(); focusables[0].focus(); }
});
const mapViewport = $('#map-viewport');
mapViewport.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) return;
  mapDrag = { x: event.clientX, y: event.clientY, panX: mapPan.x, panY: mapPan.y };
  mapViewport.setPointerCapture(event.pointerId);
  mapViewport.classList.add('dragging');
});
mapViewport.addEventListener('pointermove', (event) => {
  if (!mapDrag) return;
  mapPan.x = mapDrag.panX + event.clientX - mapDrag.x;
  mapPan.y = mapDrag.panY + event.clientY - mapDrag.y;
  updateMapTransform();
});
const endMapDrag = () => { mapDrag = null; mapViewport.classList.remove('dragging'); };
mapViewport.addEventListener('pointerup', endMapDrag);
mapViewport.addEventListener('pointercancel', endMapDrag);
mapViewport.addEventListener('wheel', (event) => { event.preventDefault(); setMapZoom(mapZoom + (event.deltaY < 0 ? .15 : -.15)); }, { passive: false });
window.addEventListener('resize', updateMapTransform);
document.addEventListener('visibilitychange', updateLoops);
renderHistory();
renderIncident();
setCameraMode('rgb');
setMapLayer('all');
