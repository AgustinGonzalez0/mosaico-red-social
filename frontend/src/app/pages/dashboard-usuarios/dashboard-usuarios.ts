import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AutoFocoDirective } from '../../shared/directives/auto-foco.directive';
import { ResaltarEstadoDirective } from '../../shared/directives/resaltar-estado.directive';
import { EstadoUsuarioPipe } from '../../shared/pipes/estado-usuario.pipe';
import { NombreCompletoPipe } from '../../shared/pipes/nombre-completo.pipe';
import { ResumenTextoPipe } from '../../shared/pipes/resumen-texto.pipe';
import { AuthService, mensajeDeError } from '../../core/services/auth.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { ModalService } from '../../core/services/modal.service';
import { Usuario } from '../../core/models/usuario.model';

@Component({ selector: 'app-dashboard-usuarios', imports: [ReactiveFormsModule, RouterLink, AutoFocoDirective, ResaltarEstadoDirective, EstadoUsuarioPipe, NombreCompletoPipe, ResumenTextoPipe], templateUrl: './dashboard-usuarios.html', styleUrl: './dashboard-usuarios.scss' })
export class DashboardUsuarios implements OnInit {
  private readonly usuarios = inject(UsuariosService); private readonly modal = inject(ModalService); private readonly destroyRef = inject(DestroyRef); private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly auth = inject(AuthService); protected readonly Math = Math; protected readonly lista = signal<Usuario[]>([]); protected readonly cargando = signal(false); protected readonly guardando = signal(false); protected readonly error = signal<string | null>(null); protected readonly aviso = signal<string | null>(null); protected readonly mostrarFormulario = signal(false); protected readonly offset = signal(0); protected readonly total = signal(0); protected readonly limit = 10;
  protected readonly formulario = this.fb.group({ nombre: ['', [Validators.required, Validators.maxLength(50)]], apellido: ['', [Validators.required, Validators.maxLength(50)]], correo: ['', [Validators.required, Validators.email]], nombreUsuario: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_.]{3,20}$/)]], password: ['', Validators.required], repetirPassword: ['', Validators.required], fechaNacimiento: ['', Validators.required], descripcion: ['', [Validators.required, Validators.maxLength(200)]], perfil: this.fb.control<'usuario' | 'administrador'>('usuario', Validators.required) });
  private imagen: File | null = null;
  ngOnInit(): void { this.traerUsuarios(); }
  protected traerUsuarios(): void { this.cargando.set(true); this.error.set(null); this.usuarios.listar(this.offset(), this.limit).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (r) => { this.lista.set(r.data); this.total.set(r.total); this.cargando.set(false); }, error: (e) => { this.error.set(mensajeDeError(e)); this.cargando.set(false); } }); }
  protected cambiarPagina(delta: number): void { const nuevo = this.offset() + delta * this.limit; if (nuevo >= 0 && nuevo < this.total()) { this.offset.set(nuevo); this.traerUsuarios(); } }
  protected seleccionarImagen(event: Event): void { this.imagen = (event.target as HTMLInputElement).files?.[0] ?? null; }
  protected guardar(): void { this.formulario.markAllAsTouched(); if (this.formulario.invalid || this.guardando()) return; const datos = new FormData(); Object.entries(this.formulario.getRawValue()).forEach(([clave, valor]) => datos.append(clave, String(valor))); if (this.imagen) datos.append('imagenPerfil', this.imagen); this.guardando.set(true); this.usuarios.crear(datos).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.guardando.set(false); this.formulario.reset({ perfil: 'usuario' }); this.imagen = null; this.mostrarFormulario.set(false); this.aviso.set('Usuario creado correctamente'); this.traerUsuarios(); }, error: (e) => { this.guardando.set(false); this.error.set(mensajeDeError(e)); } }); }
  protected async cambiarEstado(usuario: Usuario): Promise<void> { const habilitar = !usuario.habilitado; if (!habilitar && !(await this.modal.confirmar('Deshabilitar usuario', `¿Querés deshabilitar a ${usuario.nombreUsuario}?`, 'Deshabilitar'))) return; this.guardando.set(true); const pedido = habilitar ? this.usuarios.habilitar(usuario.id) : this.usuarios.deshabilitar(usuario.id); pedido.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.guardando.set(false); this.lista.update((items) => items.map((item) => item.id === usuario.id ? { ...item, habilitado: habilitar } : item)); }, error: (e) => { this.guardando.set(false); this.error.set(mensajeDeError(e)); } }); }
}
