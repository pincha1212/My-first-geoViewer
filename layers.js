'use strict';

let layerControl = null;
let railwayOverlay = null;

function syncLayerRow(buttonId, visible, visibleText='Visible', hiddenText='Oculta') {
  const button = el(buttonId);
  if (!button) return;
  button.classList.toggle('selected', visible);
  button.setAttribute('aria-pressed', String(visible));
  const state = button.querySelector('.layer-state');
  if (state) state.textContent = visible ? visibleText : hiddenText;
  const checkbox = button.querySelector('input[type="checkbox"]');
  if (checkbox) checkbox.checked = visible;
}

function setPlazasVisibility(visible) {
  if (!map || !plazaMarkerCluster) return;
  if (visible && !map.hasLayer(plazaMarkerCluster)) plazaMarkerCluster.addTo(map);
  if (!visible && map.hasLayer(plazaMarkerCluster)) map.removeLayer(plazaMarkerCluster);
  syncLayerRow('quickPlazas', visible, 'Visible', 'Oculta');
  updateLegend();
  updateLayerSummary();
}

function setHeatVisibility(visible) {
  heatVisible = Boolean(visible);
  if (typeof L.heatLayer !== 'function') {
    heatVisible = false;
    syncLayerRow('quickHeat', false, 'Visible', 'No disponible');
    updateLayerSummary();
    return;
  }
  if (!heatLayer) {
    heatLayer = L.heatLayer(
      plazas.map(p => [p.lat, p.lng, .85]),
      { radius:42, blur:26, maxZoom:17, max:1, gradient:{.2:'blue',.45:'cyan',.7:'yellow',1:'red'} }
    );
    if (layerControl) safe('añadir densidad al control', () => layerControl.addOverlay(heatLayer, 'Densidad'));
  }
  if (heatVisible && !map.hasLayer(heatLayer)) heatLayer.addTo(map);
  if (!heatVisible && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
  syncLayerRow('quickHeat', heatVisible, 'Visible', 'Oculta');
  updateLegend();
  updateLayerSummary();
}

function initRailwayOverlay() {
  if (!map || railwayOverlay) return;
  railwayOverlay = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
    minZoom:0,
    maxZoom:19,
    opacity:0.8,
    attribution:'&copy; OpenRailwayMap contributors'
  });
}

function initLayerControl() {
  if (!map || !L.control?.layers || !plazaMarkerCluster) return;
  initRailwayOverlay();
  safe('control nativo de capas', () => {
    const overlays = {
      'Plazas destacadas': plazaMarkerCluster
    };
    if (heatLayer) overlays['Densidad'] = heatLayer;
    if (railwayOverlay) overlays['Red ferroviaria'] = railwayOverlay;
    layerControl = L.control.layers(null, overlays, {
      collapsed: true,
      position: 'topright',
      sortLayers: false,
      autoZIndex: true
    });
    layerControl.addTo(map);
    const container = layerControl.getContainer();
    if (container) container.setAttribute('aria-label', 'Control de capas de Leaflet');
    syncNativeLayerControl();
  });
}

function syncNativeLayerControl() {
  if (!layerControl || !layerControl.getContainer() || !map) return;
  const inputs = layerControl.getContainer().querySelectorAll('input.leaflet-control-layers-selector');
  inputs.forEach(input => {
    const label = input.closest('label');
    const text = label?.textContent?.trim() || '';
    if (text === 'Plazas destacadas' && plazaMarkerCluster) input.checked = map.hasLayer(plazaMarkerCluster);
    if (text === 'Densidad' && heatLayer) input.checked = map.hasLayer(heatLayer);
  });
}

function applyBaseMap(type) {
  safe('cambiar mapa base', () => {
    const button = document.querySelector(`.choice-card[data-basemap=\"${type}\"]`);
    if (button?.classList.contains('disabled')) return;
    if (!baseLayers[type]) return;
    Object.values(baseLayers).forEach(l => {
      if (map.hasLayer(l)) map.removeLayer(l);
    });
    baseLayers[type].addTo(map);
    activeBase = type;
    document.querySelectorAll('.choice-card').forEach(b => b.classList.toggle('selected', b.dataset.basemap === type));
    map.invalidateSize(false);
  });
}

function setPlazaOpacity(value) {
  const n = Math.max(0, Math.min(100, Number(value) || 0)) / 100;
  markerById.forEach(m => m.setOpacity(n));
  if (el('opacityPlazasValue')) el('opacityPlazasValue').value = `${Math.round(n * 100)}%`;
}

function showAllLayers() {
  setPlazasVisibility(true);
  setHeatVisibility(true);
}

function hideAllLayers() {
  setPlazasVisibility(false);
  setHeatVisibility(false);
}

function updateLayerSummary() {
  const summary = el('layerSummary');
  if (!summary) return;
  const visible = [
    map?.hasLayer(plazaMarkerCluster) ? '1' : '',
    heatVisible ? '1' : ''
  ].filter(Boolean).length;
  summary.textContent = `${visible} de 2 capas activas`;
}

function openTab(tab) {
  document.querySelectorAll('.panel-tab').forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.hidden = p.dataset.panel !== tab);
  if (tab === 'layers') syncNativeLayerControl();
}

function closeFloatingPanels() {
  const p = el('miniMapOptions');
  if (p) p.hidden = true;
}
