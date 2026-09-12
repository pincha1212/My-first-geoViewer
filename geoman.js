'use strict';

function geomanStopActiveModes() {
  if (!map || !map.pm) return;
  if (map.pm.globalDrawModeEnabled?.()) map.pm.disableDraw();
  if (map.pm.globalEditModeEnabled?.()) map.pm.disableGlobalEditMode();
  if (map.pm.globalRemovalModeEnabled?.()) map.pm.disableGlobalRemovalMode();
  if (map.pm.globalDragModeEnabled?.()) map.pm.disableGlobalDragMode();
  if (map.pm.globalRotateModeEnabled?.()) map.pm.disableGlobalRotateMode();
}

function setGeomanMenuVisible(visible) {
  const menu = el('geomanMenu');
  const button = el('btnGeoman');
  if (menu) menu.hidden = !visible;
  if (button) {
    button.classList.toggle('active', visible);
    button.innerHTML = visible
      ? '<span>✎</span>Ocultar herramientas'
      : '<span>✎</span>Herramientas de dibujo';
    button.setAttribute('aria-expanded', String(visible));
  }
}

function geomanEnableDraw(shape) {
  if (!map || !map.pm) return;
  geomanStopActiveModes();
  map.pm.enableDraw(shape, {
    continueDrawing: false,
    snappable: true,
    snapDistance: 20,
    finishOn: shape === 'Line' || shape === 'Polygon' ? 'dblclick' : undefined
  });
}

function geomanEnableMode(mode) {
  if (!map || !map.pm) return;
  geomanStopActiveModes();
  if (mode === 'edit') map.pm.enableGlobalEditMode();
  if (mode === 'drag') map.pm.enableGlobalDragMode();
  if (mode === 'remove') map.pm.enableGlobalRemovalMode();
  if (mode === 'rotate') map.pm.enableGlobalRotateMode();
}

function initGeomanMenu() {
  const host = document.querySelector('.geoman-basic');
  const button = el('btnGeoman');
  if (!host || !button || el('geomanMenu')) return;

  const menu = document.createElement('div');
  menu.id = 'geomanMenu';
  menu.className = 'geoman-menu';
  menu.hidden = true;
  menu.innerHTML = `
    <div class="geoman-menu-title">DIBUJAR</div>
    <div class="geoman-menu-grid">
      <button type="button" class="geoman-tool" data-geoman-draw="Marker">Punto</button>
      <button type="button" class="geoman-tool" data-geoman-draw="Line">Línea</button>
      <button type="button" class="geoman-tool" data-geoman-draw="Polygon">Polígono</button>
      <button type="button" class="geoman-tool" data-geoman-draw="Rectangle">Rectángulo</button>
      <button type="button" class="geoman-tool" data-geoman-draw="Circle">Círculo</button>
      <button type="button" class="geoman-tool" data-geoman-draw="CircleMarker">Círculo marcador</button>
    </div>
    <div class="geoman-menu-title geoman-menu-title-space">EDITAR</div>
    <div class="geoman-menu-grid">
      <button type="button" class="geoman-tool" data-geoman-mode="edit">Editar</button>
      <button type="button" class="geoman-tool" data-geoman-mode="drag">Mover</button>
      <button type="button" class="geoman-tool" data-geoman-mode="rotate">Rotar</button>
      <button type="button" class="geoman-tool" data-geoman-mode="remove">Eliminar</button>
    </div>
  `;
  host.appendChild(menu);

  menu.querySelectorAll('[data-geoman-draw]').forEach(tool => {
    tool.addEventListener('click', () => geomanEnableDraw(tool.dataset.geomanDraw));
  });
  menu.querySelectorAll('[data-geoman-mode]').forEach(tool => {
    tool.addEventListener('click', () => geomanEnableMode(tool.dataset.geomanMode));
  });
}

function initGeomanBasic() {
  if (!map) return;
  if (!map.pm) {
    console.warn('[Geovisor] Leaflet-Geoman no se cargó. Verificá la versión del CDN en index.html.');
    const hint = el('mapHint');
    if (hint) {
      hint.textContent = 'El módulo de dibujo no está disponible.';
      hint.hidden = false;
    }
    return;
  }

  map.pm.addControls({
    position: 'topleft',
    drawMarker: false,
    drawPolyline: false,
    drawPolygon: false,
    drawRectangle: false,
    drawCircle: false,
    drawCircleMarker: false,
    drawText: false,
    editMode: false,
    dragMode: false,
    cutPolygon: false,
    removalMode: false,
    rotateMode: false
  });

  setGeomanMenuVisible(false);
  initGeomanMenu();

  const btn = el('btnGeoman');
  if (btn && !btn.dataset.geomanBound) {
    btn.dataset.geomanBound = 'true';
    btn.addEventListener('click', () => {
      const menu = el('geomanMenu');
      setGeomanMenuVisible(Boolean(menu?.hidden));
    });
  }

  map.on('pm:drawstart', event => {
    const shape = event.shape || '';
    const modeNames = {
      Marker: 'punto',
      Line: 'línea',
      Polyline: 'línea',
      Polygon: 'polígono',
      Rectangle: 'rectángulo',
      Circle: 'círculo',
      CircleMarker: 'círculo marcador'
    };
    const hint = el('mapHint');
    if (hint) {
      hint.hidden = false;
      hint.textContent = `Dibujando ${modeNames[shape] || 'geometría'}…`;
    }
  });

  map.on('pm:create', event => {
    if (!event.layer) return;
    const hint = el('mapHint');
    if (hint) {
      hint.hidden = false;
      hint.textContent = 'Geometría creada. Podés editarla, moverla, rotarla o eliminarla.';
      setTimeout(() => {
        if (hint.textContent.startsWith('Geometría creada.')) hint.hidden = true;
      }, 3200);
    }
  });

  map.on('pm:globaleditmodetoggled pm:globalremovalmodetoggled pm:globaldragmodetoggled pm:globalrotatemodetoggled', event => {
    const hint = el('mapHint');
    if (!hint) return;
    hint.hidden = false;
    if (event.enabled) {
      const names = {
        'pm:globaleditmodetoggled': 'Edición',
        'pm:globalremovalmodetoggled': 'Eliminación',
        'pm:globaldragmodetoggled': 'Movimiento',
        'pm:globalrotatemodetoggled': 'Rotación'
      };
      hint.textContent = `${names[event.type] || 'Herramienta'} activada.`;
    }
  });
}
