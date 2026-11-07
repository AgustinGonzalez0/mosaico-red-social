import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter, firstValueFrom, take } from 'rxjs';
import { environment } from '../environments/environment';
import { appConfig } from './app.config';
import { AuthService } from './core/services/auth.service';
import {
  paginadoDePrueba,
  publicacionDePrueba,
  tokenDePrueba,
  usuarioDePrueba,
} from './testing/fixtures';
import { App, DURACION_MINIMA_CARGA } from './app';

const API = environment.apiUrl;
const ID = '64b7f0f0f0f0f0f0f0f0f0f0';
const DETALLE = `/publicaciones/${ID}`;

describe('Arranque y navegación de Mosaico con el Router real', () => {
  let fixture: ComponentFixture<App>;
  let http: HttpTestingController;
  let router: Router;
  let ubicacion: Location;
  let navegacionInicial: Promise<NavigationEnd>;
  let eventos: Subscription;
  let destinos: string[];
  let duracionMinima = 0;

  beforeEach(() => {
    duracionMinima = 0;
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        provideHttpClientTesting(),
        provideLocationMocks(),
        { provide: DURACION_MINIMA_CARGA, useFactory: () => duracionMinima }, // por defecto sin demora visual
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    ubicacion = TestBed.inject(Location);
    destinos = [];
    eventos = router.events.subscribe((evento) => {
      if (evento instanceof NavigationEnd) destinos.push(evento.urlAfterRedirects);
    });
  });

  afterEach(() => {
    fixture.destroy();
    eventos.unsubscribe();
    TestBed.inject(AuthService).logout();
    http.verify();
    localStorage.clear();
  });

  function abrir(url: string, token: string | null = null): void {
    ubicacion.go(url);
    if (token)
      localStorage.setItem('mosaico.sesion', JSON.stringify({ usuario: usuarioDePrueba(), token }));
    navegacionInicial = firstValueFrom(
      router.events.pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        take(1),
      ),
    );
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
  }

  async function completarNavegacion(): Promise<void> {
    await navegacionInicial;
    fixture.detectChanges();
    // Se renderizan los componentes y guards reales; solo se simula la frontera HTTP.
    for (const pedido of http.match((r) => r.url === `${API}/publicaciones`)) {
      pedido.flush(paginadoDePrueba([]));
    }
    for (const pedido of http.match(`${API}${DETALLE}`)) {
      pedido.flush(publicacionDePrueba({ id: ID }));
    }
    for (const pedido of http.match((r) => r.url === `${API}${DETALLE}/comentarios`)) {
      pedido.flush(paginadoDePrueba([]));
    }
    fixture.detectChanges();
  }

  async function autorizar(): Promise<void> {
    const pedido = http.expectOne(`${API}/auth/autorizar`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.headers.get('Authorization')).toBe(
      `Bearer ${TestBed.inject(AuthService).token()}`,
    );
    pedido.flush(usuarioDePrueba({ nombre: 'Actualizado' }));
    await completarNavegacion();
  }

  it.each([
    ['/', '/login', 'app-login'],
    ['/login', '/login', 'app-login'],
    ['/registro', '/registro', 'app-registro'],
    ['/registro?invitacion=mosaico', '/registro?invitacion=mosaico', 'app-registro'],
    ['/publicaciones', '/login', 'app-login'],
    [DETALLE, '/login', 'app-login'],
    ['/mi-perfil', '/login', 'app-login'],
  ])(
    'sin token: %s termina en %s sin consultar autorizar',
    async (solicitada, esperada, selector) => {
      abrir(solicitada);
      await completarNavegacion();
      expect(router.url).toBe(esperada);
      expect(ubicacion.path()).toBe(esperada);
      expect(fixture.nativeElement.querySelector(selector)).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-shell')).toBeNull();
      expect(destinos).toEqual([esperada]);
      http.expectNone(`${API}/auth/autorizar`);
    },
  );

  it.each([
    ['/', '/publicaciones', 'app-publicaciones'],
    ['?origen=inicio#bienvenida', '/publicaciones', 'app-publicaciones'],
    ['/login', '/publicaciones', 'app-publicaciones'],
    ['/registro', '/publicaciones', 'app-publicaciones'],
    ['/publicaciones', '/publicaciones', 'app-publicaciones'],
    [DETALLE, DETALLE, 'app-detalle-publicacion'],
    ['/mi-perfil', '/mi-perfil', 'app-mi-perfil'],
    [
      `${DETALLE}?origen=perfil&etiqueta=arte#comentarios`,
      `${DETALLE}?origen=perfil&etiqueta=arte#comentarios`,
      'app-detalle-publicacion',
    ],
    ['/publicaciones?orden=meGusta', '/publicaciones?orden=meGusta', 'app-publicaciones'],
  ])(
    'con token válido: %s termina en %s conservando el destino',
    async (solicitada, esperada, selector) => {
      abrir(solicitada, tokenDePrueba());
      const elemento = fixture.nativeElement as HTMLElement;
      expect(elemento.querySelector('.spinner')).not.toBeNull();
      expect(elemento.querySelector('router-outlet')).toBeNull();
      expect(elemento.querySelector('app-shell')).toBeNull();
      expect(TestBed.inject(AuthService).autenticado()).toBe(false);
      expect(router.navigated).toBe(false);
      expect(destinos).toEqual([]);
      http.expectNone((r) => r.url.startsWith(`${API}/publicaciones`));
      await autorizar();
      expect(router.url).toBe(esperada);
      expect(ubicacion.path(true)).toBe(esperada);
      expect(elemento.querySelector(selector)).not.toBeNull();
      expect(elemento.querySelector('.spinner')).toBeNull();
      expect(TestBed.inject(AuthService).usuario()?.nombre).toBe('Actualizado');
      expect(destinos).toEqual([esperada]);
    },
  );

  it.each(['token-invalido', tokenDePrueba(Date.now() - 16 * 60_000)])(
    'un token rechazado al abrir el detalle se elimina y termina en login sin renovar',
    async (token) => {
      abrir(DETALLE, token);
      http
        .expectOne(`${API}/auth/autorizar`)
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      await completarNavegacion();
      expect(TestBed.inject(AuthService).token()).toBeNull();
      expect(router.url).toBe('/login');
      expect(fixture.nativeElement.querySelector('app-login')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-detalle-publicacion')).toBeNull();
      expect(destinos).toEqual(['/login']);
      http.expectNone(`${API}/auth/refrescar`);
    },
  );

  it.each(['/login', '/registro'])(
    'un token rechazado mantiene accesible la página pública %s',
    async (url) => {
      abrir(url, 'token-invalido');
      http
        .expectOne(`${API}/auth/autorizar`)
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      await completarNavegacion();
      expect(router.url).toBe(url);
      expect(TestBed.inject(AuthService).token()).toBeNull();
      expect(destinos).toEqual([url]);
    },
  );

  it('un error de red conserva el destino y permite reintentar sin navegar ni mostrar contenido protegido', async () => {
    const destino = `${DETALLE}?origen=perfil#comentarios`;
    abrir(destino, tokenDePrueba());
    http.expectOne(`${API}/auth/autorizar`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('[role="alert"]')!.textContent).toContain('No se pudo conectar');
    expect(elemento.querySelector('router-outlet')).toBeNull();
    expect(ubicacion.path(true)).toBe(destino);
    expect(destinos).toEqual([]);
    elemento.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(elemento.querySelector('.spinner')).not.toBeNull();
    await autorizar();
    expect(router.url).toBe(destino);
    expect(destinos).toEqual([destino]);
  });

  it('la navegación posterior sigue protegida por authGuard sin volver a autorizar el arranque', async () => {
    abrir('/registro');
    await completarNavegacion();
    await router.navigateByUrl('/mi-perfil');
    fixture.detectChanges();
    expect(router.url).toBe('/login');
    expect(fixture.nativeElement.querySelector('app-mi-perfil')).toBeNull();
    expect(destinos).toEqual(['/registro', '/login']);
    http.expectNone(`${API}/auth/autorizar`);
  });

  it('ignora parámetros de retorno externos y solo navega dentro de las rutas de la aplicación', async () => {
    abrir('/login?returnUrl=https%3A%2F%2Fejemplo.com', tokenDePrueba());
    await autorizar();
    expect(router.url).toBe('/publicaciones');
    expect(destinos).toEqual(['/publicaciones']);
  });

  describe('pantalla de carga con la duración mínima real (2.500 ms)', () => {
    const MINIMO = 2500;
    const elemento = () => fixture.nativeElement as HTMLElement;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
      duracionMinima = MINIMO; // se lee recién al crear App
    });
    afterEach(() => vi.useRealTimers());

    const enPantallaDeCarga = () => {
      expect(elemento().querySelector('.spinner')).not.toBeNull();
      expect(elemento().querySelector('router-outlet')).toBeNull();
      expect(elemento().querySelector('app-shell')).toBeNull();
      expect(elemento().querySelector('app-publicaciones')).toBeNull();
      expect(router.navigated).toBe(false);
    };

    it('es accesible: role="status", aria-busy y el texto «Validando tu sesión…»', () => {
      abrir('/publicaciones', tokenDePrueba());
      const region = elemento().querySelector('[role="status"]')!;
      expect(region.getAttribute('aria-busy')).toBe('true');
      expect(region.textContent).toContain('Mosaico');
      expect(region.textContent).toContain('Validando tu sesión…');
      http.expectOne(`${API}/auth/autorizar`).flush(usuarioDePrueba());
      return vi.advanceTimersByTimeAsync(MINIMO).then(completarNavegacion);
    });

    it('token válido: consulta enseguida, pero no muestra contenido antes de los 2.500 ms', async () => {
      abrir('/publicaciones', tokenDePrueba());
      const pedido = http.expectOne(`${API}/auth/autorizar`); // la validación real empieza de inmediato
      await vi.advanceTimersByTimeAsync(100);
      pedido.flush(usuarioDePrueba());
      await vi.advanceTimersByTimeAsync(MINIMO - 100 - 1);
      fixture.detectChanges();
      enPantallaDeCarga();
      expect(destinos).toEqual([]);

      await vi.advanceTimersByTimeAsync(1);
      await completarNavegacion();
      expect(router.url).toBe('/publicaciones');
      expect(elemento().querySelector('app-publicaciones')).not.toBeNull();
      expect(elemento().querySelector('.spinner')).toBeNull();
    });

    it('si el servidor tarda más de 2.500 ms, la pantalla espera su respuesta', async () => {
      abrir('/publicaciones', tokenDePrueba());
      const pedido = http.expectOne(`${API}/auth/autorizar`);
      await vi.advanceTimersByTimeAsync(4000);
      fixture.detectChanges();
      enPantallaDeCarga(); // pasó el mínimo, pero el backend todavía no confirmó
      pedido.flush(usuarioDePrueba());
      await completarNavegacion();
      expect(router.url).toBe('/publicaciones');
      expect(elemento().querySelector('.spinner')).toBeNull();
    });

    it('token rechazado (401): también espera el mínimo y termina en el login sin renovar', async () => {
      abrir(DETALLE, tokenDePrueba(Date.now() - 16 * 60_000));
      http.expectOne(`${API}/auth/autorizar`).flush(null, { status: 401, statusText: 'Unauthorized' });
      await vi.advanceTimersByTimeAsync(MINIMO - 1);
      fixture.detectChanges();
      enPantallaDeCarga();
      await vi.advanceTimersByTimeAsync(1);
      await completarNavegacion();
      expect(TestBed.inject(AuthService).token()).toBeNull();
      expect(router.url).toBe('/login');
      expect(elemento().querySelector('app-login')).not.toBeNull();
      http.expectNone(`${API}/auth/refrescar`);
    });

    it('sin token no consulta al backend ni agrega demora', async () => {
      abrir('/publicaciones');
      await completarNavegacion(); // sin avanzar el reloj
      expect(router.url).toBe('/login');
      expect(elemento().querySelector('app-login')).not.toBeNull();
      http.expectNone(`${API}/auth/autorizar`);
    });

    it('sin conexión: muestra el error enseguida (no es un JWT inválido), conserva el token y permite reintentar', async () => {
      const token = tokenDePrueba();
      abrir(DETALLE, token);
      http.expectOne(`${API}/auth/autorizar`).error(new ProgressEvent('error'));
      fixture.detectChanges();
      expect(elemento().querySelector('[role="alert"]')!.textContent).toContain('No se pudo conectar');
      expect(TestBed.inject(AuthService).token()).toBe(token);
      expect(elemento().querySelector('router-outlet')).toBeNull();
      expect(destinos).toEqual([]);

      elemento().querySelector<HTMLButtonElement>('button')!.click();
      fixture.detectChanges();
      expect(elemento().querySelector('.spinner')).not.toBeNull();
      http.expectOne(`${API}/auth/autorizar`).flush(usuarioDePrueba());
      await vi.advanceTimersByTimeAsync(MINIMO);
      await completarNavegacion();
      expect(router.url).toBe(DETALLE);
    });

    it('nunca inicia dos validaciones simultáneas', async () => {
      abrir('/publicaciones', tokenDePrueba());
      const app = fixture.componentInstance as unknown as { validarSesion(): void };
      app.validarSesion();
      app.validarSesion();
      http.expectOne(`${API}/auth/autorizar`).flush(usuarioDePrueba()); // falla si hubiera más de uno
      await vi.advanceTimersByTimeAsync(MINIMO);
      await completarNavegacion();
      expect(destinos).toEqual(['/publicaciones']);
    });
  });
});
