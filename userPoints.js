'use strict';

let userPointDraftLatLng = null;
let userPointCreateHandler = null;
let userPointStorageAvailable = null;

function userPointStatus(message, isError = false) {
  const status = el('userPointStatus');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function userPointId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `user-point-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadUserPointsFromStorage() {
  try {
    const raw = localStorage.getItem(USER_POINTS_STORAGE_KEY);
    userPointStorageAvailable = true;
    if (!raw) {
      userPoints = [];
      return userPoints;
    }
    const parsed = JSON.parse(raw);
    userPoints = Array.isArray(parsed)
      ? parsed.filter(point => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng))).map(point => ({
          id: point.id || userPointId(),
          name: String(point.name || ''),
          description: String(point.description || ''),
          lat: Number(point.lat),
          lng: Number(point.lng),
          createdAt: point.createdAt || new Date().toISOString()
        }))
      : [];
    return userPoints;
  } catch (error) {
    userPointStorageAvailable = false;
    userPoints = [];
    userPointStatus('La persistencia local no está disponible en este navegador. Los puntos seguirán funcionando hasta cerrar la página.', true);
    return userPoints;
  }
}

function saveUserPointsToStorage() {
  try {
    localStorage.setItem(USER_POINTS_STORAGE_KEY, JSON.stringify(userPoints));
    userPointStorageAvailable = true;
    return true;
  } catch (error) {
    userPointStorageAvailable = false;
    userPointStatus('No se pudo guardar en almacenamiento local. El punto queda visible hasta cerrar la página.', true);
    return false;
  }
}

function userPointIcon(name = 'U') {
  const initial = String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
  if (L.BeautifyIcon?.icon) {
    return L.BeautifyIcon.icon({
      iconShape: 'marker',
      text: initial,
      borderWidth: 2,
      borderColor: '#fff',
      textColor: '#fff',
      backgroundColor: '#10a35a',
      isAlphaNumericIcon: true
    });
  }
  return L.divIcon({
    className: 'user-point-marker',
    html: `<span><b>${escapeHtml(initial)}</b></span>`,
    iconSize: [30, 38],
    iconAnchor: [15, 37],
    popupAnchor: [0, -34]
  });
}

function buildUserPointsCluster() {
  if (!map || !L.markerClusterGroup) return null;
  const existed = Boolean(userPointsCluster);
  const wasVisible = existed && map.hasLayer(userPointsCluster);
  if (!existed) {
    userPointsCluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true
    });
  } else {
    userPointsCluster.clearLayers();
  }

  userPoints.forEach(point => {
    const marker = L.marker([point.lat, point.lng], { icon: userPointIcon(point.name), opacity: 1 });
    marker.on('click', () => openPointEditor(point));
    marker.__userPointId = point.id;
    userPointsCluster.addLayer(marker);
  });

  if (!existed || wasVisible) userPointsCluster.addTo(map);
  if (!existed && typeof layerControl?.addOverlay === 'function') {
    safe('añadir puntos personalizados al control', () => layerControl.addOverlay(userPointsCluster, 'Puntos personalizados'));
  }
  if (typeof updateLayerSummary === 'function') updateLayerSummary();
  if (typeof syncNativeLayerControl === 'function') syncNativeLayerControl();
  return userPointsCluster;
}

function refreshUserPointsCluster() {
  if (!map) return;
  buildUserPointsCluster();
}

function initUserPoints() {
  if (!map) return;
  loadUserPointsFromStorage();
  buildUserPointsCluster();
  if (typeof ensureUserPointsLayerRow === 'function') ensureUserPointsLayerRow();
  if (typeof syncNativeLayerControl === 'function') syncNativeLayerControl();
  if (userPointStorageAvailable === false) return;
  userPointStatus(userPoints.length ? `${userPoints.length} punto${userPoints.length === 1 ? '' : 's'} personalizado${userPoints.length === 1 ? '' : 's'} cargado${userPoints.length === 1 ? '' : 's'}.` : 'Listo para crear puntos personalizados.');
}

function setUserPointMode(active) {
  userPointMode = Boolean(active);
  const mapContainer = map?.getContainer?.();
  if (mapContainer) mapContainer.style.cursor = userPointMode ? 'crosshair' : '';
  const cancelButton = el('btnCancelPointMode');
  if (cancelButton) cancelButton.hidden = !userPointMode;
  const hint = el('mapHint');
  if (hint && userPointMode) {
    hint.hidden = false;
    hint.textContent = 'Hacé clic en el mapa para ubicar tu punto';
  }
}

function startCreatePoint() {
  if (!map) return;
  cancelCreatePoint();
  userPointDraftLatLng = null;
  userPointCreateHandler = event => {
    map.off('click', userPointCreateHandler);
    userPointCreateHandler = null;
    setUserPointMode(false);
    userPointDraftLatLng = event.latlng;
    openPointEditor(event.latlng);
  };
  map.on('click', userPointCreateHandler);
  setUserPointMode(true);
}

function cancelCreatePoint() {
  if (map && userPointCreateHandler) map.off('click', userPointCreateHandler);
  userPointCreateHandler = null;
  userPointDraftLatLng = null;
  userPointMode = false;
  const mapContainer = map?.getContainer?.();
  if (mapContainer) mapContainer.style.cursor = '';
  const cancelButton = el('btnCancelPointMode');
  if (cancelButton) cancelButton.hidden = true;
  const hint = el('mapHint');
  if (hint && hint.textContent === 'Hacé clic en el mapa para ubicar tu punto') hint.hidden = true;
}

function pointEditorHtml(point) {
  const lat = point.lat.toFixed(6);
  const lng = point.lng.toFixed(6);
  return `<div class="user-point-editor-form">
    <label>Nombre <input id="userPointName" type="text" maxlength="120" value="${escapeHtml(point.name)}" required></label>
    <label>Descripción <textarea id="userPointDescription" rows="3" maxlength="500">${escapeHtml(point.description)}</textarea></label>
    <div class="user-point-coordinates"><span>Lat</span><input id="userPointLat" type="text" value="${lat}" readonly><span>Lon</span><input id="userPointLng" type="text" value="${lng}" readonly></div>
    <div class="user-point-actions">
      <button type="button" class="user-point-save" data-user-point-action="save">Guardar</button>
      <button type="button" class="user-point-cancel" data-user-point-action="cancel">Cancelar</button>
      ${point.id ? '<button type="button" class="user-point-delete" data-user-point-action="delete">Eliminar punto</button>' : ''}
    </div>
  </div>`;
}

function openPointEditor(latlngOrPoint) {
  if (!map) return;
  const isExisting = Boolean(latlngOrPoint?.id);
  const point = isExisting
    ? { ...latlngOrPoint }
    : {
        id: null,
        name: '',
        description: '',
        lat: Number(latlngOrPoint.lat),
        lng: Number(latlngOrPoint.lng),
        createdAt: new Date().toISOString()
      };

  editingUserPointId = point.id;
  userPointDraftLatLng = isExisting ? null : L.latLng(point.lat, point.lng);

  const popup = L.popup({
    className: 'user-point-editor',
    maxWidth: 330,
    minWidth: 260,
    autoPan: true,
    autoPanPaddingTopLeft: [20, 90],
    autoPanPaddingTopRight: [380, 90]
  });

  popup.setLatLng([point.lat, point.lng]).setContent(pointEditorHtml(point)).openOn(map);
  setTimeout(() => {
    const input = el('userPointName');
    input?.focus();
    document.querySelectorAll('[data-user-point-action]').forEach(button => {
      button.addEventListener('click', event => {
        const action = event.currentTarget.dataset.userPointAction;
        if (action === 'save') savePointFromEditor();
        if (action === 'cancel') map.closePopup();
        if (action === 'delete' && point.id) deleteUserPoint(point.id);
      }, { once: true });
    });
  }, 0);
}

function savePointFromEditor() {
  const nameInput = el('userPointName');
  const descriptionInput = el('userPointDescription');
  const latInput = el('userPointLat');
  const lngInput = el('userPointLng');
  const name = nameInput?.value.trim() || '';
  const lat = Number(latInput?.value);
  const lng = Number(lngInput?.value);
  if (!name) {
    userPointStatus('El nombre del punto es obligatorio.', true);
    nameInput?.focus();
    return;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  if (editingUserPointId) {
    const point = userPoints.find(item => item.id === editingUserPointId);
    if (!point) return;
    point.name = name;
    point.description = descriptionInput?.value.trim() || '';
    point.lat = lat;
    point.lng = lng;
  } else {
    userPoints.push({
      id: userPointId(),
      name,
      description: descriptionInput?.value.trim() || '',
      lat,
      lng,
      createdAt: new Date().toISOString()
    });
  }

  const persisted = saveUserPointsToStorage();
  refreshUserPointsCluster();
  map.closePopup();
  editingUserPointId = null;
  userPointDraftLatLng = null;
  if (persisted) userPointStatus(`${userPoints.length} punto${userPoints.length === 1 ? '' : 's'} personalizado${userPoints.length === 1 ? '' : 's'}.`);
}

function deleteUserPoint(id) {
  const point = userPoints.find(item => item.id === id);
  if (!point) return;
  if (!window.confirm(`¿Eliminar el punto "${point.name || 'Sin nombre'}"?`)) return;
  userPoints = userPoints.filter(item => item.id !== id);
  const persisted = saveUserPointsToStorage();
  refreshUserPointsCluster();
  map.closePopup();
  editingUserPointId = null;
  if (persisted) userPointStatus(`${userPoints.length} punto${userPoints.length === 1 ? '' : 's'} personalizado${userPoints.length === 1 ? '' : 's'}.`);
}

function parseUserPointGeoJSON(data) {
  if (!data || typeof data !== 'object') throw new Error('El contenido no es un GeoJSON válido.');
  const features = data.type === 'FeatureCollection' ? data.features : data.type === 'Feature' ? [data] : data.type === 'Point' ? [{ type: 'Feature', properties: {}, geometry: data }] : null;
  if (!Array.isArray(features)) throw new Error('El GeoJSON debe ser un Point, Feature o FeatureCollection de puntos.');
  const points = [];
  features.forEach(feature => {
    const geometry = feature?.geometry;
    if (geometry?.type !== 'Point' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) return;
    const lng = Number(geometry.coordinates[0]);
    const lat = Number(geometry.coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const properties = feature.properties || {};
    points.push({
      id: userPointId(),
      name: String(properties.name ?? properties.nombre ?? ''),
      description: String(properties.description ?? properties.descripcion ?? ''),
      lat,
      lng,
      createdAt: new Date().toISOString()
    });
  });
  if (!points.length) throw new Error('No se encontraron geometrías Point válidas en el GeoJSON.');
  return points;
}

function addImportedUserPoints(points) {
  userPoints.push(...points);
  const persisted = saveUserPointsToStorage();
  refreshUserPointsCluster();
  if (persisted) userPointStatus(`Se cargaron ${points.length} punto${points.length === 1 ? '' : 's'} personalizado${points.length === 1 ? '' : 's'}.`);
}

async function importPointsFromFile(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const points = parseUserPointGeoJSON(data);
    addImportedUserPoints(points);
  } catch (error) {
    console.warn('[Geovisor] GeoJSON de puntos no válido', error);
    userPointStatus(`No se pudo cargar el GeoJSON: ${error.message || 'formato no válido'}`, true);
  }
}

async function importPointsFromUrl(url) {
  const target = String(url || '').trim();
  if (!target) {
    userPointStatus('Ingresá una URL de GeoJSON.', true);
    return;
  }
  try {
    const response = await fetch(target, { headers: { Accept: 'application/geo+json, application/json' } });
    if (!response.ok) throw new Error(`Respuesta HTTP ${response.status}`);
    const data = await response.json();
    const points = parseUserPointGeoJSON(data);
    addImportedUserPoints(points);
  } catch (error) {
    console.warn('[Geovisor] No se pudo cargar GeoJSON desde URL', error);
    userPointStatus(`No se pudo cargar el GeoJSON desde la URL: ${error.message || 'error de conexión o CORS'}`, true);
  }
}
