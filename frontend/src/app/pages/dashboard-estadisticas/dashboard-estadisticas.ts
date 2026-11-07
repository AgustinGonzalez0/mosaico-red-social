import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Estadisticas, EstadisticasService } from '../../core/services/estadisticas.service';
import { mensajeDeError } from '../../core/services/auth.service';
import { construirGrafico, formatearFecha, textoComentarios } from './grafico-comentarios';

@Component({
  selector: 'app-dashboard-estadisticas',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './dashboard-estadisticas.html',
  styleUrl: './dashboard-estadisticas.scss',
})
export class DashboardEstadisticas implements OnInit {
  private readonly servicio = inject(EstadisticasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly formulario = this.fb.group({
    desde: ['', Validators.required],
    hasta: ['', Validators.required],
  });
  protected readonly datos = signal<Estadisticas | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Contenedor del gráfico de líneas: su ancho real define las coordenadas del SVG. */
  private readonly lienzo = viewChild<ElementRef<HTMLElement>>('lienzo');
  private readonly anchoLienzo = signal(640);

  /** Coordenadas, ejes y picos del gráfico «Comentarios por fecha», a partir de los datos reales. */
  protected readonly grafico = computed(() =>
    construirGrafico(this.datos()?.fechas ?? [], this.anchoLienzo()),
  );
  protected readonly fecha = formatearFecha;
  protected readonly comentarios = textoComentarios;

  constructor() {
    // Vuelve a calcular el gráfico cuando cambia el ancho disponible (giro del móvil, ventana...).
    effect((alLimpiar) => {
      const elemento = this.lienzo()?.nativeElement;
      if (!elemento || typeof ResizeObserver === 'undefined') return;
      const observador = new ResizeObserver(([entrada]) =>
        this.anchoLienzo.set(Math.floor(entrada.contentRect.width)),
      );
      observador.observe(elemento);
      alLimpiar(() => observador.disconnect());
    });
  }

  ngOnInit(): void {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(hasta.getDate() - 29);
    this.formulario.setValue({ desde: this.iso(desde), hasta: this.iso(hasta) });
    this.aplicarFiltros();
  }

  protected aplicarFiltros(): void {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.cargando()) return;
    const { desde, hasta } = this.formulario.getRawValue();
    this.cargando.set(true);
    this.error.set(null);
    this.servicio
      .consultar(desde, hasta)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          this.datos.set(datos);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeDeError(e));
          this.cargando.set(false);
        },
      });
  }

  protected totalComentarios(): number {
    return this.datos()?.fechas.reduce((total, item) => total + item.cantidad, 0) ?? 0;
  }

  protected maxPublicaciones(): number {
    return Math.max(...(this.datos()?.publicaciones.map((item) => item.cantidad) ?? [1]), 1);
  }

  protected porcentaje(cantidad: number, total: number): number {
    return total ? (cantidad / total) * 100 : 0;
  }

  protected fondoDona(): string {
    const valores = this.datos()?.publicacionesComentarios ?? [];
    const total = valores.reduce((suma, item) => suma + item.cantidad, 0);
    if (!total) return '#ddd';
    let acumulado = 0;
    const colores = ['#e60023', '#ff8c42', '#6c63ff', '#29a36a', '#d455a5'];
    return `conic-gradient(${valores
      .map((item, index) => {
        const inicio = acumulado;
        acumulado += (item.cantidad / total) * 100;
        return `${colores[index % colores.length]} ${inicio}% ${acumulado}%`;
      })
      .join(',')})`;
  }

  private iso(fecha: Date): string {
    return fecha.toISOString().slice(0, 10);
  }
}
