import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Publicacion } from '../../core/models/publicacion.model';
import { Usuario } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { authDePrueba, publicacionDePrueba, usuarioDePrueba } from '../../testing/fixtures';
import { PostCard } from './post-card';

const API = `${environment.apiUrl}/publicaciones`;

describe('PostCard', () => {
  let fixture: ComponentFixture<PostCard>;
  let http: HttpTestingController;
  let modal: ModalService;

  function crear(publicacion: Publicacion, usuario: Usuario | null = usuarioDePrueba()) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authDePrueba(usuario) },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    modal = TestBed.inject(ModalService);
    fixture = TestBed.createComponent(PostCard);
    fixture.componentRef.setInput('publicacion', publicacion);
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const corazon = () => el().querySelector<HTMLButtonElement>('.corazon')!;
  const eliminar = () => el().querySelector<HTMLButtonElement>('.eliminar');
  const cantidad = () => el().querySelector('.cantidad')!.textContent!.trim();

  afterEach(() => http.verify());

  it('muestra título, mensaje, autor, fecha y cantidad de me gusta', () => {
    crear(publicacionDePrueba({ titulo: 'Atardecer', mensaje: 'En la costa', meGusta: 5 }));
    expect(el().querySelector('h3')!.textContent).toBe('Atardecer');
    expect(el().textContent).toContain('En la costa');
    expect(el().querySelector('.nombre')!.textContent).toBe('ana');
    expect(el().querySelector('time')!.textContent).toContain('2026');
    expect(cantidad()).toBe('5');
  });

  describe('me gusta', () => {
    it('envía POST, y recién cuando el backend confirma muestra el like activo', () => {
      crear(publicacionDePrueba({ meGusta: 2, leGusta: false }));
      expect(corazon().getAttribute('aria-pressed')).toBe('false');

      corazon().click();
      const req = http.expectOne(`${API}/p1/me-gusta`);
      expect(req.request.method).toBe('POST');
      expect(cantidad()).toBe('2'); // todavía sin confirmar

      req.flush({ meGusta: 3, leGusta: true });
      fixture.detectChanges();
      expect(cantidad()).toBe('3');
      expect(corazon().getAttribute('aria-pressed')).toBe('true');
      expect(corazon().classList).toContain('activo');
    });

    it('envía DELETE cuando el usuario ya había dado me gusta', () => {
      crear(publicacionDePrueba({ meGusta: 3, leGusta: true }));

      corazon().click();
      const req = http.expectOne(`${API}/p1/me-gusta`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ meGusta: 2, leGusta: false });
      fixture.detectChanges();

      expect(cantidad()).toBe('2');
      expect(corazon().getAttribute('aria-pressed')).toBe('false');
    });

    it('bloquea la tarjeta mientras hay una operación en curso (un solo pedido)', () => {
      crear(publicacionDePrueba());
      corazon().click();
      fixture.detectChanges();
      expect(corazon().disabled).toBe(true);

      corazon().click(); // un botón deshabilitado no dispara el evento
      http.expectOne(`${API}/p1/me-gusta`).flush({ meGusta: 3, leGusta: true });
      fixture.detectChanges();
      expect(corazon().disabled).toBe(false);
    });

    it('ante un error conserva el estado y avisa con un modal', () => {
      crear(publicacionDePrueba({ meGusta: 2, leGusta: false }));
      corazon().click();
      http
        .expectOne(`${API}/p1/me-gusta`)
        .flush(
          { message: 'Ya le diste me gusta a esta publicación' },
          { status: 409, statusText: 'Conflict' },
        );
      fixture.detectChanges();

      expect(cantidad()).toBe('2');
      expect(corazon().getAttribute('aria-pressed')).toBe('false');
      expect(modal.actual()).toMatchObject({
        tipo: 'error',
        mensaje: 'Ya le diste me gusta a esta publicación',
      });
      expect(corazon().disabled).toBe(false);
    });

    it('vuelve a tomar los valores del backend si el padre entrega una publicación nueva', () => {
      crear(publicacionDePrueba({ meGusta: 2 }));
      corazon().click();
      http.expectOne(`${API}/p1/me-gusta`).flush({ meGusta: 3, leGusta: true });
      fixture.detectChanges();
      expect(cantidad()).toBe('3');

      fixture.componentRef.setInput(
        'publicacion',
        publicacionDePrueba({ meGusta: 10, leGusta: false }),
      );
      fixture.detectChanges();
      expect(cantidad()).toBe('10');
      expect(corazon().getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('eliminar', () => {
    it('lo ve el autor', () => {
      crear(publicacionDePrueba());
      expect(eliminar()).not.toBeNull();
    });

    it('lo ve un administrador aunque la publicación sea de otro', () => {
      crear(publicacionDePrueba(), usuarioDePrueba({ id: 'admin', perfil: 'administrador' }));
      expect(eliminar()).not.toBeNull();
    });

    it('no lo ve otro usuario ni quien no inició sesión', () => {
      crear(publicacionDePrueba(), usuarioDePrueba({ id: 'otro' }));
      expect(eliminar()).toBeNull();
      TestBed.resetTestingModule();
      crear(publicacionDePrueba(), null);
      expect(eliminar()).toBeNull();
    });

    it('pide confirmación con un modal y, si se acepta, envía DELETE y avisa al padre', async () => {
      crear(publicacionDePrueba());
      const eliminadas: string[] = [];
      fixture.componentInstance.eliminada.subscribe((id) => eliminadas.push(id));

      eliminar()!.click();
      expect(modal.actual()).toMatchObject({ tipo: 'confirmar', textoBoton: 'Eliminar' });
      http.expectNone(`${API}/p1`); // todavía no se eliminó nada

      modal.cerrar(true);
      await fixture.whenStable();
      const req = http.expectOne(`${API}/p1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(eliminadas).toEqual(['p1']);
    });

    it('si el usuario cancela no se envía nada', async () => {
      crear(publicacionDePrueba());
      const eliminadas: string[] = [];
      fixture.componentInstance.eliminada.subscribe((id) => eliminadas.push(id));

      eliminar()!.click();
      modal.cerrar(false);
      await fixture.whenStable();

      http.expectNone(`${API}/p1`);
      expect(eliminadas).toEqual([]);
    });

    it('si el backend rechaza (403) muestra el error y no avisa al padre', async () => {
      crear(publicacionDePrueba());
      const eliminadas: string[] = [];
      fixture.componentInstance.eliminada.subscribe((id) => eliminadas.push(id));

      eliminar()!.click();
      modal.cerrar(true);
      await fixture.whenStable();
      http
        .expectOne(`${API}/p1`)
        .flush(
          { message: 'Solo podés eliminar tus propias publicaciones' },
          { status: 403, statusText: 'Forbidden' },
        );

      expect(eliminadas).toEqual([]);
      expect(modal.actual()).toMatchObject({
        tipo: 'error',
        mensaje: 'Solo podés eliminar tus propias publicaciones',
      });
    });
  });
});
