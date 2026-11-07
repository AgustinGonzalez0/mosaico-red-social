import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/** Solo mejora la experiencia: el backend vuelve a exigir el perfil de administrador en cada petición. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() && auth.usuario()?.perfil === 'administrador'
    ? true
    : inject(Router).createUrlTree(['/publicaciones']);
};
