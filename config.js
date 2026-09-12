'use strict';

const INITIAL_VIEW = { center: [-32.895, -68.842], zoom: 12.3 };

const SEARCH_CATEGORIES = {
  hospital: { overpass: 'amenity=hospital', label: 'Hospitales' },
  farmacia: { overpass: 'amenity=pharmacy', label: 'Farmacias' },
  colegio: { overpass: 'amenity=school', label: 'Colegios' },
  escuela: { overpass: 'amenity=school', label: 'Escuelas' },
  banco: { overpass: 'amenity=bank', label: 'Bancos' },
  super: { overpass: 'shop=supermarket', label: 'Supermercados' },
  plaza: { overpass: 'leisure=park', label: 'Plazas' },
  combustible: { overpass: 'amenity=fuel', label: 'Estaciones de servicio' }
};

const plazas = [
  { id:'independencia', name:'Plaza Independencia', locality:'Ciudad de Mendoza', lat:-32.889674, lng:-68.844485, imageFile:'Mendoza - Plaza Independencia (14105238653).jpg', author:'Miguel', license:'CC BY-SA 2.0', source:'Wikimedia Commons' },
  { id:'san-martin', name:'Plaza San Martín', locality:'Ciudad de Mendoza', lat:-32.88765, lng:-68.84065, imageFile:'Plaza San Martín, Mendoza 4520.jpg', author:'Tokyo Tanenhaus', license:'CC BY 2.0', source:'Wikimedia Commons' },
  { id:'espana', name:'Plaza España', locality:'Ciudad de Mendoza', lat:-32.89296, lng:-68.84203, imageFile:'Plaza españa mendoza.jpg', author:'Beatrice Louise Murch', license:'CC BY-SA 2.0', source:'Wikimedia Commons' },
  { id:'italia', name:'Plaza Italia', locality:'Ciudad de Mendoza', lat:-32.891739, lng:-68.848566, imageFile:'Plaza Italia-Mendoza.jpg', author:'Alejandra2506', license:'CC BY-SA 4.0', source:'Wikimedia Commons' },
  { id:'chile', name:'Plaza Chile', locality:'Ciudad de Mendoza', lat:-32.88643, lng:-68.84698, imageFile:'Plaza Chile en Mendoza, Argentina.jpg', author:'Municipalidad de Mendoza', license:'CC BY-SA 4.0', source:'Wikimedia Commons' },
  { id:'pedro-del-castillo', name:'Plaza Pedro del Castillo', locality:'Área Fundacional, Ciudad de Mendoza', lat:-32.879761, lng:-68.828262, imageFile:'Mendoza - Plaza Pedro del Castillo.JPG', author:'Leandro Kibisz', license:'CC BY-SA 4.0', source:'Wikimedia Commons' }
];


