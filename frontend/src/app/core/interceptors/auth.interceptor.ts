import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * 1) Agrega `Authorization: Bearer <JWT>` a las peticiones a nuestra API.
 * 2) Si el backend responde 401 a una petición protegida, el JWT no sirve (venció, es inválido o el
 *    usuario fue deshabilitado): limpia la sesión y redirige al login. Cualquier otro error
 *    (403, 500, sin conexión...) NO cierra la sesión. Nunca intenta renovar un token vencido.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiUrl.replace(/\/$/, '');
  if (req.url !== base && !req.url.startsWith(`${base}/`)) return next(req);
  const auth = inject(AuthService);
  const ruta = req.url.slice(base.length).split('?')[0];
  const publica = ['/auth/login', '/auth/registro'].includes(ruta);
  // autorizar y refrescar resuelven su propio 401 (app.ts y AuthService).
  const sesion = ['/auth/autorizar', '/auth/refrescar'].includes(ruta);
  const token = auth.token();
  const solicitud =
    token && !publica ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(solicitud).pipe(
    catchError((error) => {
      // Solo se cierra si el token rechazado sigue siendo el actual: así varios 401 simultáneos
      // redirigen una única vez y un 401 tardío de una sesión vieja no cierra la sesión nueva.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !publica &&
        !sesion &&
        token &&
        token === auth.token()
      )
        auth.cerrarSesion();
      return throwError(() => error);
    }),
  );
};
