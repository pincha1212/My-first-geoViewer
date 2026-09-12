'use strict';

let fallbackBearing = 0;
let fallbackRotateStart = null;
let fallbackRotateActive = false;

function initMap() {
  if (!window.L) throw new Error('Leaflet no está disponible.');
  map = L.map('map', { zoomControl:true, worldCopyJump:false, minZoom:2, maxZoom:19, rotate:true, touchRotate:true, shiftKeyRotate:true, bearing:0 }).setView(INITIAL_VIEW.center, INITIAL_VIEW.zoom);

  if (window.location.protocol === 'file:') {
    const hint = el('mapHint');
    if (hint) {
      hint.textContent = 'Para usar la rotación y otros plugins, serví el proyecto con un servidor local (ej: python -m http.server) en lugar de abrir el archivo directamente.';
      hint.hidden = false;
    }
  }

  baseLayers = {};
  baseLayers.street = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom:19,
    attribution:'&copy; Esri'
  });

  baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom:19,
    attribution:'Sources: Esri'
  });

  baseLayers.topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom:17,
    attribution:'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
  });

  activeBase = 'street';
  baseLayers[activeBase].addTo(map);

  document.querySelectorAll('.choice-card[data-basemap]').forEach(b => {
    const available = Boolean(baseLayers[b.dataset.basemap]);
    b.disabled = !available;
    b.classList.toggle('unavailable', !available);
    b.setAttribute('aria-disabled', String(!available));
  });

  safe('escala', () => L.control.scale({ position:'bottomleft', imperial:false, metric:true, maxWidth:140 }).addTo(map));
  initCompass();
  initLegend();
  updateCompass();
  map.on('mousemove', e => { const c=el('coordinateStatus'); if(c) c.textContent=`Lat: ${e.latlng.lat.toFixed(5)}   Lon: ${e.latlng.lng.toFixed(5)}`; });
  map.on('zoomend', () => { const z=el('scaleStatus'); if(z) z.textContent=`Zoom: ${map.getZoom().toFixed(1)}`; syncMiniMap(); });
  map.on('moveend', syncMiniMap);
  window.addEventListener('resize', () => safe('redimensionar mapa', () => { map.invalidateSize(false); syncMiniMap(); }));
  return map;
}

function initCompass() {
  if (!map || !window.L) return;

  const hasNativeBearing = typeof map.setBearing === 'function';
  console.info(`[Geovisor] Rotación Leaflet: map.setBearing ${hasNativeBearing ? 'disponible' : 'no disponible; se usará fallback CSS'}.`);

  const CompassControl = L.Control.extend({
    onAdd() {
      const button = L.DomUtil.create('button', 'map-compass');
      button.type = 'button';
      button.id = 'mapCompass';
      button.setAttribute('aria-label', 'Restablecer orientación al norte');
      button.title = 'Restablecer orientación al norte';
      button.innerHTML = '<span class="compass-ring"><span class="compass-needle"></span><span class="compass-north">N</span></span>';
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, 'click', () => {
        if (hasNativeBearing) {
          map.setBearing(0);
          return;
        }
        setFallbackBearing(0, true);
      });
      return button;
    },
    onRemove() {}
  });

  new CompassControl({ position: 'topleft' }).addTo(map);

  if (hasNativeBearing) {
    map.on('rotate', updateCompass);
    return;
  }

  initFallbackRotation();
}

function initFallbackRotation() {
  const container = map && map.getContainer ? map.getContainer() : null;
  if (!container) return;

  const onStart = (event) => {
    if (!event.shiftKey || event.button !== 0) return;

    const rect = container.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    const dx = event.clientX - center.x;
    const dy = event.clientY - center.y;

    fallbackRotateActive = true;
    fallbackRotateStart = {
      center,
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
      bearing: fallbackBearing
    };

    L.DomEvent.stopPropagation(event);
    event.preventDefault();
  };

  const onMove = (event) => {
    if (!fallbackRotateActive || !fallbackRotateStart) return;

    const dx = event.clientX - fallbackRotateStart.center.x;
    const dy = event.clientY - fallbackRotateStart.center.y;
    const currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    const delta = currentAngle - fallbackRotateStart.angle;

    setFallbackBearing(fallbackRotateStart.bearing - delta, false);
    event.preventDefault();
  };

  const onEnd = () => {
    if (!fallbackRotateActive) return;
    fallbackRotateActive = false;
    fallbackRotateStart = null;
  };

  L.DomEvent.on(container, 'mousedown', onStart);
  L.DomEvent.on(document, 'mousemove', onMove);
  L.DomEvent.on(document, 'mouseup', onEnd);
  L.DomEvent.on(container, 'mouseleave', () => {});
}

function setFallbackBearing(value, animate) {
  fallbackBearing = ((value % 360) + 360) % 360;
  const mapPane = document.querySelector('.leaflet-map-pane');
  const popupPane = document.querySelector('.leaflet-popup-pane');
  if (!mapPane) return;

  mapPane.style.transition = animate ? 'rotate 280ms ease' : 'none';
  mapPane.style.rotate = `${fallbackBearing}deg`;

  if (popupPane) {
    popupPane.style.transition = animate ? 'rotate 280ms ease' : 'none';
    popupPane.style.rotate = `${-fallbackBearing}deg`;
  }

  updateCompass();
}

function updateCompass() {
  const compass = el('mapCompass');
  if (!compass || !map) return;
  const bearing = typeof map.getBearing === 'function' ? map.getBearing() : fallbackBearing;
  compass.style.setProperty('--compass-bearing', `${bearing}deg`);
  compass.setAttribute('aria-label', `Orientación ${Math.round((360 - bearing + 360) % 360)} grados. Hacer clic para volver al norte`);
}

function initLegend() {
  const legend = L.control({ position:'topleft' });
  legend.onAdd = () => {
    const div = L.DomUtil.create('div','map-legend');
    div.id='mapLegend';
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  legend.addTo(map);
}

function updateLegend() {
  const legend = el('mapLegend');
  if (!legend || !map) return;

  const items = [];

  if (
    plazaMarkerCluster &&
    typeof map.hasLayer === 'function' &&
    map.hasLayer(plazaMarkerCluster)
  ) {
    items.push('<div class="legend-item"><span class="legend-marker plaza-legend-marker">P</span><span>Plazas destacadas</span></div>');
  }

  if (
    heatVisible &&
    typeof heatLayer !== 'undefined' &&
    heatLayer &&
    typeof map.hasLayer === 'function' &&
    map.hasLayer(heatLayer)
  ) {
    items.push('<div class="legend-item"><span class="heat-gradient"></span><span>Densidad</span></div>');
  }

  legend.innerHTML = items.length
    ? `<div class="legend-title">Leyenda</div>${items.join('')}`
    : '';
  legend.style.display = items.length ? 'block' : 'none';
}
