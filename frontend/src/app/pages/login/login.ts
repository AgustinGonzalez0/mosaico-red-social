import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, mensajeDeError } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { passwordFuerte } from '../../core/validators';
import { MosaicoFondo } from '../../shared/mosaico-fondo/mosaico-fondo';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MosaicoFondo],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(false);
  protected readonly verPassword = signal(false);

  protected readonly form = this.fb.group({
    usuario: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, passwordFuerte]],
  });

  protected get f() {
    return this.form.controls;
  }

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    const { usuario, password } = this.form.getRawValue();
    this.auth.login(usuario, password).subscribe({
      next: () => this.router.navigate(['/publicaciones']),
      error: (err) => {
        this.cargando.set(false);
        const mensaje = err instanceof HttpErrorResponse && err.status === 401 ? 'Contraseña incorrecta' : mensajeDeError(err);
        this.modal.error('No pudimos iniciar sesión', mensaje);
      },
    });
  }
}
