import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { Login } from './login';

describe('Login (pantalla)', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let modal: ModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), AuthService, ModalService],
    });
    fixture = TestBed.createComponent(Login);
    http = TestBed.inject(HttpTestingController);
    modal = TestBed.inject(ModalService);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    modal.cerrar();
  });

  it('muestra Contraseña incorrecta para credenciales inválidas', () => {
    const elemento = fixture.nativeElement as HTMLElement;
    (fixture.componentInstance as any).form.setValue({ usuario: 'ana', password: 'Abcd1234' });
    elemento.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/auth/login`).flush(
      { message: 'Credenciales inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    expect(modal.actual()?.mensaje).toBe('Contraseña incorrecta');
  });
});
