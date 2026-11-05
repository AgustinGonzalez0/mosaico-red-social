import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { SoloAdminDirective } from './solo-admin.directive';
import { ResaltarEstadoDirective } from './resaltar-estado.directive';
import { AutoFocoDirective } from './auto-foco.directive';
import { AuthService } from '../../core/services/auth.service';

@Component({ template: '<span *appSoloAdmin>admin</span><span [appResaltarEstado]="false">estado</span><input appAutoFoco>' , imports: [SoloAdminDirective, ResaltarEstadoDirective, AutoFocoDirective] }) class Host {}
describe('Directivas propias', () => {
  it('muestra solo admin y aplica estado visual', () => { TestBed.configureTestingModule({ imports: [Host], providers: [{ provide: AuthService, useValue: { usuario: () => ({ perfil: 'administrador' }) } }] }); const fixture = TestBed.createComponent(Host); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('admin'); expect(fixture.debugElement.query(By.css('.estado-deshabilitado'))).toBeTruthy(); });
  it('enfoca el campo marcado', async () => { TestBed.configureTestingModule({ imports: [Host], providers: [{ provide: AuthService, useValue: { usuario: () => null } }] }); const fixture = TestBed.createComponent(Host); fixture.detectChanges(); await Promise.resolve(); expect(document.activeElement).toBe(fixture.nativeElement.querySelector('input')); });
});
