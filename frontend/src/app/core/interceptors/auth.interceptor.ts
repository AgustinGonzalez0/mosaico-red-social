import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Agrega `Authorization: Bearer <token>` a las peticiones hacia nuestro backend (y solo a ellas). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  if (!token || !req.url.startsWith(environment.apiUrl)) return next(req);
  const autorizada = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  if (req.url.endsWith('/auth/refresh')) return next(autorizada);
  return next(autorizada).pipe(
    catchError((err) => {
      if (err.status !== 401 || !auth.token()) return throwError(() => err);
      return auth.refrescar().pipe(
        switchMap(() => next(req.clone({ setHeaders: { Authorization: `Bearer ${auth.token()}` } }))),
        catchError((refreshError) => {
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
