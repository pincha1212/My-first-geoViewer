'use strict';

function initMap() {
  if (!window.L) throw new Error('Leaflet no está disponible.');
  map = L.map('map', { zoomControl:true, worldCopyJump:false, minZoom:2, maxZoom:19 }).setView(INITIAL_VIEW.center, INITIAL_VIEW.zoom);

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
  initLegend();
  map.on('mousemove', e => { const c=el('coordinateStatus'); if(c) c.textContent=`Lat: ${e.latlng.lat.toFixed(5)}   Lon: ${e.latlng.lng.toFixed(5)}`; });
  map.on('zoomend', () => { const z=el('scaleStatus'); if(z) z.textContent=`Zoom: ${map.getZoom().toFixed(1)}`; syncMiniMap(); });
  map.on('moveend', syncMiniMap);
  window.addEventListener('resize', () => safe('redimensionar mapa', () => { map.invalidateSize(false); syncMiniMap(); }));
  return map;
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
