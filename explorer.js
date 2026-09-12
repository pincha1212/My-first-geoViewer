'use strict';

function activateListItem(id) { document.querySelectorAll('.entity-main').forEach(b=>b.classList.toggle('active',b.dataset.id===id)); }

function bindExplorerList() {
  const list=el('plazaList'); if(!list) return;
  list.innerHTML=plazas.map(p=>`<div class="entity-item" data-id="${escapeHtml(p.id)}" data-search-text="${escapeHtml(`${p.name} ${p.locality}`.toLowerCase())}"><button class="entity-main" type="button" data-id="${escapeHtml(p.id)}" aria-label="Ir a ${escapeHtml(p.name)}"><img class="plaza-mini" src="${imageUrl(p.imageFile)}" alt="" loading="lazy"><span><span class="plaza-name">${escapeHtml(p.name)}</span><span class="plaza-location">${escapeHtml(p.locality)}</span></span></button><button class="entity-quick" type="button" data-id="${escapeHtml(p.id)}" aria-label="Ir rápidamente a ${escapeHtml(p.name)}">⊕</button></div>`).join('');
  list.querySelectorAll('.entity-main,.entity-quick').forEach(btn=>btn.addEventListener('click',()=>focusPlaza(btn.dataset.id)));
  updateExplorerSearch();
}

function focusPlaza(id) {
  const plaza=plazas.find(p=>p.id===id), marker=markerById.get(id); if(!plaza||!marker) return;
  setPlazasVisibility(true); activateListItem(id); closeFloatingPanels();
  map.flyTo([plaza.lat,plaza.lng],16,{duration:.8});
  setTimeout(()=>safe('abrir popup',()=>marker.openPopup()),820);
}

function updateExplorerSearch() {
  const list=el('plazaList'); if(!list)return;
  const count=list.querySelectorAll('.entity-item').length;
  if(el('plazaCount'))el('plazaCount').textContent=count;
  if(el('sectionCount'))el('sectionCount').textContent=count;
}
