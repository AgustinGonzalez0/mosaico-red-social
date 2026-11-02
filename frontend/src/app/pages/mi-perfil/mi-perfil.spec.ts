import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import {
  authDePrueba,
  comentarioDePrueba,
  paginadoDePrueba,
  publicacionDePrueba,
  usuarioDePrueba,
} from '../../testing/fixtures';
import { MiPerfil } from './mi-perfil';
import { PostCard } from '../../shared/post-card/post-card';

const API = `${environment.apiUrl}/publicaciones`;

describe('MiPerfil', () => {
  let fixture: ComponentFixture<MiPerfil>;
  let http: HttpTestingController;

  function crear(conSesion = true) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authDePrueba(conSesion ? usuarioDePrueba() : null) },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MiPerfil);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  const el = () => fixture.nativeElement as HTMLElement;
  const posts = (ids: string[], total = ids.length) =>
    paginadoDePrueba(
      ids.map((id) => publicacionDePrueba({ id, titulo: `Título ${id}` })),
      { total, limit: 3 },
    );

  it('muestra los datos del usuario', () => {
    crear();
    http.expectOne((r) => r.url === API).flush(posts([]));
    fixture.detectChanges();

    expect(el().querySelector('h1')!.textContent).toContain('Ana Pérez');
    expect(el().textContent).toContain('@ana');
    expect(el().textContent).toContain('ana@test.com');
    expect(el().textContent).toContain('Usuario');
    expect(el().querySelector('.inicial')!.textContent).toContain('AP'); // sin foto: iniciales
  });

  it('pide al backend solo las últimas 3 publicaciones del usuario autenticado', () => {
    crear();
    const req = http.expectOne((r) => r.url === API);
    expect(req.request.params.get('autor')).toBe('u1');
    expect(req.request.params.get('limit')).toBe('3');
    expect(req.request.params.get('orden')).toBe('fecha');
    req.flush(posts([]));
  });

  it('muestra cada publicación con sus comentarios (los más recientes que trae el backend)', () => {
    crear();
    http.expectOne((r) => r.url === API).flush(posts(['p1', 'p2', 'p3'], 7));

    http
      .expectOne((r) => r.url === `${API}/p1/comentarios`)
      .flush(
        paginadoDePrueba(
          [
            comentarioDePrueba({ mensaje: 'Genial' }),
            comentarioDePrueba({ id: 'c2', mensaje: 'Linda', modificado: true }),
          ],
          { total: 2 },
        ),
      );
    http.expectOne((r) => r.url === `${API}/p2/comentarios`).flush(paginadoDePrueba([]));
    http
      .expectOne((r) => r.url === `${API}/p3/comentarios`)
      .flush(paginadoDePrueba([comentarioDePrueba()], { total: 9, hasMore: true }));
    fixture.detectChanges();

    expect(el().querySelectorAll('app-post-card')).toHaveLength(3);
    const paneles = el().querySelectorAll('.comentarios');
    expect(paneles[0].textContent).toContain('Genial');
    expect(paneles[0].textContent).toContain('(editado)');
    expect(paneles[1].textContent).toContain('Todavía no hay comentarios');
    expect(paneles[2].textContent).toContain('Mostrando los 1 más recientes de 9');
    expect(el().textContent).toContain('Publicaciones'); // total de publicaciones del usuario
    expect(el().querySelector('.datos')!.textContent).toContain('7');
  });

  it('muestra un estado vacío y no pide comentarios si no hay publicaciones', () => {
    crear();
    http.expectOne((r) => r.url === API).flush(posts([]));
    fixture.detectChanges();
    expect(el().textContent).toContain('Todavía no publicaste nada');
    expect(el().querySelectorAll('app-post-card')).toHaveLength(0);
  });

  it('si fallan los comentarios de una publicación igual muestra el resto', () => {
    crear();
    http.expectOne((r) => r.url === API).flush(posts(['p1', 'p2']));
    http
      .expectOne((r) => r.url === `${API}/p1/comentarios`)
      .flush(null, { status: 500, statusText: 'Error' });
    http
      .expectOne((r) => r.url === `${API}/p2/comentarios`)
      .flush(paginadoDePrueba([comentarioDePrueba()]));
    fixture.detectChanges();

    expect(el().querySelectorAll('app-post-card')).toHaveLength(2);
    const paneles = el().querySelectorAll('.comentarios');
    expect(paneles[0].textContent).toContain('No pudimos cargar los comentarios');
    expect(paneles[1].textContent).toContain('Qué buena idea');
  });

  it('muestra el error y permite reintentar', () => {
    crear();
    http
      .expectOne((r) => r.url === API)
      .flush({ message: 'Tu sesión expiró' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(el().querySelector('[role="alert"]')!.textContent).toContain('Tu sesión expiró');

    el().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    http.expectOne((r) => r.url === API).flush(posts([]));
    fixture.detectChanges();
    expect(el().querySelector('[role="alert"]')).toBeNull();
  });

  it('sin sesión invita a iniciar sesión y no consulta nada', () => {
    crear(false);
    expect(el().textContent).toContain('Todavía no iniciaste sesión');
    http.expectNone(API);
  });

  it('eliminar una publicación vuelve a pedir las últimas tres y actualiza el total', () => {
    crear();
    http.expectOne((r) => r.url === API).flush(posts(['p1']));
    http.expectOne((r) => r.url === `${API}/p1/comentarios`).flush(paginadoDePrueba([]));
    fixture.detectChanges();
    const tarjeta = fixture.debugElement.query(By.directive(PostCard))
      .componentInstance as PostCard;
    tarjeta.eliminada.emit('p1');
    const pedido = http.expectOne((r) => r.url === API);
    expect(pedido.request.params.get('limit')).toBe('3');
    pedido.flush(posts([]));
    fixture.detectChanges();
    expect(el().querySelectorAll('app-post-card')).toHaveLength(0);
    expect(el().querySelector('.datos')!.textContent).toContain('0');
  });

  it('destruir el componente cancela las consultas de comentarios pendientes', () => {
    crear();
    http.expectOne((r) => r.url === API).flush(posts(['p1']));
    const pedido = http.expectOne((r) => r.url === `${API}/p1/comentarios`);
    fixture.destroy();
    expect(pedido.cancelled).toBe(true);
  });
});
