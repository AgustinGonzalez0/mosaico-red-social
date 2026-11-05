import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';
import { Login } from './pages/login/login';
import { MiPerfil } from './pages/mi-perfil/mi-perfil';
import { Publicaciones } from './pages/publicaciones/publicaciones';
import { Registro } from './pages/registro/registro';
import { DetallePublicacion } from './pages/detalle-publicacion/detalle-publicacion';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { DashboardUsuarios } from './pages/dashboard-usuarios/dashboard-usuarios';
import { DashboardEstadisticas } from './pages/dashboard-estadisticas/dashboard-estadisticas';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login, title: 'Iniciar sesión · Mosaico' },
  { path: 'registro', component: Registro, title: 'Crear cuenta · Mosaico' },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'publicaciones', component: Publicaciones, title: 'Publicaciones · Mosaico' },
      { path: 'mi-perfil', component: MiPerfil, title: 'Mi perfil · Mosaico' },
      { path: 'publicaciones/:id', component: DetallePublicacion, title: 'Detalle' },
      { path: 'dashboard/usuarios', component: DashboardUsuarios, canActivate: [adminGuard], title: 'Usuarios · Mosaico' },
      { path: 'dashboard/estadisticas', component: DashboardEstadisticas, canActivate: [adminGuard], title: 'Estadísticas · Mosaico' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
