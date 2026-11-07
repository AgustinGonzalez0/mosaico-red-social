import { ComentariosDia } from '../../core/services/estadisticas.service';
import {
  MAX_PICOS,
  construirGrafico,
  detectarPicos,
  formatearFecha,
  textoComentarios,
} from './grafico-comentarios';

/** Arma una serie diaria consecutiva a partir del 2026-11-01. */
function serie(...cantidades: number[]): ComentariosDia[] {
  return cantidades.map((cantidad, i) => ({
    fecha: new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10),
    cantidad,
  }));
}

describe('detectarPicos', () => {
  it('encuentra los dos picos del ejemplo (03/11 con 18 y 06/11 con 14)', () => {
    const picos = detectarPicos(serie(2, 5, 18, 7, 3, 14, 4));
    expect(picos.map((p) => [p.fecha, p.cantidad])).toEqual([
      ['2026-11-03', 18],
      ['2026-11-06', 14],
    ]);
  });

  it('sin datos, o con todos los días en cero, no hay picos', () => {
    expect(detectarPicos([])).toEqual([]);
    expect(detectarPicos(serie(0, 0, 0, 0))).toEqual([]);
  });

  it('un único día con comentarios es un pico, también en los extremos de la serie', () => {
    expect(detectarPicos(serie(0, 0, 4, 0, 0)).map((p) => p.indice)).toEqual([2]);
    expect(detectarPicos(serie(4))).toHaveLength(1);
    expect(detectarPicos(serie(9, 2, 1)).map((p) => p.indice)).toEqual([0]);
    expect(detectarPicos(serie(1, 2, 9)).map((p) => p.indice)).toEqual([2]);
  });

  it('nunca marca como pico un día sin comentarios', () => {
    const picos = detectarPicos(serie(0, 3, 0, 0, 5, 0));
    expect(picos.every((p) => p.cantidad > 0)).toBe(true);
  });

  it('varios días consecutivos con el mismo máximo forman un solo pico', () => {
    const picos = detectarPicos(serie(1, 7, 7, 7, 2));
    expect(picos).toHaveLength(1);
    expect(picos[0]).toMatchObject({ fecha: '2026-11-02', fechaFin: '2026-11-04', cantidad: 7 });
  });

  it('descarta máximos locales poco relevantes frente al máximo del período', () => {
    // 5 es un máximo local pero es menos de la mitad de 18.
    expect(detectarPicos(serie(2, 5, 3, 18, 3)).map((p) => p.cantidad)).toEqual([18]);
  });

  it('un día muy superior al resto domina: es el único pico', () => {
    expect(detectarPicos(serie(1, 2, 1, 2, 500, 3, 1)).map((p) => p.cantidad)).toEqual([500]);
  });

  it('con muchos picos conserva el máximo global y los más altos, ordenados por fecha', () => {
    const cantidades: number[] = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 30 : 0));
    cantidades[14] = 40;
    const picos = detectarPicos(serie(...cantidades));
    expect(picos).toHaveLength(MAX_PICOS);
    expect(picos.some((p) => p.cantidad === 40)).toBe(true);
    expect(picos.map((p) => p.indice)).toEqual([...picos.map((p) => p.indice)].sort((a, b) => a - b));
  });
});

describe('formato de fechas', () => {
  it('respeta el día calendario que entrega el backend (sin desplazamientos por huso horario)', () => {
    expect(formatearFecha('2026-11-01')).toBe('01/11');
    expect(formatearFecha('2026-01-01', true)).toBe('01/01/2026');
    expect(formatearFecha('2026-12-31')).toBe('31/12');
  });

  it('singular y plural de comentarios', () => {
    expect(textoComentarios(1)).toBe('1 comentario');
    expect(textoComentarios(18)).toBe('18 comentarios');
  });
});

describe('construirGrafico', () => {
  it('rotula cada pico con «fecha · cantidad comentarios» y marca el máximo global', () => {
    const g = construirGrafico(serie(2, 5, 18, 7, 3, 14, 4), 700);
    expect(g.picos.map((p) => p.etiqueta)).toEqual(['03/11 · 18 comentarios', '06/11 · 14 comentarios']);
    expect(g.picos.map((p) => p.esMaximo)).toEqual([true, false]);
    expect(g.picos.every((p) => p.etiquetaVisible)).toBe(true);
    expect(g.vacio).toBe(false);
  });

  it('el eje vertical usa enteros y cubre el máximo; el pico más alto queda arriba', () => {
    const g = construirGrafico(serie(2, 5, 18, 7), 700);
    expect(g.marcasY.map((m) => m.valor)).toEqual([0, 5, 10, 15, 20]);
    const [pico] = g.picos;
    expect(pico.y).toBeGreaterThan(0);
    expect(pico.y).toBeLessThan(g.base);
  });

  it('todos los puntos y etiquetas quedan dentro del área del SVG, incluso con ancho de móvil', () => {
    const g = construirGrafico(serie(30, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 30), 280);
    for (const p of g.picos) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(g.ancho);
      expect(p.etiquetaY).toBeGreaterThan(0);
      const mitad = (p.etiqueta.length * 7) / 2;
      const izq = p.anclaje === 'start' ? p.etiquetaX : p.anclaje === 'end' ? p.etiquetaX - 2 * mitad : p.etiquetaX - mitad;
      expect(izq).toBeGreaterThanOrEqual(0);
      expect(izq + 2 * mitad).toBeLessThanOrEqual(g.ancho);
    }
  });

  it('oculta la etiqueta que taparía a otra pero conserva el marcador y siempre rotula el máximo', () => {
    // Dos picos de días vecinos separados por un valle, en un gráfico angosto.
    const g = construirGrafico(serie(0, 20, 12, 19, 0), 280);
    expect(g.picos).toHaveLength(2);
    const maximo = g.picos.find((p) => p.esMaximo)!;
    const otro = g.picos.find((p) => !p.esMaximo)!;
    expect(maximo.cantidad).toBe(20);
    expect(maximo.etiquetaVisible).toBe(true);
    expect(otro.etiquetaVisible).toBe(false);
  });

  it('sin comentarios: gráfico vacío, sin picos ni división por cero', () => {
    const g = construirGrafico(serie(0, 0, 0), 600);
    expect(g.vacio).toBe(true);
    expect(g.picos).toEqual([]);
    expect(g.linea).not.toContain('NaN');
    expect(g.marcasY.every((m) => Number.isFinite(m.y))).toBe(true);
    expect(construirGrafico([], 600).vacio).toBe(true);
  });

  it('un solo día con comentarios muestra su marcador centrado y sin línea', () => {
    const g = construirGrafico(serie(6), 600);
    expect(g.linea).toBe('');
    expect(g.picos).toHaveLength(1);
    expect(g.picos[0].x).toBeCloseTo((g.izquierda + g.derecha) / 2);
  });

  it('un rango extenso reduce las fechas del eje horizontal para que no se solapen', () => {
    const g = construirGrafico(serie(...Array.from({ length: 365 }, (_, i) => i % 7)), 640);
    expect(g.marcasX.length).toBeLessThanOrEqual(Math.floor((g.derecha - g.izquierda) / 64));
    expect(g.marcasX.length).toBeGreaterThan(1);
    expect(g.linea.split(' ')).toHaveLength(365);
  });
});
