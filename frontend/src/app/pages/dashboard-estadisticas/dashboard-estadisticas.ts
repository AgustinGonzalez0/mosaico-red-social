import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Estadisticas, EstadisticasService } from '../../core/services/estadisticas.service';
import { mensajeDeError } from '../../core/services/auth.service';

@Component({ selector: 'app-dashboard-estadisticas', imports: [ReactiveFormsModule, RouterLink], templateUrl: './dashboard-estadisticas.html', styleUrl: './dashboard-estadisticas.scss' })
export class DashboardEstadisticas implements OnInit {
  private readonly servicio = inject(EstadisticasService); private readonly destroyRef = inject(DestroyRef); private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly formulario = this.fb.group({ desde: ['', Validators.required], hasta: ['', Validators.required] }); protected readonly datos = signal<Estadisticas | null>(null); protected readonly cargando = signal(false); protected readonly error = signal<string | null>(null);
  ngOnInit(): void { const hasta = new Date(); const desde = new Date(); desde.setDate(hasta.getDate() - 29); this.formulario.setValue({ desde: this.iso(desde), hasta: this.iso(hasta) }); this.aplicarFiltros(); }
  protected aplicarFiltros(): void { this.formulario.markAllAsTouched(); if (this.formulario.invalid || this.cargando()) return; const { desde, hasta } = this.formulario.getRawValue(); this.cargando.set(true); this.error.set(null); this.servicio.consultar(desde, hasta).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (datos) => { this.datos.set(datos); this.cargando.set(false); }, error: (e) => { this.error.set(mensajeDeError(e)); this.cargando.set(false); } }); }
  protected totalComentarios(): number { return this.datos()?.fechas.reduce((total, item) => total + item.cantidad, 0) ?? 0; }
  protected maxPublicaciones(): number { return Math.max(...(this.datos()?.publicaciones.map((item) => item.cantidad) ?? [1]), 1); }
  protected maxComentarios(): number { return Math.max(...(this.datos()?.fechas.map((item) => item.cantidad) ?? [1]), 1); }
  protected porcentaje(cantidad: number, total: number): number { return total ? cantidad / total * 100 : 0; }
  protected puntosLinea(): string { const valores = this.datos()?.fechas ?? []; const max = this.maxComentarios(); return valores.map((item, index) => `${valores.length > 1 ? index * 100 / (valores.length - 1) : 50},${100 - item.cantidad * 90 / max}`).join(' '); }
  protected fondoDona(): string { const valores = this.datos()?.publicacionesComentarios ?? []; const total = valores.reduce((suma, item) => suma + item.cantidad, 0); if (!total) return '#ddd'; let acumulado = 0; const colores = ['#e60023', '#ff8c42', '#6c63ff', '#29a36a', '#d455a5']; return `conic-gradient(${valores.map((item, index) => { const inicio = acumulado; acumulado += item.cantidad / total * 100; return `${colores[index % colores.length]} ${inicio}% ${acumulado}%`; }).join(',')})`; }
  private iso(fecha: Date): string { return fecha.toISOString().slice(0, 10); }
}
