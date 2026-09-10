'use strict';

const INITIAL_VIEW = { center: [-32.895, -68.842], zoom: 12.3 };

const plazas = [
  { id:'independencia', name:'Plaza Independencia', locality:'Ciudad de Mendoza', lat:-32.889674, lng:-68.844485, imageFile:'Mendoza - Plaza Independencia (14105238653).jpg', author:'Miguel', license:'CC BY-SA 2.0', source:'Wikimedia Commons' },
  { id:'san-martin', name:'Plaza San Martín', locality:'Ciudad de Mendoza', lat:-32.88765, lng:-68.84065, imageFile:'Plaza San Martín, Mendoza 4520.jpg', author:'Tokyo Tanenhaus', license:'CC BY 2.0', source:'Wikimedia Commons' },
  { id:'espana', name:'Plaza España', locality:'Ciudad de Mendoza', lat:-32.89296, lng:-68.84203, imageFile:'Plaza españa mendoza.jpg', author:'Beatrice Louise Murch', license:'CC BY-SA 2.0', source:'Wikimedia Commons' },
  { id:'italia', name:'Plaza Italia', locality:'Ciudad de Mendoza', lat:-32.891739, lng:-68.848566, imageFile:'Plaza Italia-Mendoza.jpg', author:'Alejandra2506', license:'CC BY-SA 4.0', source:'Wikimedia Commons' },
  { id:'chile', name:'Plaza Chile', locality:'Ciudad de Mendoza', lat:-32.88643, lng:-68.84698, imageFile:'Plaza Chile en Mendoza, Argentina.jpg', author:'Municipalidad de Mendoza', license:'CC BY-SA 4.0', source:'Wikimedia Commons' },
  { id:'pedro-del-castillo', name:'Plaza Pedro del Castillo', locality:'Área Fundacional, Ciudad de Mendoza', lat:-32.879761, lng:-68.828262, imageFile:'Mendoza - Plaza Pedro del Castillo.JPG', author:'Leandro Kibisz', license:'CC BY-SA 4.0', source:'Wikimedia Commons' }
];

const el = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const imageUrl = file => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}`;

let map = null;
let baseLayers = {};
let activeBase = 'street';
let plazaMarkerCluster = null;
let markerById = new Map();
let heatLayer = null;
let heatVisible = false;
let temporarySearchMarker = null;
let searchTimer = null;
let selectedMiniMap = 'street';
let miniMapVisible = true;
let miniMapInstance = null;
let miniMapViewport = null;
let miniMapControl = null;
let miniMapLayers = {};

function safe(label, fn, fallback) {
  try { return fn(); } catch (error) {
    console.error(`[Geovisor] ${label}`, error);
    if (typeof fallback === 'function') { try { return fallback(error); } catch (_) {} }
    return undefined;
  }
}

function safeAsync(label, fn) {
  return Promise.resolve().then(fn).catch(error => { console.error(`[Geovisor] ${label}`, error); return null; });
}

function initMap() {
  if (!window.L) throw new Error('Leaflet no está disponible.');
  map = L.map('map', { zoomControl:true, preferCanvas:true, worldCopyJump:false }).setView(INITIAL_VIEW.center, INITIAL_VIEW.zoom);

  baseLayers.street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'&copy; OpenStreetMap contributors' });
  baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom:19, attribution:'Sources: Esri' });
  baseLayers.topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom:17, attribution:'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap' });
  baseLayers.street.addTo(map);

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
  updateLegend();
}

function updateLegend() {
  const legend=el('mapLegend');
  if(!legend || !map) return;
  const items=[];
  if(map.hasLayer(plazaMarkerCluster)) items.push('<div class="legend-item"><span class="legend-marker plaza-legend-marker">P</span><span>Plazas destacadas</span></div>');
  if(heatVisible) items.push('<div class="legend-item"><span class="heat-gradient"></span><span>Densidad</span></div>');
  legend.innerHTML=items.length ? `<div class="legend-title">Leyenda</div>${items.join('')}` : '';
  legend.style.display=items.length?'block':'none';
}

function plazaIcon() {
  if (L.BeautifyIcon?.icon) return L.BeautifyIcon.icon({ iconShape:'marker', text:'P', borderWidth:2, borderColor:'#fff', textColor:'#fff', backgroundColor:'#1769e0', isAlphaNumericIcon:true });
  return L.divIcon({ className:'fallback-marker', html:'<span style="display:grid;place-items:center;width:30px;height:38px;border-radius:16px 16px 16px 3px;transform:rotate(-45deg);background:#1769e0;color:#fff;border:2px solid #fff;font:bold 11px sans-serif">P</span>', iconSize:[30,38], iconAnchor:[15,37], popupAnchor:[0,-34] });
}

function popupHtml(plaza) {
  return `<article class="popup-card"><img src="${imageUrl(plaza.imageFile)}" alt="${escapeHtml(plaza.name)}" loading="lazy"><div class="popup-body"><h3 class="popup-title">${escapeHtml(plaza.name)}</h3><p class="popup-location">${escapeHtml(plaza.locality)}</p><p class="popup-coordinates">${plaza.lat.toFixed(6)}, ${plaza.lng.toFixed(6)}</p><p class="popup-attribution">Foto: ${escapeHtml(plaza.author)} · ${escapeHtml(plaza.license)} · ${escapeHtml(plaza.source)}</p></div></article>`;
}

function showInfoPanel(plaza) {
  const panel=el('infoPanel'), content=el('infoContent'), hint=el('mapHint');
  if(!panel || !content) return;
  content.innerHTML=`<img class="info-photo" src="${imageUrl(plaza.imageFile)}" alt="${escapeHtml(plaza.name)}" loading="lazy"><div class="info-body"><h2 class="info-title">${escapeHtml(plaza.name)}</h2><p class="info-subtitle">${escapeHtml(plaza.locality)}</p><div class="info-grid"><div class="info-data"><span class="info-label">Latitud</span><span class="info-value">${plaza.lat.toFixed(6)}</span></div><div class="info-data"><span class="info-label">Longitud</span><span class="info-value">${plaza.lng.toFixed(6)}</span></div><div class="info-data"><span class="info-label">Tipo</span><span class="info-value">Plaza urbana</span></div><div class="info-data"><span class="info-label">Fuente foto</span><span class="info-value">Wikimedia Commons</span></div></div><p class="info-credit">Fotografía: ${escapeHtml(plaza.author)} · ${escapeHtml(plaza.license)}. Coordenadas representadas para consulta cartográfica.</p></div>`;
  panel.hidden=false; if(hint) hint.hidden=true;
}

function hideInfoPanel() { if(el('infoPanel')) el('infoPanel').hidden=true; if(el('mapHint')) el('mapHint').hidden=false; }

function setPlazasVisibility(visible) {
  if(!map || !plazaMarkerCluster) return;
  if(visible && !map.hasLayer(plazaMarkerCluster)) plazaMarkerCluster.addTo(map);
  if(!visible && map.hasLayer(plazaMarkerCluster)) map.removeLayer(plazaMarkerCluster);
  const b=el('quickPlazas'); if(b){b.classList.toggle('selected',visible);b.setAttribute('aria-pressed',String(visible));const s=b.querySelector('.layer-state');if(s)s.textContent=visible?'Visible':'Oculta';}
  updateLegend();
}

function setHeatVisibility(visible) {
  heatVisible=Boolean(visible);
  if(typeof L.heatLayer!=='function'){ heatVisible=false; const b=el('quickHeat'); if(b){b.classList.remove('selected');b.setAttribute('aria-pressed','false');} return; }
  if(!heatLayer) heatLayer=L.heatLayer(plazas.map(p=>[p.lat,p.lng,.85]),{radius:42,blur:26,maxZoom:17,max:1,gradient:{.2:'blue',.45:'cyan',.7:'yellow',1:'red'}});
  if(heatVisible) heatLayer.addTo(map); else if(map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
  const b=el('quickHeat'); if(b){b.classList.toggle('selected',heatVisible);b.setAttribute('aria-pressed',String(heatVisible));const s=b.querySelector('.layer-state');if(s)s.textContent=heatVisible?'Visible':'Oculta';}
  updateLegend();
}

function buildPlazas() {
  plazaMarkerCluster=L.markerClusterGroup({ showCoverageOnHover:false, maxClusterRadius:45, spiderfyOnMaxZoom:true });
  const icon=plazaIcon();
  plazas.forEach(plaza=>{
    const marker=L.marker([plaza.lat,plaza.lng],{icon,opacity:1});
    marker.bindPopup(popupHtml(plaza),{maxWidth:300,autoPan:true,autoPanPaddingTopLeft:[20,90],autoPanPaddingTopRight:[380,90]});
    marker.on('click',()=>{activateListItem(plaza.id);showInfoPanel(plaza);});
    plazaMarkerCluster.addLayer(marker); markerById.set(plaza.id,marker);
  });
  plazaMarkerCluster.addTo(map);
  bindExplorerList();
  setPlazasVisibility(true);
}

function activateListItem(id) { document.querySelectorAll('.entity-main').forEach(b=>b.classList.toggle('active',b.dataset.id===id)); }

function bindExplorerList() {
  const list=el('plazaList'); if(!list) return;
  list.innerHTML=plazas.map(p=>`<div class="entity-item" data-id="${escapeHtml(p.id)}" data-search-text="${escapeHtml(`${p.name} ${p.locality}`.toLowerCase())}"><button class="entity-main" type="button" data-id="${escapeHtml(p.id)}" aria-label="Ver ${escapeHtml(p.name)} en el mapa"><img class="plaza-mini" src="${imageUrl(p.imageFile)}" alt="" loading="lazy"><span><span class="plaza-name">${escapeHtml(p.name)}</span><span class="plaza-location">${escapeHtml(p.locality)}</span></span><span class="entity-action-label">Ver mapa</span></button><a class="entity-quick" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener" aria-label="Cómo llegar a ${escapeHtml(p.name)}">↗</a></div>`).join('');
  list.querySelectorAll('.entity-main').forEach(btn=>btn.addEventListener('click',()=>focusPlaza(btn.dataset.id)));
  updateExplorerSearch();
}

function focusPlaza(id) {
  const plaza=plazas.find(p=>p.id===id), marker=markerById.get(id); if(!plaza||!marker) return;
  setPlazasVisibility(true); activateListItem(id); closeFloatingPanels();
  map.flyTo([plaza.lat,plaza.lng],16,{duration:.8});
  setTimeout(()=>safe('abrir popup',()=>marker.openPopup()),820);
  showInfoPanel(plaza);
}

function updateExplorerSearch() {
  const term=(el('explorerSearch')?.value||'').trim().toLowerCase(), list=el('plazaList'); if(!list)return;
  let count=0; list.querySelectorAll('.entity-item').forEach(row=>{const visible=!term||(row.dataset.searchText||'').includes(term);row.hidden=!visible;if(visible)count++;});
  const old=list.querySelector('.explorer-empty');if(old)old.remove();
  if(term&&!count){const empty=document.createElement('div');empty.className='explorer-empty';empty.textContent='Sin resultados';list.appendChild(empty);}
  if(el('plazaCount'))el('plazaCount').textContent=count; if(el('sectionCount'))el('sectionCount').textContent=count; if(el('explorerSearchStatus'))el('explorerSearchStatus').textContent=term?`${count} ${count===1?'resultado':'resultados'}`:'';
}

function applyBaseMap(type) {
  safe('cambiar mapa base',()=>{if(!baseLayers[type])return;Object.values(baseLayers).forEach(l=>{if(map.hasLayer(l))map.removeLayer(l)});baseLayers[type].addTo(map);activeBase=type;document.querySelectorAll('.choice-card').forEach(b=>b.classList.toggle('selected',b.dataset.basemap===type));map.invalidateSize(false);});
}

function setPlazaOpacity(value) { const n=Math.max(0,Math.min(100,Number(value)||0))/100;markerById.forEach(m=>m.setOpacity(n));if(el('opacityPlazasValue'))el('opacityPlazasValue').value=`${Math.round(n*100)}%`; }

function openTab(tab) { document.querySelectorAll('.panel-tab').forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.dataset.panel!==tab); }
function closeFloatingPanels() { const p=el('miniMapOptions');if(p)p.hidden=true; }

function initMiniMap() {
  if(!map||!window.L) return;
  try {
    miniMapLayers={
      street:L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{minZoom:0,maxZoom:19}),
      satellite:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{minZoom:0,maxZoom:19}),
      topo:L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{minZoom:0,maxZoom:17})
    };
    const Control=L.Control.extend({options:{position:'bottomright'},onAdd(){const c=L.DomUtil.create('div','leaflet-control leaflet-control-minimap');c.style.width='190px';c.style.height='130px';const inner=L.DomUtil.create('div','mini-map-inner',c);L.DomEvent.disableClickPropagation(c);L.DomEvent.disableScrollPropagation(c);this._inner=inner;setTimeout(()=>initMiniMapInstance(inner),0);return c;}});
    miniMapControl=new Control(); miniMapControl.addTo(map);
  } catch(error){console.error('[Geovisor] mini mapa',error);}
}
function initMiniMapInstance(container) {
  try {
    if(miniMapInstance){miniMapInstance.invalidateSize(false);syncMiniMap();return;}
    miniMapInstance=L.map(container,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});
    miniMapLayers[selectedMiniMap].addTo(miniMapInstance);
    miniMapViewport=L.rectangle(map.getBounds(),{color:'#1769e0',weight:1.5,fill:false,interactive:false}).addTo(miniMapInstance);
    syncMiniMap();
  } catch(error){console.error('[Geovisor] inicializar mini mapa',error);}
}
function syncMiniMap(){if(!miniMapInstance||!map)return;safe('sincronizar mini mapa',()=>{miniMapInstance.setView(map.getCenter(),Math.max(2,Math.min(15,map.getZoom()-5)),{animate:false});if(miniMapViewport)miniMapViewport.setBounds(map.getBounds());});}
function setMiniMapLayer(type){if(!miniMapLayers[type])return;if(miniMapInstance&&selectedMiniMap!==type){const old=miniMapLayers[selectedMiniMap];if(miniMapInstance.hasLayer(old))miniMapInstance.removeLayer(old);miniMapLayers[type].addTo(miniMapInstance);}selectedMiniMap=type;document.querySelectorAll('.mini-choice').forEach(b=>b.classList.toggle('selected',b.dataset.minimap===type));}
function setMiniMapVisible(visible){miniMapVisible=Boolean(visible);const c=miniMapControl?._container;if(c)c.style.display=miniMapVisible?'block':'none';}

function initGeoman(){
  if(!map || !map.pm || geomanReady) return;
  try {
    map.pm.addControls({
      position:'bottomleft',
      drawText:false,
      drawCircleMarker:false,
      drawCircle:true,
      drawMarker:true,
      drawPolyline:true,
      drawPolygon:true,
      drawRectangle:true,
      editMode:true,
      dragMode:true,
      cutPolygon:false,
      removalMode:true,
      rotateMode:false,
      oneBlock:false
    });
    geomanReady=true;
    setGeomanVisible(false);
    map.pm.setGlobalOptions({snappable:true});
  } catch(error){console.error('[Geovisor] Leaflet-Geoman',error);}
}
function setGeomanVisible(visible){
  geomanVisible=Boolean(visible);
  const toolbar=document.querySelector('.leaflet-pm-toolbar');
  if(toolbar) toolbar.classList.toggle('geoman-toolbar-hidden',!geomanVisible);
  const btn=el('btnGeoman');
  if(btn){btn.classList.toggle('selected',geomanVisible);btn.setAttribute('aria-pressed',String(geomanVisible));}
  if(el('mapHint') && geomanVisible) el('mapHint').textContent='Elegí una herramienta para dibujar o editar geometrías.';
}

function renderLocalSearch(term){return plazas.filter(p=>`${p.name} ${p.locality}`.toLowerCase().includes(term)).slice(0,5);}
async function photonSearch(term){try{const url=`https://photon.komoot.io/api/?q=${encodeURIComponent(term)}&limit=5&lat=${INITIAL_VIEW.center[0]}&lon=${INITIAL_VIEW.center[1]}`;const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Photon ${response.status}`);const data=await response.json();return (data.features||[]).map(f=>{const [lng,lat]=f.geometry.coordinates;const p=f.properties||{};return{name:p.name||p.street||'Lugar',center:{lat,lng},properties:p};});}catch(error){console.warn('[Geovisor] Photon no disponible',error);return[];}}
async function nominatimSearch(term){try{const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=es&countrycodes=ar&q=${encodeURIComponent(term)}`;const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Nominatim ${response.status}`);const data=await response.json();return data.map(r=>({name:r.display_name?.split(',')[0]||r.name||'Lugar',center:{lat:Number(r.lat),lng:Number(r.lon)},properties:{display_name:r.display_name,type:r.type}}));}catch(error){console.warn('[Geovisor] Nominatim no disponible',error);return[];}}
function mergeRemoteResults(photon,nominatim){const seen=new Set();const out=[];for(const item of [...photon,...nominatim]){if(!item?.center||!Number.isFinite(item.center.lat)||!Number.isFinite(item.center.lng))continue;const key=`${item.center.lat.toFixed(5)},${item.center.lng.toFixed(5)},${String(item.name).toLowerCase()}`;if(seen.has(key))continue;seen.add(key);out.push(item);}return out.slice(0,8);}
function renderSearchBox(local,remote=[]){const box=el('searchResults');if(!box)return;const html=[...local.map(p=>`<button class="search-result" type="button" data-local-id="${escapeHtml(p.id)}"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.locality)} · Geovisor</span></button>`),...remote.map((r,i)=>`<button class="search-result" type="button" data-remote-index="${i}"><strong>${escapeHtml(r.name)}</strong><span>${escapeHtml(r.properties?.city||r.properties?.state||'Ubicación')} · Photon</span></button>`)].join('');box.innerHTML=html||'<div class="search-loading">Sin resultados</div>';box.hidden=false;box.querySelectorAll('[data-local-id]').forEach(b=>b.addEventListener('click',()=>{focusPlaza(b.dataset.localId);box.hidden=true;}));box.querySelectorAll('[data-remote-index]').forEach(b=>b.addEventListener('click',()=>{const r=remote[Number(b.dataset.remoteIndex)];if(!r?.center)return;showTemporarySearchResult(r);map.flyTo(r.center,16,{duration:.8});box.hidden=true;}));}
function showTemporarySearchResult(result){if(temporarySearchMarker)map.removeLayer(temporarySearchMarker);const icon=L.divIcon({className:'search-marker',html:'<span style="display:block;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#17212b;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)"></span>',iconSize:[28,28],iconAnchor:[14,28]});temporarySearchMarker=L.marker(result.center,{icon,zIndexOffset:2000}).addTo(map);temporarySearchMarker.bindPopup(`<strong>${escapeHtml(result.name)}</strong>`).openPopup();}
async function runSearch(term){const query=term.trim();if(!query)return;const local=renderLocalSearch(query.toLowerCase());const [photon,nominatim]=await Promise.all([photonSearch(`${query}, Mendoza, Argentina`),nominatimSearch(`${query}, Mendoza, Argentina`)]);if(el('searchInput')?.value.trim()!==query)return;renderSearchBox(local,mergeRemoteResults(photon,nominatim));}
function updateSearchSuggestions(term){const clean=term.trim().toLowerCase();if(!clean){el('searchResults').hidden=true;return;}renderSearchBox(renderLocalSearch(clean),[]);clearTimeout(searchTimer);searchTimer=setTimeout(()=>safeAsync('sugerencias Photon',async()=>{const [photon,nominatim]=await Promise.all([photonSearch(`${clean}, Mendoza, Argentina`),nominatimSearch(`${clean}, Mendoza, Argentina`)]);if(el('searchInput')?.value.trim().toLowerCase()===clean)renderSearchBox(renderLocalSearch(clean),mergeRemoteResults(photon,nominatim));}),350);}

function bindUI(){
  el('btnClosePanel').addEventListener('click',()=>{el('controlPanel').classList.add('closed');setTimeout(()=>syncMiniMap(),80);});
  el('btnOpenPanel').addEventListener('click',()=>{el('controlPanel').classList.remove('closed');setTimeout(()=>syncMiniMap(),80);});
  el('btnCloseInfo').addEventListener('click',hideInfoPanel);
  document.querySelectorAll('.panel-tab').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab)));
  el('plazaSectionToggle').addEventListener('click',()=>{const btn=el('plazaSectionToggle'),expanded=btn.getAttribute('aria-expanded')==='true';btn.setAttribute('aria-expanded',String(!expanded));el('plazaSectionContent').hidden=expanded;el('sectionChevron').textContent=expanded?'▸':'▾';});
  el('explorerSearch').addEventListener('input',updateExplorerSearch);el('clearExplorerSearch').addEventListener('click',()=>{el('explorerSearch').value='';updateExplorerSearch();el('explorerSearch').focus();});
  document.querySelectorAll('.choice-card').forEach(b=>b.addEventListener('click',()=>applyBaseMap(b.dataset.basemap)));
  el('quickPlazas').addEventListener('click',()=>setPlazasVisibility(!map.hasLayer(plazaMarkerCluster)));
  el('quickHeat').addEventListener('click',()=>setHeatVisibility(!heatVisible));
  el('opacityPlazas').addEventListener('input',e=>setPlazaOpacity(e.target.value));
  el('btnHome').addEventListener('click',()=>{map.flyTo(INITIAL_VIEW.center,INITIAL_VIEW.zoom,{duration:.7});hideInfoPanel();});
  el('btnLocate').addEventListener('click',()=>{if(!navigator.geolocation){el('mapHint').textContent='La geolocalización no está disponible.';return;}navigator.geolocation.getCurrentPosition(p=>map.flyTo([p.coords.latitude,p.coords.longitude],16,{duration:.7}),()=>{el('mapHint').textContent='No se pudo obtener la ubicación del dispositivo.';el('mapHint').hidden=false;},{enableHighAccuracy:true,timeout:8000});});
  el('btnFullscreen').addEventListener('click',()=>{const target=el('geovisor');if(!document.fullscreenElement)target.requestFullscreen?.();else document.exitFullscreen?.();});
  el('btnMiniMap').addEventListener('click',()=>{el('miniMapOptions').hidden=!el('miniMapOptions').hidden;});
  el('btnGeoman').addEventListener('click',()=>{if(!geomanReady)initGeoman();setGeomanVisible(!geomanVisible);});
  el('travelerPlaces').addEventListener('click',()=>{openTab('explorer');el('explorerSearch').focus();});
  el('travelerLocate').addEventListener('click',()=>el('btnLocate').click());
  el('travelerSearch').addEventListener('click',()=>{el('searchInput').focus();el('searchInput').select();});
  el('travelerHome').addEventListener('click',()=>el('btnHome').click());
  document.querySelectorAll('.mini-choice').forEach(b=>b.addEventListener('click',()=>setMiniMapLayer(b.dataset.minimap)));
  el('toggleMiniMap').addEventListener('change',e=>setMiniMapVisible(e.target.checked));
  el('searchInput').addEventListener('input',e=>updateSearchSuggestions(e.target.value));
  el('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(searchTimer);runSearch(e.target.value);}if(e.key==='Escape'){el('searchResults').hidden=true;}});
  el('clearSearch').addEventListener('click',()=>{el('searchInput').value='';el('searchResults').hidden=true;if(temporarySearchMarker){map.removeLayer(temporarySearchMarker);temporarySearchMarker=null;}el('searchInput').focus();});
  document.addEventListener('click',e=>{if(!el('searchWrap').contains(e.target))el('searchResults').hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();el('controlPanel').classList.remove('closed');openTab('explorer');el('explorerSearch').focus();el('explorerSearch').select();}});
}

function boot(){
  safe('inicialización de Leaflet',initMap,()=>{el('mapHint').textContent='No se pudo inicializar el mapa.';});
  if(!map)return;
  safe('carga de plazas',buildPlazas);
  safe('mini mapa',initMiniMap);
  safe('Leaflet-Geoman',initGeoman);
  safe('interfaz',bindUI);
  setTimeout(()=>safe('tamaño inicial',()=>map.invalidateSize(false)),250);
  updateLegend();
}

document.addEventListener('DOMContentLoaded',boot);
