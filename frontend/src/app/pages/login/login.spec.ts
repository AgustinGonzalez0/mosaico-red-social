import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { Login } from './login';

describe('Login (pantalla)', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let modal: ModalService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
        ModalService,
      ],
    });
    fixture = TestBed.createComponent(Login);
    http = TestBed.inject(HttpTestingController);
    modal = TestBed.inject(ModalService);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    modal.cerrar();
    TestBed.inject(AuthService).logout();
  });

  it('muestra Contraseña incorrecta para credenciales inválidas', () => {
    const elemento = fixture.nativeElement as HTMLElement;
    (fixture.componentInstance as any).form.setValue({ usuario: 'ana', password: 'Abcd1234' });
    elemento.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    http
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(modal.actual()?.mensaje).toBe('Contraseña incorrecta');
  });

  it.each([
    [401, 'Tu cuenta está deshabilitada. Contactá a un administrador'],
    [500, 'No se pudo completar la operación'],
  ])(
    'conserva el mensaje del servidor para un error %i que no sea credenciales inválidas',
    (estado, mensaje) => {
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
      (fixture.componentInstance as any).form.setValue({ usuario: 'ana', password: 'Abcd1234' });
      (fixture.nativeElement as HTMLElement)
        .querySelector('form')!
        .dispatchEvent(new Event('submit'));
      http
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush({ message: mensaje }, { status: estado, statusText: 'Error' });
      expect(modal.actual()?.mensaje).toBe(mensaje);
      expect(navegar).not.toHaveBeenCalled();
    },
  );

  it('informa un error de red sin convertirlo en contraseña incorrecta', () => {
    (fixture.componentInstance as any).form.setValue({ usuario: 'ana', password: 'Abcd1234' });
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    http.expectOne(`${environment.apiUrl}/auth/login`).error(new ProgressEvent('error'));
    expect(modal.actual()?.mensaje).toContain('No se pudo conectar con el servidor');
  });
});
