'use strict';

function boot(){
  safe('inicialización de Leaflet',initMap,()=>{el('mapHint').textContent='No se pudo inicializar el mapa.';});
  if(!map)return;
  safe('herramientas de dibujo Geoman',initGeomanBasic);
  safe('plugins de shramov',initShramovLeafletPlugins);
  safe('carga de plazas',buildPlazas);
  safe('mini mapa',initMiniMap);
  safe('interfaz',bindUI);
  setTimeout(()=>safe('tamaño inicial',()=>map.invalidateSize(false)),250);
  updateLegend();
}

document.addEventListener('DOMContentLoaded',boot);
