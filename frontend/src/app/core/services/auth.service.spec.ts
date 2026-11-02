import { provideHttpClient, withInterceptors } from '@angular/common/http';
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

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date('2026-11-02T12:00:00Z'));
    localStorage.clear();
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
  });
  afterEach(() => {
    auth?.logout();
    modal.cerrar();
    http.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.useRealTimers();
  });

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

  it('a los diez minutos ofrece extender; Ahora no conserva el token hasta el minuto quince', async () => {
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
    expect(modal.actual()).toBeNull();
    await vi.advanceTimersByTimeAsync(MINUTO);
    expect(auth.token()).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/login']);
    expect(vi.getTimerCount()).toBe(0);
    http.expectNone(`${API}/refrescar`);
  });

  it('al aceptar renueva con el JWT vigente y programa otro aviso con el token nuevo', async () => {
    const token = iniciar();
    await vi.advanceTimersByTimeAsync(10 * MINUTO);
    modal.cerrar(true);
    await Promise.resolve();
    const solicitud = http.expectOne(`${API}/refrescar`);
    expect(solicitud.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    const nuevo = tokenDePrueba();
    solicitud.flush({ usuario: usuarioDePrueba({ nombre: 'Actualizada' }), token: nuevo });
    expect(auth.token()).toBe(nuevo);
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
    expect(auth.autenticado()).toBe(false);
  });

  it('no repite el aviso para un token ya avisado después de una recarga', () => {
    const token = tokenDePrueba(Date.now() - 12 * MINUTO);
    localStorage.setItem('mosaico.aviso', token);
    iniciar(12);
    expect(modal.actual()).toBeNull();
    expect(auth.autenticado()).toBe(true);
  });

  it('al volver de una suspensión comprueba la expiración sin renovar', () => {
    iniciar();
    vi.setSystemTime(Date.now() + 16 * MINUTO);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(auth.autenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/login']);
    http.expectNone(`${API}/refrescar`);
  });

  it('un modal sin responder se cierra al vencer y no permite renovar tarde', async () => {
    iniciar();
    await vi.advanceTimersByTimeAsync(15 * MINUTO);
    expect(modal.actual()).toBeNull();
    expect(auth.token()).toBeNull();
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
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('un error de red al extender conserva la sesión hasta su vencimiento real', async () => {
    iniciar();
    await vi.advanceTimersByTimeAsync(10 * MINUTO);
    modal.cerrar(true);
    await Promise.resolve();
    http.expectOne(`${API}/refrescar`).error(new ProgressEvent('error'));
    expect(auth.autenticado()).toBe(true);
    expect(modal.actual()?.titulo).toBe('No pudimos extender tu sesión');
    await vi.advanceTimersByTimeAsync(5 * MINUTO);
    expect(auth.autenticado()).toBe(false);
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
