const API_BASE = new URLSearchParams(location.search).get('api') || 'http://localhost:8080';
const DEFAULT_LOCATION = {
  name: 'Praia de Copacabana',
  label: 'Praia de Copacabana, Rio de Janeiro, Brasil',
  latitude: -22.9711,
  longitude: -43.1822
};
const LOCATION_STORAGE_KEY = 'oceanwatch-location';
const $ = (id) => document.getElementById(id);
const FEATURED_LOCATIONS = [
  { name: 'Praia de Copacabana', admin1: 'Rio de Janeiro', country: 'Brasil', latitude: -22.9711, longitude: -43.1822, feature: 'Praia' },
  { name: 'Praia de Lopes Mendes', admin1: 'Ilha Grande, Rio de Janeiro', country: 'Brasil', latitude: -23.1686565, longitude: -44.1323509, feature: 'Praia' },
  { name: 'Praia Lopes Mendes', admin1: 'Ilha Grande, Rio de Janeiro', country: 'Brasil', latitude: -23.172666, longitude: -44.125711, feature: 'Praia' },
  { name: 'Praia de Canasvieiras', admin1: 'Florianópolis, Santa Catarina', country: 'Brasil', latitude: -27.4307, longitude: -48.4562, feature: 'Praia' },
  { name: 'Praia do Forte', admin1: 'Bahia', country: 'Brasil', latitude: -12.5753, longitude: -38.0053, feature: 'Praia' },
  { name: 'Praia de Ipanema', admin1: 'Rio de Janeiro', country: 'Brasil', latitude: -22.9868, longitude: -43.2045, feature: 'Praia' },
  { name: 'Praia da Ferradura', admin1: 'Armação dos Búzios, Rio de Janeiro', country: 'Brasil', latitude: -22.7696, longitude: -41.8878, feature: 'Praia' },
  { name: 'Praia Grande (Ubatuba)', admin1: 'São Paulo', country: 'Brasil', latitude: -23.4180, longitude: -45.0560, feature: 'Praia' },
  { name: 'Praia de Jericoacoara', admin1: 'Ceará', country: 'Brasil', latitude: -2.7956, longitude: -40.5140, feature: 'Praia' },
  { name: 'Praia de Porto de Galinhas', admin1: 'Pernambuco', country: 'Brasil', latitude: -8.5069, longitude: -35.0040, feature: 'Praia' },
  { name: 'Bondi Beach', admin1: 'New South Wales', country: 'Austrália', latitude: -33.8915, longitude: 151.2767, feature: 'Praia' },
  { name: 'Miami Beach', admin1: 'Florida', country: 'Estados Unidos', latitude: 25.7907, longitude: -80.1300, feature: 'Praia' }
];
let autocompleteTimer;
let autocompleteRequest = 0;

function savedLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY));
    if (saved && Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude)) return saved;
  } catch (_) {}
  return DEFAULT_LOCATION;
}

let activeLocation = savedLocation();

function locationParams() {
  return new URLSearchParams({
    location: activeLocation.label || activeLocation.name,
    latitude: activeLocation.latitude,
    longitude: activeLocation.longitude
  });
}

function value(id, number, digits = 1) {
  $(id).textContent = number == null ? '—' : Number(number).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function showError(message) {
  const box = $('error-message');
  box.textContent = message;
  box.hidden = false;
}

function formatHour(timestamp) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}

function formatCoordinates(latitude, longitude) {
  const latDirection = latitude < 0 ? 'S' : 'N';
  const lonDirection = longitude < 0 ? 'W' : 'E';
  return `${Math.abs(latitude).toFixed(4)}° ${latDirection}  ${Math.abs(longitude).toFixed(4)}° ${lonDirection}`;
}

function placeLabel(place) {
  if (place.label) return place.label;
  return [place.name, place.admin1, place.country]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(', ');
}

function renderPlaces(places, heading = 'LUGARES ENCONTRADOS') {
  const list = $('location-results');
  list.replaceChildren();
  const title = document.createElement('div');
  title.className = 'location-results-heading';
  title.setAttribute('role', 'presentation');
  title.textContent = heading;
  list.append(title);

  for (const place of places) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'location-result';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', 'false');

    const title = document.createElement('strong');
    title.textContent = place.name;
    const details = document.createElement('span');
    details.textContent = [place.feature, place.admin1, place.country, formatCoordinates(place.latitude, place.longitude)]
      .filter(Boolean)
      .join(' · ');
    button.append(title, details);
    button.addEventListener('click', () => selectPlace({
      name: place.name,
      label: placeLabel(place),
      latitude: place.latitude,
      longitude: place.longitude
    }));
    list.append(button);
  }

  list.hidden = places.length === 0;
  $('location-query').setAttribute('aria-expanded', String(places.length > 0));
}

function selectPlace(place) {
  activeLocation = place;
  localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(place));
  $('location-query').value = place.label || place.name;
  $('location-results').hidden = true;
  $('location-query').setAttribute('aria-expanded', 'false');
  $('location-name').textContent = place.label || place.name;
  $('coordinates').textContent = formatCoordinates(place.latitude, place.longitude);
  loadDashboard();
}

function parseCoordinates(query) {
  const match = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Coordenadas fora do intervalo. Latitude: -90 a 90; longitude: -180 a 180.');
  }
  return {
    name: 'Local informado',
    label: `Local informado (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
    latitude,
    longitude
  };
}

async function searchLocation(event) {
  event.preventDefault();
  const query = $('location-query').value.trim();
    if (!query) {
    showError('Digite o nome de uma praia ou as coordenadas dela.');
    return;
  }

  $('error-message').hidden = true;
  $('location-results').hidden = true;
  $('location-query').setAttribute('aria-expanded', 'false');
  clearTimeout(autocompleteTimer);
  autocompleteRequest += 1;
  const button = $('location-search-button');
  const buttonLabel = button.querySelector('span:first-child');
  button.disabled = true;
  buttonLabel.textContent = 'Buscando…';

  try {
    const coordinates = parseCoordinates(query);
    if (coordinates) {
      selectPlace(coordinates);
      return;
    }
    if (query.length === 1) {
      const featured = FEATURED_LOCATIONS
        .filter((place) => normalizeSearch(placeLabel(place)).includes(normalizeSearch(query)))
        .map((place) => ({ ...place, label: placeLabel(place) }));
      renderPlaces(featured.slice(0, 6), 'SUGESTÕES POPULARES');
      return;
    }

    const places = await findLocationSuggestions(query);

    if (!places.length) {
      showError('Não encontrei uma praia com esse nome. Tente outro nome ou informe as coordenadas da praia.');
      return;
    }
    renderPlaces(places);
  } catch (error) {
    showError(error.message || 'Não foi possível buscar esse lugar.');
  } finally {
    button.disabled = false;
    buttonLabel.textContent = 'Buscar';
  }
}

function normalizeSearch(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function photonPlace(feature) {
  const properties = feature.properties || {};
  const [longitude, latitude] = feature.geometry?.coordinates || [];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const name = properties.name;
  if (!name) return null;
  const admin1 = [properties.city, properties.district, properties.county, properties.state]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(', ');
  const type = properties.osm_value || properties.type || '';
  const featureLabel = type === 'beach' ? 'Praia' : type === 'cape' ? 'Ponta' : type === 'island' ? 'Ilha' : '';

  return {
    name,
    label: [name, admin1, properties.country].filter((part, index, parts) => part && parts.indexOf(part) === index).join(', '),
    admin1,
    country: properties.country,
    latitude,
    longitude,
    feature: featureLabel,
    isBeach: properties.osm_key === 'natural' && properties.osm_value === 'beach'
  };
}

async function findPhotonPlaces(query) {
  const params = new URLSearchParams({ q: query, limit: '20', osm_tag: 'natural:beach' });
  const response = await fetch(`https://photon.komoot.io/api/?${params}`);
  if (!response.ok) throw new Error('Busca indisponível');
  const data = await response.json();
  return (data.features || []).map(photonPlace).filter(Boolean);
}

function simplifyBeachQuery(query) {
  return query
    .replace(/\b(?:na|no|em)\s+(?:ilha\s+grande|angra\s+dos\s+reis)\b/gi, ' ')
    .replace(/,?\s*(?:ilha\s+grande|angra\s+dos\s+reis)\s*$/i, ' ')
    .replace(/^\s*praia\s+(?:de\s+)?/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findLocationSuggestions(query) {
  let photonMatches = [];
  try {
    photonMatches = await findPhotonPlaces(query);
  } catch (_) {}

  const simplified = simplifyBeachQuery(query);
  const shouldRetryBeachName = simplified && simplified !== query && query.length >= 10
    && /\bpraia\b|\bilha\s+grande\b|\bangra\s+dos\s+reis\b/i.test(query)
    && !photonMatches.some((place) => place.isBeach);
  if (shouldRetryBeachName) {
    try {
      const extra = await findPhotonPlaces(simplified);
      photonMatches = [...photonMatches, ...extra];
    } catch (_) {}
  }

  return photonMatches.filter((place) => place.isBeach);
}

async function updateSuggestions() {
  const query = $('location-query').value.trim();
  const normalized = normalizeSearch(query);
  const requestId = ++autocompleteRequest;

  if (!query) {
    $('location-results').hidden = true;
    $('location-query').setAttribute('aria-expanded', 'false');
    return;
  }

  const featured = FEATURED_LOCATIONS
    .filter((place) => normalizeSearch(place.name).includes(normalized))
    .map((place) => ({ ...place, label: placeLabel(place) }));

  if (query.length === 1) {
    renderPlaces(featured.slice(0, 6), 'SUGESTÕES POPULARES');
    return;
  }

  renderPlaces(featured.slice(0, 4), 'SUGESTÕES');
  try {
    const matches = await findLocationSuggestions(query);
    if (requestId !== autocompleteRequest || query !== $('location-query').value.trim()) return;
    const combined = [...featured, ...matches.filter((place) => place.isBeach)];
    const unique = [];
    const seen = new Set();
    for (const place of combined) {
      const key = `${normalizeSearch(place.name)}|${Number(place.latitude).toFixed(3)}|${Number(place.longitude).toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(place);
      if (unique.length === 8) break;
    }
    renderPlaces(unique, 'ESCOLHA UM LUGAR');
  } catch (_) {
    if (requestId === autocompleteRequest && query === $('location-query').value.trim()) {
      renderPlaces(featured.slice(0, 6), 'SUGESTÕES POPULARES');
      if (!featured.length) $('location-results').hidden = true;
    }
  }
}

async function loadDashboard() {
  $('error-message').hidden = true;
  $('location-name').textContent = activeLocation.label || activeLocation.name;
  $('coordinates').textContent = formatCoordinates(activeLocation.latitude, activeLocation.longitude);
  $('forecast-list').innerHTML = '<div class="loading">Carregando previsão…</div>';
  const params = locationParams();

  try {
    const [conditionResponse, forecastResponse] = await Promise.all([
      fetch(`${API_BASE}/api/v1/coastal/conditions?${params}`),
      fetch(`${API_BASE}/api/v1/coastal/forecast?${params}&days=1`)
    ]);
    if (!conditionResponse.ok || !forecastResponse.ok) throw new Error('Os dados marítimos não estão disponíveis para esse ponto. Tente uma praia ou um local costeiro próximo.');
    const [condition, forecast] = await Promise.all([conditionResponse.json(), forecastResponse.json()]);
    value('air-temp', condition.airTemperatureC);
    value('water-temp', condition.waterTemperatureC);
    value('wave-height', condition.waveHeightM);
    $('location-name').textContent = condition.location || activeLocation.label || activeLocation.name;
    $('updated-at').textContent = condition.observedAt ? formatHour(condition.observedAt) : 'agora';
    $('recommendation').textContent = condition.recommendation;
    $('recommendation-detail').textContent = condition.recommendationDetail;
    const upcoming = (forecast.hourly || []).slice(0, 6);
    $('forecast-list').innerHTML = upcoming.length ? upcoming.map((hour) => `<div class="hour-item"><div class="hour-time">${formatHour(hour.time)}</div><div class="hour-icon">${hour.waveHeightM >= 1.2 ? '≋' : '⌁'}</div><div class="hour-wave">${hour.waveHeightM == null ? '—' : Number(hour.waveHeightM).toFixed(1)}<span style="font-size:9px;color:#91a5aa"> m</span></div><div class="hour-water">Água ${hour.waterTemperatureC == null ? '—' : Number(hour.waterTemperatureC).toFixed(1) + '°'}</div></div>`).join('') : '<div class="loading">Previsão horária indisponível.</div>';
  } catch (error) {
    $('forecast-list').innerHTML = '<div class="loading">Previsão indisponível.</div>';
    showError(error.message || 'Falha ao carregar os dados.');
  }
}

if (activeLocation !== DEFAULT_LOCATION) {
  $('location-query').value = activeLocation.label || activeLocation.name;
}
$('location-search-form').addEventListener('submit', searchLocation);
$('location-query').addEventListener('input', () => {
  clearTimeout(autocompleteTimer);
  autocompleteTimer = setTimeout(updateSuggestions, 300);
});
$('location-query').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') $('location-results').hidden = true;
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.location-search')) $('location-results').hidden = true;
});
$('refresh').addEventListener('click', loadDashboard);
$('theme-toggle').addEventListener('click', () => document.body.classList.toggle('light-theme'));
loadDashboard();
