import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authDePrueba, usuarioDePrueba } from '../../testing/fixtures';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const ejecutar = () =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  it('permite una sesión autorizada con token vigente', () => {
    const auth = authDePrueba(usuarioDePrueba());
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    expect(ejecutar()).toBe(true);
  });

  it('un token local todavía no autorizado no habilita rutas ni borra el token durante el arranque', () => {
    const auth = authDePrueba(null, 'guardado');
    vi.spyOn(auth, 'logout');
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    expect(ejecutar()).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('un token que venció cierra la sesión y devuelve el login', () => {
    const auth = authDePrueba(usuarioDePrueba());
    auth.tokenVigente = () => false;
    vi.spyOn(auth, 'logout');
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    expect(ejecutar()).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
    expect(auth.logout).toHaveBeenCalledOnce();
  });
});
