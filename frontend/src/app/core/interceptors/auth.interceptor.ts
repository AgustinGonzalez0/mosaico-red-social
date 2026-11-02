import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiUrl.replace(/\/$/, '');
  if (req.url !== base && !req.url.startsWith(`${base}/`)) return next(req);
  const auth = inject(AuthService);
  const ruta = req.url.slice(base.length).split('?')[0];
  const publica = ['/auth/login', '/auth/registro'].includes(ruta);
  const sesion = ['/auth/autorizar', '/auth/refrescar'].includes(ruta);
  const token = auth.token();
  const solicitud =
    token && !publica ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(solicitud).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !publica && !sesion)
        auth.cerrarSesion();
      return throwError(() => error);
    }),
  );
};
