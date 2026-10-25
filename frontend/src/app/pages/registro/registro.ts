import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MAX_BYTES_IMAGEN, TIPOS_IMAGEN } from '../../core/imagen';
import { AuthService, mensajeDeError } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { fechaNacimientoValida, passwordFuerte, passwordsIguales, requisitosPassword } from '../../core/validators';
import { MosaicoFondo } from '../../shared/mosaico-fondo/mosaico-fondo';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink, MosaicoFondo],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly cargando = signal(false);
  protected readonly verPassword = signal(false);
  protected readonly vistaPrevia = signal<string | null>(null);
  protected readonly errorImagen = signal<string | null>(null);
  private imagen: File | null = null;

  protected readonly form = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(50)]],
      apellido: ['', [Validators.required, Validators.maxLength(50)]],
      correo: ['', [Validators.required, Validators.email]],
      nombreUsuario: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_.]{3,20}$/)]],
      password: ['', [Validators.required, passwordFuerte]],
      repetirPassword: ['', [Validators.required]],
      fechaNacimiento: ['', [Validators.required, fechaNacimientoValida]],
      descripcion: ['', [Validators.required, Validators.maxLength(200)]],
    },
    { validators: passwordsIguales },
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.liberarVistaPrevia());
  }

  protected get f() {
    return this.form.controls;
  }

  protected get requisitos() {
    return requisitosPassword(this.f.password.value);
  }

  protected get hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  protected elegirImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.liberarVistaPrevia();
    this.imagen = null;
    this.errorImagen.set(null);
    if (!archivo) return;

    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      this.errorImagen.set('El archivo debe ser una imagen JPG, PNG, WEBP o GIF.');
      input.value = '';
      return;
    }
    if (archivo.size > MAX_BYTES_IMAGEN) {
      this.errorImagen.set('La imagen no puede superar los 5 MB.');
      input.value = '';
      return;
    }
    this.imagen = archivo;
    this.vistaPrevia.set(URL.createObjectURL(archivo));
  }

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('.ng-invalid[formControlName]')?.focus();
      return;
    }

    const datos = new FormData();
    for (const [campo, valor] of Object.entries(this.form.getRawValue())) datos.append(campo, valor);
    if (this.imagen) datos.append('imagenPerfil', this.imagen);

    this.cargando.set(true);
    this.auth.registro(datos).subscribe({
      next: async (sesion) => {
        await this.modal.exito('¡Cuenta creada!', `Te damos la bienvenida, ${sesion.usuario.nombre}.`);
        this.router.navigate(['/publicaciones']);
      },
      error: (err) => {
        this.cargando.set(false);
        this.modal.error('No pudimos crear tu cuenta', mensajeDeError(err));
      },
    });
  }

  private liberarVistaPrevia(): void {
    const url = this.vistaPrevia();
    if (url) URL.revokeObjectURL(url);
    this.vistaPrevia.set(null);
  }
}
