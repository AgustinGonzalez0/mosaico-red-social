import { ComentariosDia } from '../../core/services/estadisticas.service';

/** Un pico solo es "relevante" si llega al menos a esta fracción del máximo del período. */
export const UMBRAL_RELEVANCIA = 0.5;
/** Cantidad máxima de picos que se marcan en el gráfico. */
export const MAX_PICOS = 6;

export interface Pico {
  /** Posición del día dentro de la serie. */
  indice: number;
  /** Fecha `YYYY-MM-DD` del pico (si hay varios días seguidos con el mismo valor, el primero). */
  fecha: string;
  /** Último día de la meseta; coincide con `fecha` cuando el pico dura un solo día. */
  fechaFin: string;
  cantidad: number;
}

/**
 * Detecta los máximos locales relevantes de la serie, que debe venir ordenada por fecha (así la
 * entrega el backend). Un día es máximo local si supera a su día anterior y al siguiente; varios días
 * consecutivos con el mismo valor forman una meseta que cuenta como un único pico. Los días con cero
 * comentarios nunca son picos. Se conservan los {@link MAX_PICOS} más altos, que incluyen siempre
 * el máximo global, y se devuelven ordenados por fecha.
 */
export function detectarPicos(dias: ComentariosDia[], maxPicos = MAX_PICOS): Pico[] {
  const maximo = dias.reduce((mayor, dia) => Math.max(mayor, dia.cantidad), 0);
  if (maximo === 0) return [];

  const candidatos: Pico[] = [];
  let inicio = 0;
  while (inicio < dias.length) {
    let fin = inicio;
    while (fin + 1 < dias.length && dias[fin + 1].cantidad === dias[inicio].cantidad) fin++;
    const valor = dias[inicio].cantidad;
    const anterior = inicio > 0 ? dias[inicio - 1].cantidad : -1;
    const siguiente = fin < dias.length - 1 ? dias[fin + 1].cantidad : -1;
    if (valor > 0 && valor > anterior && valor > siguiente && valor >= maximo * UMBRAL_RELEVANCIA) {
      candidatos.push({
        indice: inicio,
        fecha: dias[inicio].fecha,
        fechaFin: dias[fin].fecha,
        cantidad: valor,
      });
    }
    inicio = fin + 1;
  }

  return candidatos
    .sort((a, b) => b.cantidad - a.cantidad || a.indice - b.indice)
    .slice(0, maxPicos)
    .sort((a, b) => a.indice - b.indice);
}

/**
 * Convierte `YYYY-MM-DD` en `DD/MM` (o `DD/MM/YYYY`) separando el texto. No se usa `new Date()` a
 * propósito: el backend ya entrega el día calendario en UTC y crear una fecha lo desplazaría un día
 * hacia atrás en husos horarios como el de Argentina.
 */
export function formatearFecha(fecha: string, conAnio = false): string {
  const [anio, mes, dia] = fecha.split('-');
  return conAnio ? `${dia}/${mes}/${anio}` : `${dia}/${mes}`;
}

export function textoComentarios(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'comentario' : 'comentarios'}`;
}

export interface PicoGrafico extends Pico {
  x: number;
  y: number;
  /** `03/11 · 18 comentarios` */
  etiqueta: string;
  etiquetaX: number;
  etiquetaY: number;
  anclaje: 'start' | 'middle' | 'end';
  /** Falso cuando la etiqueta taparía a otra; el dato sigue en el listado y en el tooltip. */
  etiquetaVisible: boolean;
  esMaximo: boolean;
}

export interface Grafico {
  ancho: number;
  alto: number;
  izquierda: number;
  derecha: number;
  base: number;
  /** No hay ningún comentario en el período. */
  vacio: boolean;
  linea: string;
  area: string;
  marcasY: { valor: number; y: number }[];
  marcasX: { texto: string; x: number }[];
  picos: PicoGrafico[];
}

const ALTO = 300;
const MARGEN = { izquierda: 40, derecha: 20, arriba: 44, abajo: 36 };
const ANCHO_CARACTER = 7; // aproximación para una tipografía de 12 px en negrita
const ALTO_ETIQUETA = 16;
const SEPARACION_X = 64; // ancho reservado para cada fecha del eje horizontal

/** Calcula todas las coordenadas del SVG para un ancho dado, de modo que el texto nunca se deforme. */
export function construirGrafico(dias: ComentariosDia[], anchoDisponible: number): Grafico {
  const ancho = Math.max(anchoDisponible, 260);
  const base = ALTO - MARGEN.abajo;
  const izquierda = MARGEN.izquierda;
  const derecha = ancho - MARGEN.derecha;
  const util = { ancho: derecha - izquierda, alto: base - MARGEN.arriba };

  const maximo = dias.reduce((mayor, dia) => Math.max(mayor, dia.cantidad), 0);
  // Eje vertical con números enteros: hasta 4 intervalos de igual tamaño que cubren el máximo.
  const intervalos = Math.max(1, Math.min(maximo, 4));
  const paso = Math.max(1, Math.ceil(maximo / intervalos));
  const topeEje = paso * intervalos;

  const xDe = (i: number) =>
    dias.length > 1 ? izquierda + (i * util.ancho) / (dias.length - 1) : izquierda + util.ancho / 2;
  const yDe = (cantidad: number) => base - (cantidad / topeEje) * util.alto;

  const marcasY = Array.from({ length: intervalos + 1 }, (_, k) => ({
    valor: k * paso,
    y: yDe(k * paso),
  }));

  const cadaCuantos = Math.max(1, Math.ceil(dias.length / Math.max(1, Math.floor(util.ancho / SEPARACION_X))));
  const marcasX = dias
    .map((dia, i) => ({ texto: formatearFecha(dia.fecha), x: xDe(i), i }))
    .filter(({ i }) => i % cadaCuantos === 0)
    .map(({ texto, x }) => ({ texto, x }));

  const puntos = dias.map((dia, i) => `${xDe(i)},${yDe(dia.cantidad)}`);
  const linea = dias.length > 1 ? puntos.join(' ') : '';
  const area =
    dias.length > 1
      ? `M${xDe(0)},${base} L${puntos.join(' L')} L${xDe(dias.length - 1)},${base} Z`
      : '';

  return {
    ancho,
    alto: ALTO,
    izquierda,
    derecha,
    base,
    vacio: maximo === 0,
    linea,
    area,
    marcasY,
    marcasX,
    picos: ubicarEtiquetas(detectarPicos(dias), xDe, yDe, ancho),
  };
}

/**
 * Coloca la etiqueta de cada pico encima de su marcador. Se atienden primero los picos más altos
 * (el máximo global siempre queda rotulado) y se omite la etiqueta que pisaría a otra ya colocada.
 */
function ubicarEtiquetas(
  picos: Pico[],
  xDe: (i: number) => number,
  yDe: (cantidad: number) => number,
  ancho: number,
): PicoGrafico[] {
  const ocupados: { x1: number; x2: number; y1: number; y2: number }[] = [];
  const porPrioridad = [...picos].sort((a, b) => b.cantidad - a.cantidad || a.indice - b.indice);
  const resultado = new Map<number, PicoGrafico>();

  for (const pico of porPrioridad) {
    const x = xDe(pico.indice);
    const y = yDe(pico.cantidad);
    const etiqueta = `${formatearFecha(pico.fecha)} · ${textoComentarios(pico.cantidad)}`;
    const mitad = (etiqueta.length * ANCHO_CARACTER) / 2;
    // La etiqueta se corre hacia adentro si se saldría del gráfico.
    const anclaje = x - mitad < 4 ? 'start' : x + mitad > ancho - 4 ? 'end' : 'middle';
    const x1 = anclaje === 'start' ? x - 8 : anclaje === 'end' ? x + 8 - 2 * mitad : x - mitad;
    const etiquetaY = y - 14;
    const caja = { x1, x2: x1 + 2 * mitad, y1: etiquetaY - ALTO_ETIQUETA + 3, y2: etiquetaY + 3 };
    const choca = ocupados.some(
      (o) => caja.x1 < o.x2 && caja.x2 > o.x1 && caja.y1 < o.y2 && caja.y2 > o.y1,
    );
    if (!choca) ocupados.push(caja);
    resultado.set(pico.indice, {
      ...pico,
      x,
      y,
      etiqueta,
      etiquetaX: anclaje === 'start' ? x - 8 : anclaje === 'end' ? x + 8 : x,
      etiquetaY,
      anclaje,
      etiquetaVisible: !choca,
      esMaximo: pico === porPrioridad[0], // el primero por prioridad es el máximo global
    });
  }
  return picos.map((p) => resultado.get(p.indice)!);
}
