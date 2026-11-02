import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.autenticado() && auth.tokenVigente()) return true;
  if (auth.autenticado()) auth.logout();
  return inject(Router).createUrlTree(['/login']);
};
