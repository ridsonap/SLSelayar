/**
 * SLS Finder - Kabupaten Kepulauan Selayar
 * Client-Side WebGIS Application for SLS Detection & Lookup
 */

// Global State
const state = {
  map: null,
  geojsonData: null,
  geojsonLayer: null,
  highlightLayer: null,
  gpsMarker: null,
  gpsCircle: null,
  clickMarker: null,
  activeBasemap: 'osm',
  basemapLayers: {},
  featuresWithBbox: [],
  kecamatanList: [],
  desaList: [],
  selayarBounds: null,
  isGeojsonLoaded: false
};

// UI Elements
const DOM = {
  map: document.getElementById('map'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText'),
  toastContainer: document.getElementById('toastContainer'),
  // Controls
  btnHome: document.getElementById('btnHome'),
  btnBasemap: document.getElementById('btnBasemap'),
  btnGps: document.getElementById('btnGps'),
  gpsIcon: document.getElementById('gpsIcon'),
  // Search
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  searchSuggestions: document.getElementById('searchSuggestions'),
  // Drawer
  bottomSheet: document.getElementById('bottomSheet'),
  btnCloseDrawer: document.getElementById('btnCloseDrawer'),
  drawerHandle: document.getElementById('drawerHandle'),
  slsName: document.getElementById('slsName'),
  slsDesaKec: document.getElementById('slsDesaKec'),
  slsId: document.getElementById('slsId'),
  slsLuas: document.getElementById('slsLuas'),
  slsCoord: document.getElementById('slsCoord'),
  badgeStatus: document.getElementById('badgeStatus'),
  badgeGpsAccuracy: document.getElementById('badgeGpsAccuracy'),
  btnCopyId: document.getElementById('btnCopyId'),
  btnCopyCoord: document.getElementById('btnCopyCoord'),
  btnGoogleMaps: document.getElementById('btnGoogleMaps'),
  btnShareInfo: document.getElementById('btnShareInfo'),
  // Basemap Modal
  modalBasemap: document.getElementById('modalBasemap'),
  btnCloseBasemapModal: document.getElementById('btnCloseBasemapModal'),
  basemapOptions: document.getElementById('basemapOptions'),
  // Coord Modal
  btnOpenCoordModal: document.getElementById('btnOpenCoordModal'),
  modalCoord: document.getElementById('modalCoord'),
  btnCloseCoordModal: document.getElementById('btnCloseCoordModal'),
  inputCoordQuick: document.getElementById('inputCoordQuick'),
  inputLat: document.getElementById('inputLat'),
  inputLng: document.getElementById('inputLng'),
  btnSubmitCoord: document.getElementById('btnSubmitCoord'),
  // Filter Modal
  btnOpenFilterModal: document.getElementById('btnOpenFilterModal'),
  modalFilter: document.getElementById('modalFilter'),
  btnCloseFilterModal: document.getElementById('btnCloseFilterModal'),
  filterKecamatan: document.getElementById('filterKecamatan'),
  filterDesa: document.getElementById('filterDesa'),
  filterSls: document.getElementById('filterSls'),
  btnApplyFilter: document.getElementById('btnApplyFilter')
};

/**
 * 1. Initialize Map & Basemaps
 */
function initMap() {
  // Default Center of Selayar Island (Benteng area)
  const defaultCenter = [-6.1215, 120.4623];
  const defaultZoom = 11;

  state.map = L.map('map', {
    center: defaultCenter,
    zoom: defaultZoom,
    zoomControl: true,
    preferCanvas: true // High performance rendering for 700+ multipolygons
  });

  // Reposition zoom control to bottom-left on desktop/mobile
  state.map.zoomControl.setPosition('bottomleft');

  // Define Tile Layers
  state.basemapLayers = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }),
    hybrid: L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      }),
      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      })
    ]),
    carto: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
    })
  };

  // Add default basemap
  state.basemapLayers.osm.addTo(state.map);

  // Setup click-on-map reverse lookup
  state.map.on('click', onMapClick);
}

/**
 * 2. Basemap Switcher Logic
 */
function setBasemap(type) {
  if (!state.basemapLayers[type]) return;

  // Remove all current basemaps
  Object.values(state.basemapLayers).forEach(layer => {
    if (state.map.hasLayer(layer)) {
      state.map.removeLayer(layer);
    }
  });

  // Add selected basemap
  state.basemapLayers[type].addTo(state.map);
  state.activeBasemap = type;

  // If geojson layer is loaded, bring it to front
  if (state.geojsonLayer) {
    state.geojsonLayer.bringToFront();
  }
  if (state.highlightLayer) {
    state.highlightLayer.bringToFront();
  }

  showToast(`Peta dasar diubah ke: ${getBasemapLabel(type)}`, 'info');
}

function getBasemapLabel(type) {
  switch (type) {
    case 'osm': return 'OpenStreetMap';
    case 'satellite': return 'Citra Satelit Esri';
    case 'hybrid': return 'Satelit Hybrid';
    case 'carto': return 'Carto Positron';
    default: return type;
  }
}

/**
 * 3. Load & Process GeoJSON Dataset
 */
async function loadGeoJsonData() {
  try {
    DOM.loadingText.textContent = 'Mengunduh batas wilayah SLS Kepulauan Selayar...';
    const response = await fetch('./Final_SLS_202517301.geojson');
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    state.geojsonData = data;

    DOM.loadingText.textContent = 'Memproses 721 wilayah SLS & indeks spasial...';

    // Calculate BBOX for each feature for ultra-fast PIP checking
    const kecSet = new Set();
    const desaSet = new Set();

    data.features.forEach((feature, index) => {
      const bbox = computeFeatureBbox(feature);
      state.featuresWithBbox.push({
        index,
        feature,
        bbox // [minLng, minLat, maxLng, maxLat]
      });

      const p = feature.properties;
      if (p.nmkec) kecSet.add(p.nmkec.trim());
      if (p.nmkec && p.nmdesa) {
        desaSet.add(JSON.stringify({ kec: p.nmkec.trim(), desa: p.nmdesa.trim() }));
      }
    });

    state.kecamatanList = Array.from(kecSet).sort();
    state.desaList = Array.from(desaSet).map(s => JSON.parse(s)).sort((a, b) => a.desa.localeCompare(b.desa));

    // Render Layer on Map
    state.geojsonLayer = L.geoJSON(data, {
      style: getSlsNormalStyle,
      onEachFeature: (feature, layer) => {
        // Fast hover tooltip
        const p = feature.properties;
        const tooltipContent = `<b>${p.nmsls || 'SLS'}</b><br>${p.nmdesa}, ${p.nmkec}`;
        layer.bindTooltip(tooltipContent, {
          sticky: true,
          className: 'sls-tooltip',
          direction: 'top'
        });

        // Click on polygon
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          selectFeature(feature, e.latlng);
        });
      }
    }).addTo(state.map);

    // Compute overall bounds for Selayar
    state.selayarBounds = state.geojsonLayer.getBounds();
    state.map.fitBounds(state.selayarBounds, { padding: [20, 20] });

    populateFilterDropdowns();

    state.isGeojsonLoaded = true;

    // Fade out loading screen
    DOM.loadingOverlay.classList.add('opacity-0');
    setTimeout(() => {
      DOM.loadingOverlay.classList.add('hidden');
    }, 300);

    showToast('Batas SLS Kepulauan Selayar siap digunakan!', 'success');
  } catch (err) {
    console.error('Error loading GeoJSON:', err);
    DOM.loadingText.textContent = `Gagal memuat data: ${err.message}`;
    showToast('Gagal memuat file GeoJSON. Pastikan file tersedia di repositori.', 'error');
  }
}

/**
 * Styling Rules
 */
function getSlsNormalStyle(feature) {
  return {
    fillColor: '#0284c7',
    weight: 1.2,
    opacity: 0.85,
    color: '#0369a1',
    fillOpacity: 0.15
  };
}

const HIGHLIGHT_STYLE = {
  fillColor: '#f59e0b',
  weight: 3,
  opacity: 1,
  color: '#b45309',
  fillOpacity: 0.45
};

/**
 * Compute Bounding Box for [minLng, minLat, maxLng, maxLat]
 */
function computeFeatureBbox(feature) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const coords = feature.geometry.coordinates;

  function traverse(item) {
    if (typeof item[0] === 'number') {
      const lng = item[0];
      const lat = item[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      for (let i = 0; i < item.length; i++) {
        traverse(item[i]);
      }
    }
  }

  traverse(coords);
  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Point-in-Polygon (PIP) Algorithm: Fast Ray-Casting with BBOX Pre-Filtering
 */
function findSlsByCoordinate(lat, lng) {
  if (!state.isGeojsonLoaded) return null;

  // 1. Candidate selection using BBOX pre-filter (runs in ~0.05ms)
  const candidates = state.featuresWithBbox.filter(item => {
    const [minLng, minLat, maxLng, maxLat] = item.bbox;
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  });

  if (candidates.length === 0) return null;

  // 2. Exact polygon ray-casting test
  const pt = [lng, lat]; // [x, y]

  // Use Turf.js if available for precision
  if (typeof turf !== 'undefined' && turf.booleanPointInPolygon) {
    const turfPoint = turf.point(pt);
    for (const cand of candidates) {
      if (turf.booleanPointInPolygon(turfPoint, cand.feature)) {
        return cand.feature;
      }
    }
  }

  // Pure JavaScript Ray Casting Fallback
  for (const cand of candidates) {
    if (isPointInsideFeature(pt, cand.feature)) {
      return cand.feature;
    }
  }

  return null;
}

function isPointInsideFeature(pt, feature) {
  const geom = feature.geometry;
  const [x, y] = pt;

  function pointInPolygon(ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  if (geom.type === 'Polygon') {
    return pointInPolygon(geom.coordinates[0]);
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      if (pointInPolygon(poly[0])) return true;
    }
  }
  return false;
}

/**
 * 4. Feature Selection & Drawer Presentation
 */
function selectFeature(feature, clickLatLng = null, gpsAccuracy = null) {
  // Clear previous highlight
  if (state.highlightLayer) {
    state.map.removeLayer(state.highlightLayer);
  }

  // Draw highlight polygon
  state.highlightLayer = L.geoJSON(feature, {
    style: HIGHLIGHT_STYLE
  }).addTo(state.map);

  const p = feature.properties;

  // Calculate center coordinate for display
  let displayLat, displayLng;
  if (clickLatLng) {
    displayLat = clickLatLng.lat.toFixed(6);
    displayLng = clickLatLng.lng.toFixed(6);
  } else {
    const center = state.highlightLayer.getBounds().getCenter();
    displayLat = center.lat.toFixed(6);
    displayLng = center.lng.toFixed(6);
  }

  // Populate Bottom Sheet Drawer
  DOM.slsName.textContent = p.nmsls || 'Tanpa Nama SLS';
  DOM.slsDesaKec.textContent = `Desa ${p.nmdesa || '-'}, Kec. ${p.nmkec || '-'}`;
  DOM.slsId.textContent = p.idsls || '-';
  
  const luasVal = p.luas ? `${Number(p.luas).toFixed(3)} km²` : '-';
  DOM.slsLuas.textContent = luasVal;
  DOM.slsCoord.textContent = `${displayLat}, ${displayLng}`;

  // GPS Accuracy badge
  if (gpsAccuracy !== null) {
    DOM.badgeGpsAccuracy.textContent = `GPS ±${Math.round(gpsAccuracy)}m`;
    DOM.badgeGpsAccuracy.classList.remove('hidden');
    DOM.badgeStatus.textContent = 'Lokasi Terdeteksi';
  } else {
    DOM.badgeGpsAccuracy.classList.add('hidden');
    DOM.badgeStatus.textContent = 'SLS Terpilih';
  }

  // Google Maps navigation link
  DOM.btnGoogleMaps.href = `https://www.google.com/maps/dir/?api=1&destination=${displayLat},${displayLng}`;

  // Store data for share
  DOM.btnShareInfo.dataset.shareText = `📍 Informasi SLS Kepulauan Selayar:\n• SLS: ${p.nmsls}\n• Desa: ${p.nmdesa}\n• Kec: ${p.nmkec}\n• ID SLS: ${p.idsls}\n• Titik: ${displayLat}, ${displayLng}\n• Maps: https://www.google.com/maps?q=${displayLat},${displayLng}`;

  // Open Drawer
  openDrawer();
}

function openDrawer() {
  DOM.bottomSheet.classList.remove('hidden-drawer');
  DOM.bottomSheet.classList.add('show-drawer');
}

function closeDrawer() {
  DOM.bottomSheet.classList.remove('show-drawer');
  DOM.bottomSheet.classList.add('hidden-drawer');
}

/**
 * 5. Map Click Event (Interactive Point Tap)
 */
function onMapClick(e) {
  const { lat, lng } = e.latlng;

  // Add click pin marker
  setClickMarker(lat, lng);

  // Check which SLS contains this point
  const feature = findSlsByCoordinate(lat, lng);

  if (feature) {
    selectFeature(feature, e.latlng);
  } else {
    if (state.highlightLayer) {
      state.map.removeLayer(state.highlightLayer);
    }
    closeDrawer();
    showToast(`Titik (${lat.toFixed(5)}, ${lng.toFixed(5)}) berada di luar SLS Kepulauan Selayar`, 'warning');
  }
}

function setClickMarker(lat, lng) {
  if (state.clickMarker) {
    state.map.removeLayer(state.clickMarker);
  }

  const pinIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div class="w-6 h-6 bg-amber-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  state.clickMarker = L.marker([lat, lng], { icon: pinIcon }).addTo(state.map);
}

/**
 * 6. Live Geolocation (Tombol Lokasi Sekarang)
 */
function handleGeolocation() {
  if (!navigator.geolocation) {
    showToast('Peramban Anda tidak mendukung fitur Geolocation GPS.', 'error');
    return;
  }

  // Show loading indicator on button
  DOM.btnGps.disabled = true;
  DOM.btnGps.classList.add('opacity-80');
  DOM.gpsIcon.classList.add('animate-spin');
  showToast('Mencari sinyal GPS akurat...', 'info');

  const options = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(
    (position) => {
      // Success
      DOM.btnGps.disabled = false;
      DOM.btnGps.classList.remove('opacity-80');
      DOM.gpsIcon.classList.remove('animate-spin');

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      // Update GPS visual marker
      updateGpsMarker(lat, lng, accuracy);

      // Smooth zoom to user location
      state.map.setView([lat, lng], 17, { animate: true });

      // Run spatial check
      const feature = findSlsByCoordinate(lat, lng);
      if (feature) {
        selectFeature(feature, { lat, lng }, accuracy);
        showToast(`Lokasi terdeteksi di: ${feature.properties.nmsls}`, 'success');
      } else {
        if (state.highlightLayer) {
          state.map.removeLayer(state.highlightLayer);
        }
        closeDrawer();
        showToast(`Lokasi Anda (${lat.toFixed(5)}, ${lng.toFixed(5)}) berada di luar batas SLS Kepulauan Selayar.`, 'warning');
      }
    },
    (error) => {
      // Error
      DOM.btnGps.disabled = false;
      DOM.btnGps.classList.remove('opacity-80');
      DOM.gpsIcon.classList.remove('animate-spin');

      let msg = 'Gagal mendeteksi lokasi.';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          msg = 'Izin akses lokasi GPS ditolak oleh pengguna.';
          break;
        case error.POSITION_UNAVAILABLE:
          msg = 'Sinyal posisi GPS tidak tersedia.';
          break;
        case error.TIMEOUT:
          msg = 'Waktu pencarian sinyal GPS habis (timeout).';
          break;
      }
      showToast(msg, 'error');
    },
    options
  );
}

function updateGpsMarker(lat, lng, accuracy) {
  if (state.gpsMarker) state.map.removeLayer(state.gpsMarker);
  if (state.gpsCircle) state.map.removeLayer(state.gpsCircle);

  // Pulsing blue dot
  const pulseIcon = L.divIcon({
    className: 'gps-pulse-icon',
    html: '<div class="gps-pulse-ring"></div><div class="gps-pulse-dot"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  state.gpsMarker = L.marker([lat, lng], { icon: pulseIcon }).addTo(state.map);

  // Accuracy circle
  state.gpsCircle = L.circle([lat, lng], {
    radius: accuracy,
    color: '#0284c7',
    fillColor: '#38bdf8',
    fillOpacity: 0.15,
    weight: 1
  }).addTo(state.map);
}

/**
 * 7. Home Button Action (Reset ke Selayar)
 */
function handleHomeButton() {
  if (!state.selayarBounds) return;

  state.map.fitBounds(state.selayarBounds, {
    padding: [20, 20],
    animate: true,
    duration: 1
  });

  if (state.clickMarker) {
    state.map.removeLayer(state.clickMarker);
  }

  showToast('Tampilan peta dikembalikan ke Kabupaten Kepulauan Selayar', 'info');
}

/**
 * 8. Search Engine (Unified Instant Search)
 */
function initSearch() {
  let debounceTimeout = null;

  DOM.searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    const query = e.target.value.trim().toLowerCase();

    if (query.length > 0) {
      DOM.clearSearchBtn.classList.remove('hidden');
    } else {
      DOM.clearSearchBtn.classList.add('hidden');
      DOM.searchSuggestions.classList.add('hidden');
      return;
    }

    debounceTimeout = setTimeout(() => {
      performSearch(query);
    }, 180);
  });

  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    DOM.clearSearchBtn.classList.add('hidden');
    DOM.searchSuggestions.classList.add('hidden');
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchInput') && !e.target.closest('#searchSuggestions')) {
      DOM.searchSuggestions.classList.add('hidden');
    }
  });
}

function performSearch(query) {
  if (!state.geojsonData) return;

  const results = [];
  const q = query.toLowerCase();

  // 1. Search Kecamatan matches
  state.kecamatanList.forEach(kec => {
    if (kec.toLowerCase().includes(q)) {
      results.push({
        type: 'kecamatan',
        title: `Kecamatan ${kec}`,
        subtitle: 'Kabupaten Kepulauan Selayar',
        value: kec
      });
    }
  });

  // 2. Search Desa matches
  state.desaList.forEach(item => {
    if (item.desa.toLowerCase().includes(q)) {
      results.push({
        type: 'desa',
        title: `Desa ${item.desa}`,
        subtitle: `Kecamatan ${item.kec}`,
        value: item
      });
    }
  });

  // 3. Search SLS matches & ID SLS
  let slsMatches = 0;
  for (const item of state.featuresWithBbox) {
    if (slsMatches >= 25) break; // Limit suggestions
    const p = item.feature.properties;
    const nmsls = (p.nmsls || '').toLowerCase();
    const idsls = (p.idsls || '').toLowerCase();

    if (nmsls.includes(q) || idsls.includes(q)) {
      results.push({
        type: 'sls',
        title: p.nmsls || 'SLS',
        subtitle: `Desa ${p.nmdesa}, Kec. ${p.nmkec} (ID: ${p.idsls})`,
        value: item.feature
      });
      slsMatches++;
    }
  }

  renderSuggestions(results);
}

function renderSuggestions(results) {
  if (results.length === 0) {
    DOM.searchSuggestions.innerHTML = `
      <div class="p-3 text-xs text-slate-500 text-center">
        Tidak ditemukan SLS, Desa, atau Kecamatan yang cocok.
      </div>
    `;
    DOM.searchSuggestions.classList.remove('hidden');
    return;
  }

  DOM.searchSuggestions.innerHTML = results.slice(0, 20).map((res, index) => {
    let badgeClass = 'bg-slate-100 text-slate-700';
    let badgeText = 'SLS';
    let iconName = 'map-pin';

    if (res.type === 'kecamatan') {
      badgeClass = 'bg-indigo-100 text-indigo-700';
      badgeText = 'KECAMATAN';
      iconName = 'landmark';
    } else if (res.type === 'desa') {
      badgeClass = 'bg-emerald-100 text-emerald-700';
      badgeText = 'DESA';
      iconName = 'home';
    }

    return `
      <div class="suggestion-item p-3 hover:bg-sky-50/70 cursor-pointer flex items-center justify-between transition" data-index="${index}">
        <div class="flex items-center gap-2.5 overflow-hidden">
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeClass} uppercase flex-shrink-0">
            ${badgeText}
          </span>
          <div class="truncate">
            <div class="text-sm font-semibold text-slate-800 truncate">${res.title}</div>
            <div class="text-xs text-slate-500 truncate">${res.subtitle}</div>
          </div>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 flex-shrink-0 ml-2"></i>
      </div>
    `;
  }).join('');

  DOM.searchSuggestions.classList.remove('hidden');
  lucide.createIcons();

  // Attach click events
  DOM.searchSuggestions.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index, 10);
      handleSelectSuggestion(results[idx]);
    });
  });
}

function handleSelectSuggestion(item) {
  DOM.searchSuggestions.classList.add('hidden');

  if (item.type === 'sls') {
    const feature = item.value;
    const tempLayer = L.geoJSON(feature);
    const bounds = tempLayer.getBounds();
    state.map.fitBounds(bounds, { maxZoom: 17, padding: [40, 40], animate: true });
    selectFeature(feature);
    showToast(`Menampilkan: ${feature.properties.nmsls}`, 'success');
  } else if (item.type === 'desa') {
    const desaObj = item.value;
    // Find all features of this desa and fitBounds
    const desaFeatures = state.featuresWithBbox
      .filter(f => f.feature.properties.nmkec === desaObj.kec && f.feature.properties.nmdesa === desaObj.desa)
      .map(f => f.feature);
    
    if (desaFeatures.length > 0) {
      const groupLayer = L.geoJSON(desaFeatures);
      state.map.fitBounds(groupLayer.getBounds(), { padding: [30, 30], animate: true });
      showToast(`Menampilkan Desa ${desaObj.desa} (${desaFeatures.length} SLS)`, 'info');
    }
  } else if (item.type === 'kecamatan') {
    const kecName = item.value;
    const kecFeatures = state.featuresWithBbox
      .filter(f => f.feature.properties.nmkec === kecName)
      .map(f => f.feature);

    if (kecFeatures.length > 0) {
      const groupLayer = L.geoJSON(kecFeatures);
      state.map.fitBounds(groupLayer.getBounds(), { padding: [30, 30], animate: true });
      showToast(`Menampilkan Kecamatan ${kecName} (${kecFeatures.length} SLS)`, 'info');
    }
  }
}

/**
 * 9. Coordinate Lookup Modal Logic
 */
function initCoordinateModal() {
  DOM.btnOpenCoordModal.addEventListener('click', () => {
    DOM.modalCoord.classList.remove('hidden-modal');
    DOM.modalCoord.classList.add('show-modal');
    DOM.inputCoordQuick.focus();
  });

  DOM.btnCloseCoordModal.addEventListener('click', () => {
    DOM.modalCoord.classList.remove('show-modal');
    DOM.modalCoord.classList.add('hidden-modal');
  });

  // Sample coordinate buttons
  document.querySelectorAll('.sample-coord-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lat = btn.dataset.lat;
      const lng = btn.dataset.lng;
      DOM.inputCoordQuick.value = `${lat}, ${lng}`;
      DOM.inputLat.value = lat;
      DOM.inputLng.value = lng;
    });
  });

  DOM.btnSubmitCoord.addEventListener('click', processCoordinateInput);
}

function processCoordinateInput() {
  let lat = null;
  let lng = null;

  const quickVal = DOM.inputCoordQuick.value.trim();
  const latVal = DOM.inputLat.value.trim();
  const lngVal = DOM.inputLng.value.trim();

  if (quickVal) {
    // Parse "lat, lng" or "lat lng"
    const cleaned = quickVal.replace(/[^\d.,\s-]/g, '').trim();
    const parts = cleaned.split(/[\s,]+/).filter(Boolean);
    if (parts.length >= 2) {
      let p0 = parseFloat(parts[0]);
      let p1 = parseFloat(parts[1]);

      // Smart detector: Indonesia lat is around -5 to -8, lng is 119 to 122
      if (p0 > 90 && p1 < 0) {
        // user entered [lng, lat]
        lng = p0;
        lat = p1;
      } else {
        lat = p0;
        lng = p1;
      }
    }
  } else if (latVal && lngVal) {
    lat = parseFloat(latVal);
    lng = parseFloat(lngVal);
  }

  if (isNaN(lat) || isNaN(lng) || lat === null || lng === null) {
    showToast('Format koordinat tidak valid. Contoh: -6.49178, 120.48547', 'error');
    return;
  }

  // Close modal
  DOM.modalCoord.classList.remove('show-modal');
  DOM.modalCoord.classList.add('hidden-modal');

  // Place marker
  setClickMarker(lat, lng);
  state.map.setView([lat, lng], 16, { animate: true });

  // Lookup SLS
  const feature = findSlsByCoordinate(lat, lng);
  if (feature) {
    selectFeature(feature, { lat, lng });
    showToast(`Koordinat masuk ke: ${feature.properties.nmsls}`, 'success');
  } else {
    if (state.highlightLayer) state.map.removeLayer(state.highlightLayer);
    closeDrawer();
    showToast(`Koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)}) di luar SLS Kepulauan Selayar.`, 'warning');
  }
}

/**
 * 10. Filter Hierarki Wilayah Modal
 */
function initFilterModal() {
  DOM.btnOpenFilterModal.addEventListener('click', () => {
    DOM.modalFilter.classList.remove('hidden-modal');
    DOM.modalFilter.classList.add('show-modal');
  });

  DOM.btnCloseFilterModal.addEventListener('click', () => {
    DOM.modalFilter.classList.remove('show-modal');
    DOM.modalFilter.classList.add('hidden-modal');
  });

  DOM.filterKecamatan.addEventListener('change', () => {
    const selKec = DOM.filterKecamatan.value;
    DOM.filterDesa.innerHTML = '<option value="">-- Pilih Desa / Kelurahan --</option>';
    DOM.filterSls.innerHTML = '<option value="">-- Pilih Desa Terlebih Dahulu --</option>';
    DOM.filterSls.disabled = true;

    if (!selKec) {
      DOM.filterDesa.disabled = true;
      DOM.btnApplyFilter.disabled = true;
      return;
    }

    const filteredDesa = state.desaList.filter(d => d.kec === selKec);
    filteredDesa.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.desa;
      opt.textContent = d.desa;
      DOM.filterDesa.appendChild(opt);
    });

    DOM.filterDesa.disabled = false;
    DOM.btnApplyFilter.disabled = false;
  });

  DOM.filterDesa.addEventListener('change', () => {
    const selKec = DOM.filterKecamatan.value;
    const selDesa = DOM.filterDesa.value;
    DOM.filterSls.innerHTML = '<option value="">-- Semua SLS di Desa ini --</option>';

    if (!selDesa) {
      DOM.filterSls.disabled = true;
      return;
    }

    const slsInDesa = state.featuresWithBbox.filter(
      f => f.feature.properties.nmkec === selKec && f.feature.properties.nmdesa === selDesa
    );

    slsInDesa.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.feature.properties.idsls;
      opt.textContent = `${item.feature.properties.nmsls || 'SLS'} (${item.feature.properties.idsls})`;
      DOM.filterSls.appendChild(opt);
    });

    DOM.filterSls.disabled = false;
  });

  DOM.btnApplyFilter.addEventListener('click', () => {
    const kec = DOM.filterKecamatan.value;
    const desa = DOM.filterDesa.value;
    const slsId = DOM.filterSls.value;

    DOM.modalFilter.classList.remove('show-modal');
    DOM.modalFilter.classList.add('hidden-modal');

    if (slsId) {
      const target = state.featuresWithBbox.find(f => f.feature.properties.idsls === slsId);
      if (target) {
        const bounds = L.geoJSON(target.feature).getBounds();
        state.map.fitBounds(bounds, { maxZoom: 17, padding: [40, 40] });
        selectFeature(target.feature);
      }
    } else if (desa) {
      const desaFeatures = state.featuresWithBbox
        .filter(f => f.feature.properties.nmkec === kec && f.feature.properties.nmdesa === desa)
        .map(f => f.feature);
      state.map.fitBounds(L.geoJSON(desaFeatures).getBounds(), { padding: [30, 30] });
      showToast(`Menampilkan Desa ${desa}`, 'info');
    } else if (kec) {
      const kecFeatures = state.featuresWithBbox
        .filter(f => f.feature.properties.nmkec === kec)
        .map(f => f.feature);
      state.map.fitBounds(L.geoJSON(kecFeatures).getBounds(), { padding: [30, 30] });
      showToast(`Menampilkan Kecamatan ${kec}`, 'info');
    }
  });
}

function populateFilterDropdowns() {
  DOM.filterKecamatan.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
  state.kecamatanList.forEach(kec => {
    const opt = document.createElement('option');
    opt.value = kec;
    opt.textContent = `Kec. ${kec}`;
    DOM.filterKecamatan.appendChild(opt);
  });
}

/**
 * 11. Basemap Picker Modal Logic
 */
function initBasemapModal() {
  DOM.btnBasemap.addEventListener('click', () => {
    DOM.modalBasemap.classList.remove('hidden-modal');
    DOM.modalBasemap.classList.add('show-modal');
  });

  DOM.btnCloseBasemapModal.addEventListener('click', () => {
    DOM.modalBasemap.classList.remove('show-modal');
    DOM.modalBasemap.classList.add('hidden-modal');
  });

  DOM.basemapOptions.querySelectorAll('input[name="basemapChoice"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      setBasemap(e.target.value);
      DOM.modalBasemap.classList.remove('show-modal');
      DOM.modalBasemap.classList.add('hidden-modal');
    });
  });
}

/**
 * 12. Clipboard & Share Helpers
 */
function initClipboardActions() {
  DOM.btnCopyId.addEventListener('click', () => {
    const id = DOM.slsId.textContent;
    if (id && id !== '-') {
      navigator.clipboard.writeText(id);
      showToast(`ID SLS (${id}) disalin ke clipboard!`, 'success');
    }
  });

  DOM.btnCopyCoord.addEventListener('click', () => {
    const coord = DOM.slsCoord.textContent;
    if (coord && coord !== '-') {
      navigator.clipboard.writeText(coord);
      showToast(`Koordinat (${coord}) disalin ke clipboard!`, 'success');
    }
  });

  DOM.btnShareInfo.addEventListener('click', () => {
    const text = DOM.btnShareInfo.dataset.shareText;
    if (text) {
      if (navigator.share) {
        navigator.share({
          title: 'Informasi SLS Kepulauan Selayar',
          text: text
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(text);
        showToast('Ringkasan info SLS disalin ke clipboard!', 'success');
      }
    }
  });

  DOM.btnCloseDrawer.addEventListener('click', closeDrawer);
  DOM.drawerHandle.addEventListener('click', () => {
    DOM.bottomSheet.classList.toggle('hidden-drawer');
  });
}

/**
 * Toast Notification Engine
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  let bgClass = 'bg-slate-900 text-white border-slate-700';
  let iconName = 'info';

  if (type === 'success') {
    bgClass = 'bg-emerald-600 text-white border-emerald-500';
    iconName = 'check-circle';
  } else if (type === 'warning') {
    bgClass = 'bg-amber-600 text-white border-amber-500';
    iconName = 'alert-triangle';
  } else if (type === 'error') {
    bgClass = 'bg-rose-600 text-white border-rose-500';
    iconName = 'alert-circle';
  }

  toast.className = `${bgClass} px-4 py-2.5 rounded-2xl shadow-xl text-xs sm:text-sm font-medium flex items-center gap-2 border transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto`;
  toast.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i><span>${message}</span>`;

  DOM.toastContainer.appendChild(toast);
  lucide.createIcons();

  // Animation in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  // Auto remove after 3.5s
  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Register Service Worker for PWA Offline Caching
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        console.log('ServiceWorker registered with scope:', reg.scope);
      }).catch(err => {
        console.warn('ServiceWorker registration failed:', err);
      });
    });
  }
}

/**
 * Main Application Bootstrap
 */
function initApp() {
  lucide.createIcons();
  initMap();
  initSearch();
  initCoordinateModal();
  initFilterModal();
  initBasemapModal();
  initClipboardActions();

  // Controls event listeners
  DOM.btnGps.addEventListener('click', handleGeolocation);
  DOM.btnHome.addEventListener('click', handleHomeButton);

  // Load geojson data
  loadGeoJsonData();

  // Service Worker
  registerServiceWorker();
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
