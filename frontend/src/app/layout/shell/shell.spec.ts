import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { authDePrueba, usuarioDePrueba } from '../../testing/fixtures';
import { Shell } from './shell';

describe('Shell', () => {
  it('muestra el fondo de Mosaico detrás de todas las páginas privadas, una sola vez', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authDePrueba(usuarioDePrueba()) }],
    });
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('app-mosaico-fondo')).toHaveLength(1);
    expect(el.querySelector('router-outlet')).not.toBeNull();
  });
});
