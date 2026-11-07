import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { tokenDePrueba, usuarioDePrueba } from '../../testing/fixtures';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { AuthService } from './auth.service';
import { ModalService } from './modal.service';

const API = `${environment.apiUrl}/auth`;
const MINUTO = 60_000;

describe('Sesión y temporizador', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let modal: ModalService;
  let navegar: ReturnType<typeof vi.spyOn>;

  function configurar() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    modal = TestBed.inject(ModalService);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date('2026-11-02T12:00:00Z'));
    localStorage.clear();
    configurar();
  });
  afterEach(() => {
    auth?.logout();
    modal.cerrar();
    http.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.useRealTimers();
  });

  /** Simula abrir la app con una sesión guardada: el backend valida el JWT con /auth/autorizar. */
  function iniciar(edadMinutos = 0) {
    const token = tokenDePrueba(Date.now() - edadMinutos * MINUTO);
    localStorage.setItem('mosaico.sesion', JSON.stringify({ usuario: usuarioDePrueba(), token }));
    auth = TestBed.inject(AuthService);
    expect(auth.autenticado()).toBe(false);
    auth.autorizar().subscribe();
    const solicitud = http.expectOne(`${API}/autorizar`);
    expect(solicitud.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    solicitud.flush(usuarioDePrueba());
    return token;
  }

  it('autoriza en el servidor antes de habilitar la sesión almacenada', () => {
    const token = iniciar();
    expect(auth.autenticado()).toBe(true);
    expect(JSON.parse(localStorage.getItem('mosaico.sesion')!).token).toBe(token);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('a los diez minutos ofrece extender; «Ahora no» no renueva ni cierra la sesión al llegar al minuto quince', async () => {
    const token = iniciar();
    await vi.advanceTimersByTimeAsync(10 * MINUTO - 1);
    expect(modal.actual()).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(modal.actual()).toMatchObject({
      titulo: 'Tu sesión está por vencer',
      textoBoton: 'Extender sesión',
      textoCancelar: 'Ahora no',
    });
    expect(vi.getTimerCount()).toBe(1);
    modal.cerrar(false);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(4 * MINUTO);
    expect(auth.token()).toBe(token);
    expect(auth.autenticado()).toBe(true);
    window.dispatchEvent(new Event('focus'));
    expect(modal.actual()).toBeNull(); // el aviso no se repite para el mismo token
    // El JWT vence: el temporizador NO expulsa al usuario ni pide un token nuevo.
    await vi.advanceTimersByTimeAsync(MINUTO);
    expect(auth.tokenVigente()).toBe(false);
    expect(auth.token()).toBe(token);
    expect(auth.autenticado()).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    http.expectNone(`${API}/refrescar`);
  });

  it('con el JWT vencido y sin peticiones no hay cierre automático; el 401 de la primera petición protegida cierra y redirige', async () => {
    const token = iniciar();
    await vi.advanceTimersByTimeAsync(20 * MINUTO);
    expect(auth.autenticado()).toBe(true);
    expect(navegar).not.toHaveBeenCalled();

    const url = `${environment.apiUrl}/publicaciones`;
    TestBed.inject(HttpClient).get(url).subscribe({ error: () => {} });
    const pedido = http.expectOne(url);
    expect(pedido.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    pedido.flush({ message: 'Tu sesión no es válida o expiró' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.token()).toBeNull();
    expect(auth.autenticado()).toBe(false);
    expect(localStorage.getItem('mosaico.sesion')).toBeNull();
    expect(navegar).toHaveBeenCalledOnce();
    expect(navegar).toHaveBeenCalledWith(['/login']);
    http.expectNone(`${API}/refrescar`);
  });

  it('cambiar de ruta no reinicia el contador: el aviso llega a los diez minutos del JWT original', async () => {
    const token = iniciar();
    await vi.advanceTimersByTimeAsync(8 * MINUTO);
    // Navegar es solo cambiar de componente: no hay pedidos ni token nuevo.
    await TestBed.inject(Router).navigateByUrl('/mi-perfil').catch(() => false);
    expect(auth.token()).toBe(token);
    await vi.advanceTimersByTimeAsync(2 * MINUTO - 1);
    expect(modal.actual()).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(modal.actual()?.titulo).toBe('Tu sesión está por vencer');
    expect(auth.token()).toBe(token);
    http.expectNone(`${API}/refrescar`);
    http.expectNone(`${API}/autorizar`);
  });

  it('al aceptar renueva con el JWT vigente y programa otro aviso con el token nuevo', async () => {
    const token = iniciar();
    await vi.advanceTimersByTimeAsync(10 * MINUTO);
    modal.cerrar(true);
    await Promise.resolve();
    const solicitud = http.expectOne(`${API}/refrescar`);
    expect(solicitud.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    const nuevo = tokenDePrueba(); // emitido ahora (diez minutos después): es un JWT distinto
    solicitud.flush({ usuario: usuarioDePrueba({ nombre: 'Actualizada' }), token: nuevo });
    expect(nuevo).not.toBe(token);
    expect(auth.token()).toBe(nuevo);
    expect(JSON.parse(localStorage.getItem('mosaico.sesion')!).token).toBe(nuevo);
    expect(auth.usuario()?.nombre).toBe('Actualizada');
    await vi.advanceTimersByTimeAsync(10 * MINUTO);
    expect(modal.actual()?.titulo).toBe('Tu sesión está por vencer');
    expect(auth.tokenVigente()).toBe(true);
  });

  it('al recargar con doce minutos muestra el aviso inmediatamente y conserva el vencimiento original', async () => {
    iniciar(12);
    expect(modal.actual()?.titulo).toBe('Tu sesión está por vencer');
    modal.cerrar(false);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(3 * MINUTO);
    // Venció el JWT original, pero la sesión local sigue hasta que el backend responda 401.
    expect(auth.tokenVigente()).toBe(false);
    expect(auth.autenticado()).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('no repite el aviso para un token ya avisado después de una recarga', () => {
    const token = tokenDePrueba(Date.now() - 12 * MINUTO);
    localStorage.setItem('mosaico.aviso', token);
    iniciar(12);
    expect(modal.actual()).toBeNull();
    expect(auth.autenticado()).toBe(true);
  });

  it('cerrar la pestaña no borra la sesión: al volver con el JWT vigente se recupera y se valida con el backend', () => {
    const token = iniciar(3);
    expect(localStorage.getItem('mosaico.sesion')).not.toBeNull();
    // Se simula cerrar la pestaña: los servicios se destruyen pero localStorage no se toca.
    TestBed.resetTestingModule();
    configurar();
    auth = TestBed.inject(AuthService);
    expect(auth.token()).toBe(token); // sesión recuperada del almacenamiento
    expect(auth.autenticado()).toBe(false); // todavía sin validar
    auth.autorizar().subscribe();
    http.expectOne(`${API}/autorizar`).flush(usuarioDePrueba());
    expect(auth.autenticado()).toBe(true);
    expect(auth.tokenVigente()).toBe(true); // conserva el tiempo REAL que le quedaba (12 de 15 minutos)
  });

  it('volver con el JWT vencido: el backend lo rechaza con 401 y se limpia la sesión guardada', () => {
    const token = tokenDePrueba(Date.now() - 20 * MINUTO);
    localStorage.setItem('mosaico.sesion', JSON.stringify({ usuario: usuarioDePrueba(), token }));
    auth = TestBed.inject(AuthService);
    auth.autorizar().subscribe({ error: () => {} });
    http.expectOne(`${API}/autorizar`).flush(null, { status: 401, statusText: 'Unauthorized' });
    // /auth/autorizar resuelve su 401 en app.ts (llama a logout); el interceptor no navega por su cuenta.
    expect(navegar).not.toHaveBeenCalled();
    expect(auth.autenticado()).toBe(false);
    http.expectNone(`${API}/refrescar`);
  });

  it('al volver de una suspensión con el JWT vencido no cierra la sesión, no renueva ni muestra el aviso', () => {
    iniciar();
    vi.setSystemTime(Date.now() + 16 * MINUTO);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(auth.autenticado()).toBe(true);
    expect(modal.actual()).toBeNull();
    expect(navegar).not.toHaveBeenCalled();
    http.expectNone(`${API}/refrescar`);
  });

  it('un modal sin responder se cierra al vencer el JWT, sin cerrar la sesión ni permitir renovar tarde', async () => {
    const token = iniciar();
    await vi.advanceTimersByTimeAsync(10 * MINUTO);
    expect(modal.actual()?.titulo).toBe('Tu sesión está por vencer');
    await vi.advanceTimersByTimeAsync(5 * MINUTO);
    expect(modal.actual()).toBeNull();
    expect(auth.token()).toBe(token);
    expect(auth.autenticado()).toBe(true);
    await Promise.resolve();
    http.expectNone(`${API}/refrescar`);
  });

  it('evita renovaciones simultáneas y no reabre una sesión cerrada durante el pedido', () => {
    iniciar();
    auth.refrescar().subscribe();
    const error = vi.fn();
    auth.refrescar().subscribe({ error });
    expect(error).toHaveBeenCalledOnce();
    const solicitud = http.expectOne(`${API}/refrescar`);
    auth.logout();
    solicitud.flush({ usuario: usuarioDePrueba(), token: tokenDePrueba() });
    expect(auth.autenticado()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('un 401 al extender cierra la sesión sin repetir la petición', async () => {
    iniciar();
    await vi.advanceTimersByTimeAsync(10 * MINUTO);
    modal.cerrar(true);
    await Promise.resolve();
    http.expectOne(`${API}/refrescar`).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(auth.autenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledOnce();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('un error de red al extender conserva la sesión', async () => {
    iniciar();
    await vi.advanceTimersByTimeAsync(10 * MINUTO);
    modal.cerrar(true);
    await Promise.resolve();
    http.expectOne(`${API}/refrescar`).error(new ProgressEvent('error'));
    expect(auth.autenticado()).toBe(true);
    expect(modal.actual()?.titulo).toBe('No pudimos extender tu sesión');
    await vi.advanceTimersByTimeAsync(5 * MINUTO);
    expect(auth.autenticado()).toBe(true); // un error de conexión no es un 401
    expect(navegar).not.toHaveBeenCalled();
  });

  it('no consulta para renovar un token vencido ni muestra un modal sin sesión', () => {
    iniciar();
    vi.setSystemTime(Date.now() + 16 * MINUTO);
    const error = vi.fn();
    auth.refrescar().subscribe({ error });
    expect(error).toHaveBeenCalledOnce();
    http.expectNone(`${API}/refrescar`);
    auth.logout();
    auth.comprobarVencimiento();
    expect(modal.actual()).toBeNull();
  });
});
