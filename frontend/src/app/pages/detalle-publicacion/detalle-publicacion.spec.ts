import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import {
  authDePrueba,
  comentarioDePrueba,
  paginadoDePrueba,
  publicacionDePrueba,
  usuarioDePrueba,
} from '../../testing/fixtures';
import { DetallePublicacion } from './detalle-publicacion';

const API = `${environment.apiUrl}/publicaciones/p1`;

describe('Detalle de publicación', () => {
  let fixture: ComponentFixture<DetallePublicacion>;
  let http: HttpTestingController;
  const elemento = () => fixture.nativeElement as HTMLElement;
  const boton = (texto: string) =>
    Array.from(elemento().querySelectorAll<HTMLButtonElement>('button')).find((boton) =>
      boton.textContent!.includes(texto),
    )!;
  const bloque = (inicio: number, cantidad = 5) =>
    Array.from({ length: cantidad }, (_, indice) =>
      comentarioDePrueba({ id: `c${inicio + indice}`, mensaje: `Mensaje ${inicio + indice}` }),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'p1' }) } },
        },
        { provide: AuthService, useValue: authDePrueba(usuarioDePrueba()) },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetallePublicacion);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  function abrir(comentarios = bloque(0), total = 12) {
    http.expectOne(API).flush(publicacionDePrueba({ imagen: 'https://imagen.example/foto.jpg' }));
    const pedido = http.expectOne((r) => r.url === `${API}/comentarios`);
    expect(pedido.request.params.get('limit')).toBe('5');
    expect(pedido.request.params.get('offset')).toBe('0');
    pedido.flush(
      paginadoDePrueba(comentarios, { limit: 5, total, hasMore: comentarios.length < total }),
    );
    fixture.detectChanges();
  }

  function escribir(mensaje: string) {
    const texto = elemento().querySelector<HTMLTextAreaElement>('textarea')!;
    texto.value = mensaje;
    texto.dispatchEvent(new Event('input'));
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('muestra la publicación ampliada, imagen, autor, fecha, likes y cinco comentarios', () => {
    abrir();
    expect(elemento().querySelector('h1')!.textContent).toContain('Mi publicación');
    expect(elemento().querySelector('.imagen img')).not.toBeNull();
    expect(elemento().textContent).toContain('2 Me gusta');
    expect(elemento().querySelectorAll('li.comentario')).toHaveLength(5);
    expect(elemento().querySelectorAll('.autor')).toHaveLength(6);
    expect(elemento().querySelectorAll('time')).toHaveLength(6);
    expect(boton('Cargar más comentarios')).toBeTruthy();
  });

  it('acumula bloques de cinco, evita duplicados y solicitudes simultáneas y respeta hasMore', () => {
    abrir();
    boton('Cargar más comentarios').click();
    boton('Cargar más comentarios').click();
    const segundo = http.expectOne((r) => r.url === `${API}/comentarios`);
    expect(segundo.request.params.get('offset')).toBe('5');
    segundo.flush(
      paginadoDePrueba([comentarioDePrueba({ id: 'c4' }), ...bloque(5, 4)], {
        offset: 5,
        limit: 5,
        total: 12,
        hasMore: true,
      }),
    );
    fixture.detectChanges();
    expect(elemento().querySelectorAll('li.comentario')).toHaveLength(9);
    boton('Cargar más comentarios').click();
    const tercero = http.expectOne((r) => r.url === `${API}/comentarios`);
    expect(tercero.request.params.get('offset')).toBe('10');
    tercero.flush(paginadoDePrueba(bloque(10, 2), { offset: 10, total: 12, hasMore: false }));
    fixture.detectChanges();
    expect(elemento().querySelectorAll('li.comentario')).toHaveLength(11);
    expect(boton('Cargar más comentarios')).toBeUndefined();
  });

  it('conserva los comentarios ante un error de paginación y reintenta el mismo offset', () => {
    abrir();
    boton('Cargar más comentarios').click();
    http.expectOne((r) => r.url === `${API}/comentarios`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(elemento().querySelectorAll('li.comentario')).toHaveLength(5);
    expect(elemento().querySelector('h1')).not.toBeNull();
    boton('Reintentar comentarios').click();
    const pedido = http.expectOne((r) => r.url === `${API}/comentarios`);
    expect(pedido.request.params.get('offset')).toBe('5');
    pedido.flush(paginadoDePrueba(bloque(5, 2), { offset: 5, total: 7 }));
  });

  it('crea al principio después de la confirmación y desplaza correctamente el siguiente offset', () => {
    abrir();
    escribir('  Nuevo  ');
    const creado = http.expectOne(`${API}/comentarios`);
    expect(creado.request.method).toBe('POST');
    expect(creado.request.body).toEqual({ mensaje: 'Nuevo' });
    expect(elemento().querySelectorAll('li.comentario')).toHaveLength(5);
    expect(boton('Guardando').disabled).toBe(true);
    creado.flush(
      comentarioDePrueba({ id: 'nuevo', mensaje: 'Nuevo', autor: publicacionDePrueba().autor }),
    );
    fixture.detectChanges();
    expect(elemento().querySelector('li.comentario')!.textContent).toContain('Nuevo');
    expect(elemento().querySelector<HTMLTextAreaElement>('textarea')!.value).toBe('');
    boton('Cargar más comentarios').click();
    const pedido = http.expectOne((r) => r.url === `${API}/comentarios`);
    expect(pedido.request.params.get('offset')).toBe('6');
    pedido.flush(paginadoDePrueba(bloque(5, 5), { offset: 6, total: 13, hasMore: true }));
  });

  it('solo ofrece editar comentarios propios; actualiza el texto e indicador sin cambiar la fecha o posición', () => {
    const propio = comentarioDePrueba({ id: 'propio', autor: publicacionDePrueba().autor });
    abrir([comentarioDePrueba(), propio], 2);
    expect(elemento().querySelectorAll('button.editar')).toHaveLength(1);
    const fecha = elemento().querySelectorAll('li.comentario time')[1].getAttribute('datetime');
    boton('Editar').click();
    escribir('Cambio confirmado');
    const pedido = http.expectOne(`${API}/comentarios/propio`);
    expect(pedido.request.method).toBe('PUT');
    expect(elemento().querySelectorAll('li.comentario')[1].textContent).not.toContain(
      'Cambio confirmado',
    );
    pedido.flush({ ...propio, mensaje: 'Cambio confirmado', modificado: true });
    fixture.detectChanges();
    expect(elemento().querySelectorAll('li.comentario')[1].textContent).toContain(
      'Cambio confirmado',
    );
    expect(elemento().querySelectorAll('li.comentario')[1].textContent).toContain('Editado');
    expect(elemento().querySelectorAll('li.comentario time')[1].getAttribute('datetime')).toBe(
      fecha,
    );
  });

  it.each(['', '    ', 'a'.repeat(501)])('impide enviar un texto inválido', (texto) => {
    abrir([], 0);
    escribir(texto);
    http.expectNone((r) => r.method === 'POST');
    expect(elemento().querySelector('[role="alert"]')).not.toBeNull();
  });

  it('un error al guardar mantiene el formulario, el detalle y los comentarios', () => {
    abrir();
    escribir('Mi texto');
    http
      .expectOne(`${API}/comentarios`)
      .flush({ message: 'No se pudo guardar' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(elemento().querySelector('h1')).not.toBeNull();
    expect(elemento().querySelectorAll('li.comentario')).toHaveLength(5);
    expect(elemento().querySelector<HTMLTextAreaElement>('textarea')!.value).toBe('Mi texto');
    expect(elemento().textContent).toContain('No se pudo guardar');
  });

  it('informa un 404 del detalle y permite reintentar', () => {
    http
      .expectOne(API)
      .flush({ message: 'La publicación no existe' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(elemento().textContent).toContain('La publicación no existe');
    boton('Reintentar').click();
    abrir([], 0);
  });

  it('cancela la petición en curso al destruir el componente', () => {
    const pedido = http.expectOne(API);
    fixture.destroy();
    expect(pedido.cancelled).toBe(true);
  });
});
