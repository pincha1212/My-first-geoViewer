# Geovisor de Plazas – Gran Mendoza

Geovisor web estático preparado para **GitHub Pages**. No requiere servidor, Node.js ni base de datos.

## Publicar en GitHub Pages

1. Crear un repositorio en GitHub.
2. Subir todos los archivos de esta carpeta a la raíz del repositorio:
   - `index.html`
   - `app.js`
   - `style.css`
   - `FUENTES_IMAGENES.txt`
   - `FUENTES_PLUGINS.txt`
   - `README.md`
3. En el repositorio entrar a **Settings → Pages**.
4. En **Build and deployment**, seleccionar **Deploy from a branch**.
5. Elegir la rama `main` y la carpeta `/ (root)`.
6. Guardar y esperar la publicación.

GitHub Pages servirá automáticamente `index.html` como página principal.

## Dependencias externas

El geovisor utiliza librerías cargadas por HTTPS desde CDN y servicios cartográficos externos. Por eso funciona directamente como sitio estático en GitHub Pages.

- Leaflet
- Leaflet.markercluster
- BeautifyMarker
- Leaflet.heat
- OpenStreetMap
- Esri World Imagery
- OpenTopoMap
- Photon
- Nominatim / OpenStreetMap
- Wikimedia Commons

## Importante

La herramienta **Mi ubicación** requiere HTTPS y permiso de ubicación del navegador. GitHub Pages proporciona HTTPS.

El buscador consulta Photon y Nominatim desde el navegador. Si alguno de esos servicios limita temporalmente las consultas, el resto del geovisor continúa funcionando.
