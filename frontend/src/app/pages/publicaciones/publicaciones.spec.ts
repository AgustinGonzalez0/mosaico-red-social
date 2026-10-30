import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { CrearPublicacion } from '../../shared/crear-publicacion/crear-publicacion';
import { PostCard } from '../../shared/post-card/post-card';
import { authDePrueba, paginadoDePrueba, publicacionDePrueba, usuarioDePrueba } from '../../testing/fixtures';
import { Publicaciones } from './publicaciones';

const API = `${environment.apiUrl}/publicaciones`;

describe('Publicaciones (pantalla)', () => {
  let fixture: ComponentFixture<Publicaciones>;
  let http: HttpTestingController;

  beforeEach(() => {
    window.scrollTo = vi.fn(); // jsdom no implementa scrollTo
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authDePrueba(usuarioDePrueba()) },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Publicaciones);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const el = () => fixture.nativeElement as HTMLElement;
  const tarjetas = () => el().querySelectorAll('app-post-card');
  const boton = (texto: string) =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.includes(texto))!;
  const pedido = () => http.expectOne((r) => r.url === API);

  function responder(req: TestRequest, titulos: string[], total = titulos.length) {
    const data = titulos.map((titulo, i) => publicacionDePrueba({ id: `${titulo}-${i}`, titulo }));
    req.flush(paginadoDePrueba(data, { total }));
    fixture.detectChanges();
  }

  it('al abrir pide al backend la primera página ordenada por fecha', () => {
    const req = pedido();
    expect(req.request.params.get('orden')).toBe('fecha');
    expect(req.request.params.get('offset')).toBe('0');
    expect(req.request.params.get('limit')).toBe('3');
    expect(el().querySelectorAll('.esqueleto').length).toBeGreaterThan(0); // indicador de carga

    responder(req, ['a', 'b', 'c']);
    expect(tarjetas()).toHaveLength(3); // una tarjeta (componente) por publicación
    expect(el().querySelectorAll('.esqueleto')).toHaveLength(0);
  });

  it('al cambiar a "Más populares" vuelve a consultar al backend (no reordena en el cliente)', () => {
    responder(pedido(), ['a', 'b']);
    boton('Más populares').click();
    fixture.detectChanges();

    const req = pedido();
    expect(req.request.params.get('orden')).toBe('meGusta');
    expect(req.request.params.get('offset')).toBe('0');
    responder(req, ['b', 'a']);
    expect(boton('Más populares').getAttribute('aria-pressed')).toBe('true');
    expect(boton('Más recientes').getAttribute('aria-pressed')).toBe('false');
    expect(Array.from(tarjetas()).map((t) => t.querySelector('h3')!.textContent)).toEqual(['b', 'a']);
  });

  it('pagina con offset y limit y muestra en qué página está', () => {
    responder(pedido(), ['a'], 9);
    expect(el().querySelector('.paginacion')!.textContent).toContain('Página 1 de 3');
    expect(boton('Anterior').disabled).toBe(true);

    boton('Siguiente').click();
    fixture.detectChanges();
    const segunda = pedido();
    expect(segunda.request.params.get('offset')).toBe('3');
    expect(segunda.request.params.get('limit')).toBe('3');
    responder(segunda, ['b'], 9);
    expect(el().querySelector('.paginacion')!.textContent).toContain('Página 2 de 3');

    boton('Siguiente').click();
    fixture.detectChanges();
    expect(pedido().request.params.get('offset')).toBe('6');
  });

  it('no muestra paginación si todo entra en una página', () => {
    responder(pedido(), ['a', 'b'], 2);
    expect(el().querySelector('.paginacion')).toBeNull();
  });

  it('al cambiar el orden vuelve a la primera página', () => {
    responder(pedido(), ['a'], 30);
    boton('Siguiente').click();
    fixture.detectChanges();
    responder(pedido(), ['b'], 30);

    boton('Más populares').click();
    fixture.detectChanges();
    const req = pedido();
    expect(req.request.params.get('offset')).toBe('0');
    expect(req.request.params.get('orden')).toBe('meGusta');
    responder(req, ['c'], 30);
  });

  it('descarta la respuesta vieja si el usuario cambia el orden antes de que llegue', () => {
    const primera = pedido();
    responder(primera, ['a']);

    boton('Más populares').click();
    fixture.detectChanges();
    const populares = pedido();
    boton('Más recientes').click(); // cambia otra vez, sin esperar
    fixture.detectChanges();
    const recientes = pedido();

    expect(populares.cancelled).toBe(true);
    responder(recientes, ['reciente']);
    expect(Array.from(tarjetas()).map((t) => t.querySelector('h3')!.textContent)).toEqual(['reciente']);
  });

  it('muestra un estado vacío cuando no hay publicaciones', () => {
    responder(pedido(), []);
    expect(tarjetas()).toHaveLength(0);
    expect(el().textContent).toContain('Todavía no hay publicaciones');
  });

  it('muestra el error del servidor, permite reintentar y ofrece iniciar sesión si el token no sirve', () => {
    pedido().flush({ message: 'Tu sesión no es válida o expiró' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(el().querySelector('.aviso.error')!.textContent).toContain('Tu sesión no es válida o expiró');
    expect(el().querySelector('a[href="/login"]')).not.toBeNull();

    boton('Reintentar').click();
    fixture.detectChanges();
    responder(pedido(), ['a']);
    expect(el().querySelector('.aviso.error')).toBeNull();
    expect(tarjetas()).toHaveLength(1);
  });

  it('al eliminar una publicación la saca de la lista y refresca la página', () => {
    responder(pedido(), ['a', 'b'], 2);
    const tarjeta = fixture.debugElement.query(By.directive(PostCard)).componentInstance as PostCard;
    tarjeta.eliminada.emit('a-0');
    fixture.detectChanges();

    expect(tarjetas()).toHaveLength(1);
    responder(pedido(), ['b'], 1);
    expect(tarjetas()).toHaveLength(1);
  });

  it('si la página actual queda vacía retrocede a la última que exista', () => {
    responder(pedido(), ['a'], 4);
    boton('Siguiente').click();
    fixture.detectChanges();
    responder(pedido(), ['solo'], 4);

    const tarjeta = fixture.debugElement.query(By.directive(PostCard)).componentInstance as PostCard;
    tarjeta.eliminada.emit('solo-0');
    fixture.detectChanges();
    responder(pedido(), [], 3); // la página 2 quedó vacía

    const req = pedido();
    expect(req.request.params.get('offset')).toBe('0');
    responder(req, ['a'], 3);
    expect(el().querySelector('.paginacion')).toBeNull();
  });

  it('abre el formulario de creación y, al crear, vuelve a la primera página por fecha', () => {
    responder(pedido(), ['a']);
    boton('Crear publicación').click();
    fixture.detectChanges();

    const formulario = fixture.debugElement.query(By.directive(CrearPublicacion));
    expect(formulario).not.toBeNull();

    (formulario.componentInstance as CrearPublicacion).creada.emit(publicacionDePrueba());
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(CrearPublicacion))).toBeNull();

    const req = pedido();
    expect(req.request.params.get('orden')).toBe('fecha');
    expect(req.request.params.get('offset')).toBe('0');
    responder(req, ['nueva', 'a']);
    expect(tarjetas()).toHaveLength(2);
    TestBed.inject(ModalService).cerrar();
  });
});
