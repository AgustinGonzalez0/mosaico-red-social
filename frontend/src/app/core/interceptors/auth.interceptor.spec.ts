import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { tokenDePrueba, usuarioDePrueba } from '../../testing/fixtures';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

const API = environment.apiUrl;
const PROTEGIDA = `${API}/publicaciones`;

describe('authInterceptor', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let cliente: HttpClient;
  let navegar: ReturnType<typeof vi.spyOn>;
  let token: string;

  beforeEach(() => {
    localStorage.clear();
    token = tokenDePrueba();
    localStorage.setItem('mosaico.sesion', JSON.stringify({ usuario: usuarioDePrueba(), token }));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    auth = TestBed.inject(AuthService);
    auth.autorizar().subscribe();
    http.expectOne(`${API}/auth/autorizar`).flush(usuarioDePrueba());
    expect(auth.autenticado()).toBe(true);
  });

  afterEach(() => {
    auth.logout();
    http.verify();
    localStorage.clear();
  });

  const pedir = (url: string) => {
    const error = vi.fn();
    cliente.get(url).subscribe({ error });
    return { error, req: http.expectOne(url) };
  };

  it('agrega Authorization: Bearer a las peticiones protegidas', () => {
    const { req } = pedir(PROTEGIDA);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush([]);
  });

  it('no envía el token a servidores ajenos a la API ni cierra la sesión si ellos responden 401', () => {
    const { req } = pedir('https://otro-servidor.com/datos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(auth.autenticado()).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('ante un 401 de una ruta protegida limpia la sesión y redirige al login', () => {
    const { req, error } = pedir(PROTEGIDA);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(error).toHaveBeenCalledOnce(); // el error le sigue llegando al componente
    expect(auth.token()).toBeNull();
    expect(auth.autenticado()).toBe(false);
    expect(localStorage.getItem('mosaico.sesion')).toBeNull();
    expect(navegar).toHaveBeenCalledExactlyOnceWith(['/login']);
  });

  it('varios 401 simultáneos redirigen una sola vez', () => {
    const pedidos = [PROTEGIDA, `${PROTEGIDA}/1`, `${PROTEGIDA}/2`].map(pedir);
    for (const { req } of pedidos) req.flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(navegar).toHaveBeenCalledOnce();
  });

  it('un 401 tardío de una sesión anterior no cierra la sesión nueva', () => {
    const { req } = pedir(PROTEGIDA);
    auth.logout();
    const nuevo = tokenDePrueba(Date.now() + 1000);
    localStorage.setItem('mosaico.sesion', JSON.stringify({ usuario: usuarioDePrueba(), token: nuevo }));
    auth.login('ana', 'Clave1234').subscribe();
    http
      .expectOne(`${API}/auth/login`)
      .flush({ usuario: usuarioDePrueba(), token: nuevo });
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(auth.token()).toBe(nuevo);
    expect(navegar).not.toHaveBeenCalled();
  });

  it.each([
    [403, 'Forbidden'],
    [500, 'Internal Server Error'],
    [404, 'Not Found'],
  ])('un error %i no cierra la sesión', (status, statusText) => {
    const { req, error } = pedir(PROTEGIDA);
    req.flush(null, { status, statusText });
    expect(error).toHaveBeenCalledOnce();
    expect(auth.autenticado()).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('un problema de conexión no cierra la sesión', () => {
    const { req } = pedir(PROTEGIDA);
    req.error(new ProgressEvent('error'));
    expect(auth.autenticado()).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
  });

  it.each(['/auth/login', '/auth/registro'])('un 401 en %s no se trata como sesión vencida', (ruta) => {
    const error = vi.fn();
    cliente.post(`${API}${ruta}`, {}).subscribe({ error });
    const req = http.expectOne(`${API}${ruta}`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(error).toHaveBeenCalledOnce();
    expect(auth.autenticado()).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
  });

  it.each(['/auth/autorizar', '/auth/refrescar'])(
    'el 401 de %s lo resuelve quien lo pidió, no el interceptor, y nunca se reintenta',
    (ruta) => {
      const error = vi.fn();
      cliente.post(`${API}${ruta}`, null).subscribe({ error });
      const req = http.expectOne(`${API}${ruta}`);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(error).toHaveBeenCalledOnce();
      expect(navegar).not.toHaveBeenCalled();
      http.expectNone(`${API}${ruta}`); // sin reintentos ni renovación automática
    },
  );
});
