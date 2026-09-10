# Geovisor | Área Metropolitana de Mendoza

Geovisor web basado en Leaflet para explorar información geográfica del Área Metropolitana de Mendoza.

## Funcionalidades

- Mapa base OpenStreetMap.
- Mapa base Satélite Esri.
- Mapa base OpenTopoMap.
- Buscador geográfico con Photon + Nominatim mediante Leaflet.Control.Geocoder.
- Autocompletado con debounce.
- Marcador temporal para resultados de búsqueda.
- Explorador de plazas destacadas con búsqueda interna y secciones colapsables.
- Leyenda dinámica.
- Escala gráfica.
- Mini mapa independiente de Leaflet, con opciones Mapa, Satélite y Topográfico.
- Mapa de calor de densidad con Leaflet.heat.
- Agrupación de marcadores con Leaflet.markercluster.

## Capas temáticas

### Plazas destacadas

Seis plazas de referencia del Área Metropolitana de Mendoza, con fotografía, localidad y coordenadas.

### Densidad

Representa la concentración espacial de las plazas mediante una capa de calor.

## Mini mapa

El mini mapa utiliza una segunda instancia de Leaflet. Puede alternarse entre callejero, satélite y OpenTopoMap.
