'use strict';

function plazaIcon() {
  if (L.BeautifyIcon?.icon) return L.BeautifyIcon.icon({ iconShape:'marker', text:'P', borderWidth:2, borderColor:'#fff', textColor:'#fff', backgroundColor:'#1769e0', isAlphaNumericIcon:true });
  return L.divIcon({ className:'fallback-marker', html:'<span style="display:grid;place-items:center;width:30px;height:38px;border-radius:16px 16px 16px 3px;transform:rotate(-45deg);background:#1769e0;color:#fff;border:2px solid #fff;font:bold 11px sans-serif">P</span>', iconSize:[30,38], iconAnchor:[15,37], popupAnchor:[0,-34] });
}

function popupHtml(plaza) {
  return `<article class="popup-card"><img src="${imageUrl(plaza.imageFile)}" alt="${escapeHtml(plaza.name)}" loading="lazy"><div class="popup-body"><h3 class="popup-title">${escapeHtml(plaza.name)}</h3><p class="popup-location">${escapeHtml(plaza.locality)}</p><p class="popup-coordinates">${plaza.lat.toFixed(6)}, ${plaza.lng.toFixed(6)}</p><p class="popup-attribution">Foto: ${escapeHtml(plaza.author)} · ${escapeHtml(plaza.license)} · ${escapeHtml(plaza.source)}</p></div></article>`;
}

function buildPlazas() {
  plazaMarkerCluster=L.markerClusterGroup({ showCoverageOnHover:false, maxClusterRadius:45, spiderfyOnMaxZoom:true });
  const icon=plazaIcon();
  plazas.forEach(plaza=>{
    const marker=L.marker([plaza.lat,plaza.lng],{icon,opacity:1});
    marker.bindPopup(popupHtml(plaza),{maxWidth:300,autoPan:true,autoPanPaddingTopLeft:[20,90],autoPanPaddingTopRight:[380,90]});
    marker.on('click',()=>activateListItem(plaza.id));
    plazaMarkerCluster.addLayer(marker); markerById.set(plaza.id,marker);
  });
  plazaMarkerCluster.addTo(map);
  bindExplorerList();
  setTimeout(() => safe('registrar capas en Leaflet', () => {
    if (typeof initLayerControl === 'function') initLayerControl();
  }), 0);
  setPlazasVisibility(true);
}
