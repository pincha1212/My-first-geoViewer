'use strict';

let importedLayers = new Map();
let printControl = null;

function initShramovLeafletPlugins() {
  if (!map || !window.L) return;

  safe('control de impresión', () => {
    if (L.control?.browserPrint) {
      printControl = L.control.browserPrint({
        position: 'bottomleft',
        title: 'Imprimir mapa',
        documentTitle: 'Geovisor Gran Mendoza',
        closePopupsOnPrint: true,
        printModes: [
          L.BrowserPrint.Mode.Landscape(),
          L.BrowserPrint.Mode.Portrait(),
          L.BrowserPrint.Mode.Auto(),
          L.BrowserPrint.Mode.Custom()
        ]
      });
      printControl.addTo(map);
    }
  });

  bindLayerFileLoader();
}

function bindLayerFileLoader() {
  const button = el('btnLoadLayer');
  const input = el('layerFileInput');
  if (!button || !input) return;

  button.addEventListener('click', () => input.click());
  input.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await safeAsync('cargar capa geográfica', () => loadLocalVectorFile(file));
    input.value = '';
  });
}

async function loadLocalVectorFile(file) {
  const status = el('layerImportStatus');
  const ext = file.name.toLowerCase().split('.').pop();

  if (!['gpx', 'kml', 'topojson', 'json'].includes(ext)) {
    setLayerImportStatus('Formato no compatible.', true);
    return;
  }

  try {
    const text = await file.text();
    let layer;

    if (ext === 'gpx') {
      layer = parseGPXText(text);
    } else if (ext === 'kml') {
      layer = parseKMLText(text);
    } else {
      layer = parseTopoJSONText(text);
    }

    if (!layer || !layer.getLayers || layer.getLayers().length === 0) {
      throw new Error('El archivo no contiene geometrías compatibles.');
    }

    const safeName = file.name.replace(/\.[^.]+$/, '') || 'Capa importada';
    const styledLayer = styleImportedLayer(layer, ext);
    styledLayer.addTo(map);
    importedLayers.set(safeName, styledLayer);

    if (typeof layerControl?.addOverlay === 'function') {
      layerControl.addOverlay(styledLayer, safeName);
      syncNativeLayerControl();
    }

    const bounds = styledLayer.getBounds?.();
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }

    setLayerImportStatus(`${safeName} cargada.`);
  } catch (error) {
    console.error('[Geovisor] cargar archivo', error);
    setLayerImportStatus(`No se pudo cargar ${file.name}.`, true);
  }
}

function parseGPXText(text) {
  if (!window.L.GPX) throw new Error('El plugin GPX no está disponible.');
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  if (xml.querySelector('parsererror')) throw new Error('GPX inválido.');

  const parserInstance = new L.GPX(null, {
    async: false,
    display_wpt: true,
    color: '#1769e0',
    weight: 4,
    opacity: 0.9
  });
  const parsed = parserInstance.parseGPX(xml, parserInstance.options);
  if (!parsed) throw new Error('GPX sin geometrías.');

  return parsed instanceof L.LayerGroup ? parsed : L.featureGroup([parsed]);
}

function parseKMLText(text) {
  if (!window.L.KML) throw new Error('El plugin KML no está disponible.');
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  if (xml.querySelector('parsererror')) throw new Error('KML inválido.');

  const layers = L.KML.parseKML(xml, {});
  if (!Array.isArray(layers) || !layers.length) throw new Error('KML sin geometrías.');
  return L.featureGroup(layers);
}

function parseTopoJSONText(text) {
  if (!window.L.TOPOJSON) throw new Error('El plugin TopoJSON no está disponible.');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSON inválido.');
  }

  const parserInstance = new L.TOPOJSON(null, { async: false });
  const layers = parserInstance.parseTOPOJSON(data);
  if (!Array.isArray(layers) || !layers.length) throw new Error('TopoJSON sin geometrías.');
  return L.featureGroup(layers);
}

function styleImportedLayer(layer, ext) {
  layer.eachLayer(child => {
    if (child instanceof L.Path) {
      child.setStyle({
        color: ext === 'gpx' ? '#1769e0' : '#c85a11',
        weight: 3,
        opacity: 0.9,
        fillOpacity: 0.2
      });
    }
  });
  return layer;
}

function setLayerImportStatus(message, error = false) {
  const status = el('layerImportStatus');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', error);
}
