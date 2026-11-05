import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() && auth.tokenVigente() && auth.usuario()?.perfil === 'administrador'
    ? true
    : inject(Router).createUrlTree(['/publicaciones']);
};
