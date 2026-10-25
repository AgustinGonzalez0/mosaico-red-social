import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Publicacion } from '../../core/models/publicacion.model';
import { ModalService } from '../../core/services/modal.service';
import { publicacionDePrueba } from '../../testing/fixtures';
import { CrearPublicacion } from './crear-publicacion';

const API = `${environment.apiUrl}/publicaciones`;

function archivo(nombre: string, tipo: string, bytes = 10) {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

describe('CrearPublicacion', () => {
  let fixture: ComponentFixture<CrearPublicacion>;
  let http: HttpTestingController;
  let modal: ModalService;
  let creadas: Publicacion[];
  let cierres: number;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:vista-previa');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    modal = TestBed.inject(ModalService);
    fixture = TestBed.createComponent(CrearPublicacion);
    creadas = [];
    cierres = 0;
    fixture.componentInstance.creada.subscribe((p) => creadas.push(p));
    fixture.componentInstance.cerrar.subscribe(() => cierres++);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const el = () => fixture.nativeElement as HTMLElement;
  const input = (id: string) => el().querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
  const boton = (texto: string) =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.includes(texto))!;

  function escribir(titulo: string, mensaje: string) {
    for (const [id, valor] of [['titulo', titulo], ['mensaje', mensaje]]) {
      input(id).value = valor;
      input(id).dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  }

  function elegir(file: File) {
    const campo = input('imagen') as HTMLInputElement;
    Object.defineProperty(campo, 'files', { value: [file], configurable: true });
    campo.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  const enviar = () => {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  it('pone el foco en el título al abrirse', async () => {
    await fixture.whenStable();
    expect(document.activeElement).toBe(input('titulo'));
  });

  it('no envía y marca los errores si faltan datos', () => {
    enviar();
    expect(el().textContent).toContain('Escribí un título');
    expect(el().textContent).toContain('Escribí un mensaje');
    http.expectNone(API);
  });

  it('rechaza un título o mensaje que son solo espacios', () => {
    escribir('    ', '   ');
    enviar();
    expect(el().textContent).toContain('Escribí un título');
    http.expectNone(API);
  });

  it('envía un FormData con el texto recortado y sin imagen si no se eligió ninguna', () => {
    escribir('  Mi título  ', '  Mi mensaje ');
    enviar();

    const req = http.expectOne(API);
    expect(req.request.method).toBe('POST');
    const datos = req.request.body as FormData;
    expect(datos.get('titulo')).toBe('Mi título');
    expect(datos.get('mensaje')).toBe('Mi mensaje');
    expect(datos.has('imagen')).toBe(false);

    expect(boton('Publicando').disabled).toBe(true); // indicador de carga

    const creada = publicacionDePrueba({ id: 'nueva' });
    req.flush(creada);
    expect(creadas).toEqual([creada]);
    expect(modal.actual()).toMatchObject({ tipo: 'exito' });
  });

  it('adjunta la imagen elegida y muestra su vista previa', () => {
    const foto = archivo('foto.png', 'image/png');
    elegir(foto);
    expect(el().querySelector<HTMLImageElement>('.previa img')!.src).toContain('blob:vista-previa');

    escribir('t', 'm');
    enviar();
    const datos = http.expectOne(API).request.body as FormData;
    expect(datos.get('imagen')).toBe(foto);
  });

  it('permite quitar la imagen elegida', () => {
    elegir(archivo('foto.png', 'image/png'));
    boton('Quitar imagen').click();
    fixture.detectChanges();

    expect(el().querySelector('.previa')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:vista-previa');
    escribir('t', 'm');
    enviar();
    expect((http.expectOne(API).request.body as FormData).has('imagen')).toBe(false);
  });

  it.each([
    ['un PDF', archivo('a.pdf', 'application/pdf'), 'JPG, PNG, WEBP o GIF'],
    ['una imagen de más de 5 MB', archivo('grande.png', 'image/png', 5 * 1024 * 1024 + 1), '5 MB'],
  ])('rechaza %s sin mostrar vista previa', (_nombre, file, mensaje) => {
    elegir(file);
    expect(el().querySelector('.error')!.textContent).toContain(mensaje);
    expect(el().querySelector('.previa')).toBeNull();
  });

  it('muestra el error del backend en un modal y deja el formulario para reintentar', () => {
    escribir('t', 'm');
    enviar();
    http.expectOne(API).flush({ message: 'No se pudo subir la imagen' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(modal.actual()).toMatchObject({ tipo: 'error', mensaje: 'No se pudo subir la imagen' });
    expect(creadas).toHaveLength(0);
    expect(boton('Publicar').disabled).toBe(false);
  });

  it('cierra directamente si no se escribió nada', async () => {
    boton('Cancelar').click();
    await fixture.whenStable();
    expect(cierres).toBe(1);
    expect(modal.actual()).toBeNull();
  });

  it('pide confirmación antes de descartar lo escrito', async () => {
    escribir('algo', '');
    input('titulo').dispatchEvent(new Event('input'));
    fixture.componentInstance['form'].markAsDirty();

    boton('Cancelar').click();
    expect(modal.actual()).toMatchObject({ tipo: 'confirmar', textoCancelar: 'Seguir editando' });
    modal.cerrar(false); // "Seguir editando"
    await fixture.whenStable();
    expect(cierres).toBe(0);

    boton('Cancelar').click();
    modal.cerrar(true); // "Descartar"
    await fixture.whenStable();
    expect(cierres).toBe(1);
  });
});
