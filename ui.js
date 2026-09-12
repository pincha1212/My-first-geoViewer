'use strict';

function bindUI(){
  el('btnClosePanel').addEventListener('click',()=>{el('controlPanel').classList.add('closed');setTimeout(()=>syncMiniMap(),80);});
  el('btnOpenPanel').addEventListener('click',()=>{el('controlPanel').classList.remove('closed');setTimeout(()=>syncMiniMap(),80);});
  document.querySelectorAll('.panel-tab').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab)));
  el('plazaSectionToggle').addEventListener('click',()=>{const btn=el('plazaSectionToggle'),expanded=btn.getAttribute('aria-expanded')==='true';btn.setAttribute('aria-expanded',String(!expanded));el('plazaSectionContent').hidden=expanded;el('sectionChevron').textContent=expanded?'▸':'▾';});
  document.querySelectorAll('.choice-card').forEach(b=>b.addEventListener('click',()=>{ if(!b.classList.contains('disabled')) applyBaseMap(b.dataset.basemap); }));
  el('quickPlazas').addEventListener('click',()=>setPlazasVisibility(!map.hasLayer(plazaMarkerCluster)));
  el('quickHeat').addEventListener('click',()=>setHeatVisibility(!heatVisible));
  el('showAllLayers').addEventListener('click',showAllLayers);
  el('hideAllLayers').addEventListener('click',hideAllLayers);
  el('opacityPlazas').addEventListener('input',e=>setPlazaOpacity(e.target.value));
  el('btnHome').addEventListener('click',()=>{clearThemeSearchResults();map.flyTo(INITIAL_VIEW.center,INITIAL_VIEW.zoom,{duration:.7});});
  el('btnLocate').addEventListener('click',()=>{if(!navigator.geolocation){el('mapHint').textContent='La geolocalización no está disponible.';return;}navigator.geolocation.getCurrentPosition(p=>map.flyTo([p.coords.latitude,p.coords.longitude],16,{duration:.7}),()=>{el('mapHint').textContent='No se pudo obtener la ubicación del dispositivo.';el('mapHint').hidden=false;},{enableHighAccuracy:true,timeout:8000});});
  el('btnFullscreen').addEventListener('click',()=>{const target=el('geovisor');if(!document.fullscreenElement)target.requestFullscreen?.();else document.exitFullscreen?.();});
  el('btnMiniMap').addEventListener('click',()=>{el('miniMapOptions').hidden=!el('miniMapOptions').hidden;});
  document.querySelectorAll('.mini-choice').forEach(b=>b.addEventListener('click',()=>setMiniMapLayer(b.dataset.minimap)));
  el('toggleMiniMap').addEventListener('change',e=>setMiniMapVisible(e.target.checked));
  el('btnCreatePoint').addEventListener('click',()=>{const options=el('userPointsOptions');if(options)options.hidden=!options.hidden;});
  el('btnPointMarkMap').addEventListener('click',()=>{el('userPointSourcePanel').hidden=true;startCreatePoint();});
  el('btnPointFromSource').addEventListener('click',()=>{el('userPointSourcePanel').hidden=!el('userPointSourcePanel').hidden;});
  el('userPointFile').addEventListener('change',e=>{safeAsync('carga de puntos desde archivo',()=>importPointsFromFile(e.target.files?.[0]));});
  el('userPointUrl').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();safeAsync('carga de puntos desde URL',()=>importPointsFromUrl(e.target.value));}});
  el('btnPointUrlLoad').addEventListener('click',()=>safeAsync('carga de puntos desde URL',()=>importPointsFromUrl(el('userPointUrl').value)));
  el('btnCancelPointMode').addEventListener('click',cancelCreatePoint);
  el('searchInput').addEventListener('input',e=>{if(!e.target.value.trim())el('searchResults').hidden=true;updateSearchSuggestions(e.target.value);});
  el('btnClearThemeResults').addEventListener('click',clearThemeSearchResults);
  el('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(searchTimer);runSearch(e.target.value);}if(e.key==='Escape'){e.target.value='';el('searchResults').hidden=true;}});
  document.addEventListener('click',e=>{if(!el('searchWrap').contains(e.target))el('searchResults').hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();el('searchInput').focus();el('searchInput').select();}});
}
