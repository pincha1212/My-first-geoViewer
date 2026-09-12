'use strict';

let map = null;
let baseLayers = {};
let activeBase = 'street';
let plazaMarkerCluster = null;
let markerById = new Map();
let heatLayer = null;
let heatVisible = false;
let temporarySearchMarker = null;
let searchTimer = null;
let themeMarkerCluster = null;
let themeSearchActive = false;
let userPoints = [];
let userPointsCluster = null;
let userPointMode = false;
let editingUserPointId = null;
let selectedMiniMap = 'street';
let miniMapVisible = true;
let miniMapInstance = null;
let miniMapViewport = null;
let miniMapControl = null;
let miniMapLayers = {};

