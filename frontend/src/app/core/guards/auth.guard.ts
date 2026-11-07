import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Deja pasar solo si el backend ya validó la sesión (`autenticado`). No mira el reloj del JWT:
 * si el token venció, la primera petición recibe 401 y el interceptor redirige al login.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? true : inject(Router).createUrlTree(['/login']);
};
