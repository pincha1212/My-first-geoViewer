'use strict';

function initMiniMap() {
  if (!map || !window.L || !L.Control || !L.Control.MiniMap) return;
  try {
    miniMapLayers = {
      street: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        minZoom: 0,
        maxZoom: 19,
        attribution: '&copy; Esri'
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        minZoom: 0,
        maxZoom: 19,
        attribution: 'Sources: Esri'
      }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 17,
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
      })
    };

    miniMapControl = new L.Control.MiniMap(miniMapLayers[selectedMiniMap], {
      position: 'bottomright',
      width: 190,
      height: 130,
      collapsedWidth: 26,
      collapsedHeight: 26,
      zoomLevelOffset: -5,
      zoomAnimation: false,
      toggleDisplay: true,
      minimized: false,
      aimingRectOptions: {
        color: '#1769e0',
        weight: 2,
        opacity: 0.9,
        fill: false
      },
      shadowRectOptions: {
        color: '#1769e0',
        weight: 1,
        opacity: 0.15,
        fillOpacity: 0.05
      },
      strings: {
        hideText: 'Ocultar mini mapa',
        showText: 'Mostrar mini mapa'
      }
    }).addTo(map);

    syncMiniMap();
  } catch (error) {
    console.error('[Geovisor] mini mapa', error);
  }
}

function syncMiniMap() {
  if (!map || !miniMapControl) return;
  safe('sincronizar mini mapa', () => {
    if (miniMapControl._miniMap) {
      miniMapControl._miniMap.invalidateSize(false);
    }
  });
}

function setMiniMapLayer(type) {
  if (!miniMapLayers[type] || !miniMapControl) return;
  try {
    if (selectedMiniMap !== type && typeof miniMapControl.changeLayer === 'function') {
      miniMapControl.changeLayer(miniMapLayers[type]);
    }
    selectedMiniMap = type;
    document.querySelectorAll('.mini-choice').forEach(button => {
      button.classList.toggle('selected', button.dataset.minimap === type);
    });
  } catch (error) {
    console.error('[Geovisor] cambio de capa del mini mapa', error);
  }
}

function setMiniMapVisible(visible) {
  miniMapVisible = Boolean(visible);
  if (!miniMapControl) return;
  try {
    if (miniMapVisible) {
      if (typeof miniMapControl._restore === 'function') miniMapControl._restore();
    } else {
      if (typeof miniMapControl._minimize === 'function') miniMapControl._minimize();
    }
    setTimeout(syncMiniMap, 60);
  } catch (error) {
    console.error('[Geovisor] visibilidad del mini mapa', error);
  }
}
