'use strict';

function normalizeSearchTerm(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}

function isThematicQuery(term){
  const clean=normalizeSearchTerm(term);
  return SEARCH_CATEGORIES[clean] || null;
}

function renderLocalSearch(term){return plazas.filter(p=>`${p.name} ${p.locality}`.toLowerCase().includes(term)).slice(0,5);}

async function photonSearch(term){try{const url=`https://photon.komoot.io/api/?q=${encodeURIComponent(term)}&limit=5&lat=${INITIAL_VIEW.center[0]}&lon=${INITIAL_VIEW.center[1]}`;const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Photon ${response.status}`);const data=await response.json();return (data.features||[]).map(f=>{const [lng,lat]=f.geometry.coordinates;const p=f.properties||{};return{name:p.name||p.street||'Lugar',center:{lat,lng},properties:p};});}catch(error){console.warn('[Geovisor] Photon no disponible',error);return[];}}

async function nominatimSearch(term){try{const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=es&countrycodes=ar&q=${encodeURIComponent(term)}`;const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Nominatim ${response.status}`);const data=await response.json();return data.map(r=>({name:r.display_name?.split(',')[0]||r.name||'Lugar',center:{lat:Number(r.lat),lng:Number(r.lon)},properties:{display_name:r.display_name,type:r.type}}));}catch(error){console.warn('[Geovisor] Nominatim no disponible',error);return[];}}

function mergeRemoteResults(photon,nominatim){const seen=new Set();const out=[];for(const item of [...photon,...nominatim]){if(!item?.center||!Number.isFinite(item.center.lat)||!Number.isFinite(item.center.lng))continue;const key=`${item.center.lat.toFixed(5)},${item.center.lng.toFixed(5)},${String(item.name).toLowerCase()}`;if(seen.has(key))continue;seen.add(key);out.push(item);}return out.slice(0,8);}

function renderSearchBox(local,remote=[]){const box=el('searchResults');if(!box)return;const html=[...local.map(p=>`<button class="search-result" type="button" data-local-id="${escapeHtml(p.id)}"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.locality)} · Geovisor</span></button>`),...remote.map((r,i)=>`<button class="search-result" type="button" data-remote-index="${i}"><strong>${escapeHtml(r.name)}</strong><span>${escapeHtml(r.properties?.city||r.properties?.state||'Ubicación')} · Photon</span></button>`)].join('');box.innerHTML=html||'<div class="search-loading">Sin resultados</div>';box.hidden=false;box.querySelectorAll('[data-local-id]').forEach(b=>b.addEventListener('click',()=>{focusPlaza(b.dataset.localId);box.hidden=true;}));box.querySelectorAll('[data-remote-index]').forEach(b=>b.addEventListener('click',()=>{const r=remote[Number(b.dataset.remoteIndex)];if(!r?.center)return;showTemporarySearchResult(r);map.flyTo(r.center,16,{duration:.8});box.hidden=true;}));}

function showTemporarySearchResult(result){if(temporarySearchMarker)map.removeLayer(temporarySearchMarker);const icon=L.divIcon({className:'search-marker',html:'<span style="display:block;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#17212b;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)"></span>',iconSize:[28,28],iconAnchor:[14,28]});temporarySearchMarker=L.marker(result.center,{icon,zIndexOffset:2000}).addTo(map);temporarySearchMarker.bindPopup(`<strong>${escapeHtml(result.name)}</strong>`).openPopup();}

function clearThemeSearchResults(){
  if(themeMarkerCluster && map){
    map.removeLayer(themeMarkerCluster);
  }
  themeMarkerCluster=null;
  themeSearchActive=false;
  const button=el('btnClearThemeResults');
  if(button)button.hidden=true;
}

function thematicIcon(){
  return L.divIcon({
    className:'theme-marker',
    html:'<span></span>',
    iconSize:[16,16],
    iconAnchor:[8,8],
    popupAnchor:[0,-8]
  });
}

function renderThemeResults(data,category){
  clearThemeSearchResults();
  themeMarkerCluster=L.markerClusterGroup({showCoverageOnHover:false,removeOutsideVisibleBounds:true});
  const elements=Array.isArray(data?.elements)?data.elements:[];
  elements.forEach(element=>{
    const lat=Number(element.lat ?? element.center?.lat);
    const lng=Number(element.lon ?? element.center?.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
    const tags=element.tags||{};
    const name=tags.name||'Sin nombre';
    const popup=`<strong>${escapeHtml(name)}</strong><br><span>${escapeHtml(category.label)}</span><br><span class="theme-coordinates">Lat: ${lat.toFixed(5)} · Lon: ${lng.toFixed(5)}</span>`;
    L.marker([lat,lng],{icon:thematicIcon()}).bindPopup(popup).addTo(themeMarkerCluster);
  });
  if(themeMarkerCluster.getLayers().length){
    themeMarkerCluster.addTo(map);
    themeSearchActive=true;
    const button=el('btnClearThemeResults');
    if(button)button.hidden=false;
  }
  return themeMarkerCluster.getLayers().length;
}

async function searchOverpass(term,category){
  if(!map||!category)return;
  clearThemeSearchResults();
  const bounds=map.getBounds();
  const south=bounds.getSouth();
  const west=bounds.getWest();
  const north=bounds.getNorth();
  const east=bounds.getEast();
  const [key,value]=category.overpass.split('=');
  const message=el('searchResults');
  if(message){message.hidden=false;message.innerHTML=`<div class="search-loading">Buscando ${escapeHtml(category.label.toLowerCase())} en la zona visible…</div>`;}
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),22000);
    const query=`[out:json][timeout:20];(${['node','way','relation'].map(type=>`${type}["${key}"="${value}"](${south},${west},${north},${east});`).join('')});out center;`;
    const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','Accept':'application/json'},body:new URLSearchParams({data:query}),signal:controller.signal});
    clearTimeout(timeout);
    if(!response.ok)throw new Error(`Overpass ${response.status}`);
    const data=await response.json();
    if(el('searchInput')?.value.trim()!==term.trim())return;
    const count=renderThemeResults(data,category);
    if(message){message.hidden=false;message.innerHTML=count?`<div class="search-theme-summary"><strong>${count}</strong> ${escapeHtml(category.label.toLowerCase())} encontrados en la vista</div>`:'<div class="search-loading">No se encontraron resultados</div>';}
    if(!count){clearThemeSearchResults();if(message){message.hidden=false;message.innerHTML=`<div class="search-loading">No se encontraron ${escapeHtml(category.label.toLowerCase())} en esta vista.<br>Alejar el mapa y probar de nuevo.</div>`;}}
  }catch(error){
    console.warn('[Geovisor] Overpass no disponible',error);
    clearThemeSearchResults();
    if(message){message.hidden=false;message.innerHTML='<div class="search-loading">El servicio de búsqueda temática no está disponible. Probá en unos segundos.</div>';}
  }
}

function runSearch(term){
  const query=term.trim();
  if(!query){el('searchResults').hidden=true;return;}
  const category=isThematicQuery(query);
  if(category){
    safeAsync('búsqueda temática',()=>searchOverpass(query,category));
    return;
  }
  themeSearchActive=false;
  const local=renderLocalSearch(query.toLowerCase());
  safeAsync('búsqueda normal',async()=>{
    const [photon,nominatim]=await Promise.all([photonSearch(`${query}, Mendoza, Argentina`),nominatimSearch(`${query}, Mendoza, Argentina`)]);
    if(el('searchInput')?.value.trim()!==query)return;
    renderSearchBox(local,mergeRemoteResults(photon,nominatim));
  });
}

function updateSearchSuggestions(term){
  const clean=normalizeSearchTerm(term);
  if(!clean){el('searchResults').hidden=true;return;}
  const category=isThematicQuery(clean);
  if(category){
    const box=el('searchResults');
    if(box){box.innerHTML=`<button class="search-result thematic-search-suggestion" type="button"><strong>${escapeHtml(category.label)}</strong><span>Buscar todos en la vista actual</span></button>`;box.hidden=false;box.querySelector('.thematic-search-suggestion')?.addEventListener('click',()=>runSearch(term));}
    return;
  }
  renderSearchBox(renderLocalSearch(clean),[]);
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>safeAsync('sugerencias Photon',async()=>{const [photon,nominatim]=await Promise.all([photonSearch(`${clean}, Mendoza, Argentina`),nominatimSearch(`${clean}, Mendoza, Argentina`)]);if(el('searchInput')?.value.trim().toLowerCase()===clean)renderSearchBox(renderLocalSearch(clean),mergeRemoteResults(photon,nominatim));}),350);
}
