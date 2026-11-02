import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { authDePrueba } from '../../testing/fixtures';
import { AuthService } from './auth.service';
import { PublicacionesService } from './publicaciones.service';

const API = `${environment.apiUrl}/publicaciones`;

describe('PublicacionesService + authInterceptor', () => {
  let servicio: PublicacionesService;
  let http: HttpTestingController;

  function configurar(token: string | null) {
    const auth = authDePrueba(null, token);
    vi.spyOn(auth, 'cerrarSesion');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    });
    servicio = TestBed.inject(PublicacionesService);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  it('listarPublicaciones envía orden, offset y limit como query params', () => {
    configurar('abc');
    servicio.listarPublicaciones({ orden: 'meGusta', offset: 24, limit: 12 }).subscribe();

    const req = http.expectOne((r) => r.url === API);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('orden')).toBe('meGusta');
    expect(req.request.params.get('offset')).toBe('24');
    expect(req.request.params.get('limit')).toBe('12');
    expect(req.request.params.has('autor')).toBe(false);
    req.flush({ data: [], total: 0, offset: 24, limit: 12, hasMore: false });
  });

  it('obtenerPublicacionesDeUsuario filtra por autor y limita a 3 en el servidor', () => {
    configurar('abc');
    servicio.obtenerPublicacionesDeUsuario('u1').subscribe();

    const req = http.expectOne((r) => r.url === API);
    expect(req.request.params.get('autor')).toBe('u1');
    expect(req.request.params.get('limit')).toBe('3');
    expect(req.request.params.get('orden')).toBe('fecha');
    req.flush({ data: [], total: 0, offset: 0, limit: 3, hasMore: false });
  });

  it('crearPublicacion envía el FormData tal cual (sin fijar Content-Type)', () => {
    configurar('abc');
    const datos = new FormData();
    datos.append('titulo', 't');
    servicio.crearPublicacion(datos).subscribe();

    const req = http.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(datos);
    expect(req.request.headers.has('Content-Type')).toBe(false); // lo arma el navegador con el boundary
    req.flush({});
  });

  it('usa POST para dar me gusta y DELETE para quitarlo', () => {
    configurar('abc');
    servicio.darMeGusta('p1').subscribe();
    const dar = http.expectOne(`${API}/p1/me-gusta`);
    expect(dar.request.method).toBe('POST');
    dar.flush({ meGusta: 1, leGusta: true });

    servicio.quitarMeGusta('p1').subscribe();
    const quitar = http.expectOne(`${API}/p1/me-gusta`);
    expect(quitar.request.method).toBe('DELETE');
    quitar.flush({ meGusta: 0, leGusta: false });
  });

  it('eliminarPublicacion usa DELETE sobre la publicación', () => {
    configurar('abc');
    servicio.eliminarPublicacion('p1').subscribe();
    const req = http.expectOne(`${API}/p1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('el interceptor agrega el token a las peticiones al backend', () => {
    configurar('abc');
    servicio.listarPublicaciones().subscribe();
    const req = http.expectOne((r) => r.url === API);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({});
  });

  it('el interceptor no agrega Authorization si no hay sesión', () => {
    configurar(null);
    servicio.listarPublicaciones().subscribe();
    const req = http.expectOne((r) => r.url === API);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('el interceptor no manda el token a otros dominios', () => {
    configurar('abc');
    TestBed.inject(HttpClient).get('https://otro-sitio.example.com/datos').subscribe();
    const req = http.expectOne('https://otro-sitio.example.com/datos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('pagina comentarios por offset y limit sin cambiar el bloque predeterminado de Mi Perfil', () => {
    configurar('abc');
    servicio.listarComentarios('p1').subscribe();
    const perfil = http.expectOne((r) => r.url === `${API}/p1/comentarios`);
    expect(perfil.request.params.get('offset')).toBe('0');
    expect(perfil.request.params.get('limit')).toBe('5');
    perfil.flush({});
    servicio.listarComentarios('p1', 5, 10).subscribe();
    const detalle = http.expectOne((r) => r.url === `${API}/p1/comentarios`);
    expect(detalle.request.params.get('offset')).toBe('10');
    expect(detalle.request.params.get('limit')).toBe('5');
    detalle.flush({});
  });

  it('un 401 protegido cierra sesión una vez y no renueva ni reintenta', () => {
    configurar('abc');
    servicio.listarPublicaciones().subscribe({ error: () => {} });
    http.expectOne((r) => r.url === API).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(TestBed.inject(AuthService).cerrarSesion).toHaveBeenCalledOnce();
    http.expectNone((r) => r.url.startsWith(`${environment.apiUrl}/auth/`));
  });

  it.each(['login', 'registro', 'autorizar', 'refrescar'])(
    'el 401 de /auth/%s se entrega al responsable sin redirigir',
    (ruta) => {
      configurar('abc');
      TestBed.inject(HttpClient)
        .post(`${environment.apiUrl}/auth/${ruta}`, {})
        .subscribe({ error: () => {} });
      const pedido = http.expectOne(`${environment.apiUrl}/auth/${ruta}`);
      expect(pedido.request.headers.has('Authorization')).toBe(
        ['autorizar', 'refrescar'].includes(ruta),
      );
      pedido.flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(TestBed.inject(AuthService).cerrarSesion).not.toHaveBeenCalled();
    },
  );

  it('no filtra el token a un dominio que solo comparte el prefijo de la API', () => {
    configurar('abc');
    const url = `${environment.apiUrl}.otro.example/datos`;
    TestBed.inject(HttpClient)
      .get(url)
      .subscribe({ error: () => {} });
    const pedido = http.expectOne(url);
    expect(pedido.request.headers.has('Authorization')).toBe(false);
    pedido.flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(TestBed.inject(AuthService).cerrarSesion).not.toHaveBeenCalled();
  });
});
