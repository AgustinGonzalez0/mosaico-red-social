import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Modal } from './shared/modal/modal';

@Component({
  imports: [RouterOutlet, Modal],
  selector: 'app-root',
  template: `
    <router-outlet />
    <app-modal />
  `,
})
export class App {}
