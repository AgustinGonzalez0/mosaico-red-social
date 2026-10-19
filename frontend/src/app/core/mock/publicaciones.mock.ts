import { Publicacion } from '../models/publicacion.model';

// Datos de demostración para el Sprint 1. En el Sprint 2 se reemplazan por el listado real del backend.
const foto = (seed: string, ancho: number, alto: number) => `https://picsum.photos/seed/${seed}/${ancho}/${alto}`;

const base: Array<[string, string, string, number, number, string, number]> = [
  ['Atardecer en la costa', 'La luz dorada sobre el mar a las 19 hs. Valió la pena madrugar para llegar.', 'costa', 400, 560, 'lucia.m', 128],
  ['Mi rincón de lectura', 'Un sillón, una manta y mucha luz natural.', 'lectura', 400, 300, 'tomas_r', 54],
  ['Pasta casera de domingo', 'Receta de la nona: harina, huevos y paciencia.', 'pasta', 400, 420, 'cocina.sol', 301],
  ['Senderos de montaña', 'Ruta de 12 km con vistas increíbles.', 'monte', 400, 620, 'andes.fer', 87],
  ['Escritorio minimalista', 'Menos cosas, más foco.', 'escritorio', 400, 340, 'dev.nico', 212],
  ['Café de especialidad', 'Probando métodos de extracción nuevos.', 'cafe', 400, 480, 'barista.ana', 76],
  ['Arquitectura urbana', 'Líneas y sombras en el centro de la ciudad.', 'edificio', 400, 580, 'arq.vale', 143],
  ['Jardín en el balcón', 'Aromáticas, suculentas y un limonero.', 'jardin', 400, 360, 'plantas.jo', 65],
  ['Gato en la ventana', 'Domingo de siesta y sol.', 'gato', 400, 440, 'mica_cat', 389],
  ['Bicicleta vintage', 'Restauré esta belleza durante el invierno.', 'bici', 400, 520, 'rueda.libre', 98],
  ['Paleta de colores otoño', 'Ocres, terracotas y verdes apagados.', 'otono', 400, 320, 'color.lab', 177],
  ['Tarde de acuarelas', 'Practicando paisajes húmedo sobre húmedo.', 'acuarela', 400, 600, 'pinceles.e', 59],
  ['Viaje en tren', 'Cuatro horas de ventanilla y playlist nueva.', 'tren', 400, 380, 'viajera.k', 132],
  ['Noche de ciudad', 'Luces, lluvia y reflejos en el asfalto.', 'noche', 400, 500, 'foto.mati', 244],
];

export const PUBLICACIONES_DEMO: Publicacion[] = base.map(([titulo, mensaje, seed, ancho, alto, autor, meGusta], i) => ({
  id: `demo-${i + 1}`,
  titulo,
  mensaje,
  imagen: foto(seed, ancho, alto),
  ancho,
  alto,
  autor: { nombreUsuario: autor, imagenPerfil: null },
  meGusta,
}));
