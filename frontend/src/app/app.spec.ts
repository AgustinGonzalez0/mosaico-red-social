import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { tokenDePrueba, usuarioDePrueba } from './testing/fixtures';
import { App } from './app';

describe('Arranque de Mosaico', () => {
  let fixture: ComponentFixture<App>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    fixture.destroy();
    TestBed.inject(AuthService).logout();
    http.verify();
    localStorage.clear();
  });

  function abrir(token: string | null) {
    if (token)
      localStorage.setItem('mosaico.sesion', JSON.stringify({ usuario: usuarioDePrueba(), token }));
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
  }

  it('sin token limpia la sesión y envía al login', () => {
    abrir(null);
    expect(navegar).toHaveBeenCalledWith(['/login']);
    http.expectNone(`${environment.apiUrl}/auth/autorizar`);
  });

  it('muestra un spinner y oculta las rutas hasta autorizar contra el backend', () => {
    abrir(tokenDePrueba());
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('.spinner')).not.toBeNull();
    expect(elemento.querySelector('router-outlet')).toBeNull();
    expect(TestBed.inject(AuthService).autenticado()).toBe(false);
    const pedido = http.expectOne(`${environment.apiUrl}/auth/autorizar`);
    expect(pedido.request.method).toBe('POST');
    pedido.flush(usuarioDePrueba({ nombre: 'Actualizado' }));
    fixture.detectChanges();
    expect(elemento.querySelector('.spinner')).toBeNull();
    expect(TestBed.inject(AuthService).usuario()?.nombre).toBe('Actualizado');
    expect(navegar).toHaveBeenCalledWith(['/publicaciones']);
  });

  it.each(['token-invalido', tokenDePrueba(Date.now() - 16 * 60_000)])(
    'un token rechazado se elimina sin intentar refresh',
    (token) => {
      abrir(token);
      http
        .expectOne(`${environment.apiUrl}/auth/autorizar`)
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();
      expect(TestBed.inject(AuthService).token()).toBeNull();
      expect(navegar).toHaveBeenCalledWith(['/login']);
      http.expectNone(`${environment.apiUrl}/auth/refrescar`);
    },
  );

  it('un error de red permite reintentar conservando el token sin mostrar rutas protegidas', () => {
    abrir(tokenDePrueba());
    http.expectOne(`${environment.apiUrl}/auth/autorizar`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('[role="alert"]')!.textContent).toContain('No se pudo conectar');
    expect(elemento.querySelector('router-outlet')).toBeNull();
    elemento.querySelector<HTMLButtonElement>('button')!.click();
    http.expectOne(`${environment.apiUrl}/auth/autorizar`).flush(usuarioDePrueba());
    expect(navegar).toHaveBeenCalledWith(['/publicaciones']);
  });
});
