// Datos de prueba compartidos por los specs (no se importa desde la app, así que no entra al bundle).
import { signal } from '@angular/core';
import { Comentario, Paginado, Publicacion } from '../core/models/publicacion.model';
import { Usuario } from '../core/models/usuario.model';

export function usuarioDePrueba(cambios: Partial<Usuario> = {}): Usuario {
  return {
    id: 'u1',
    nombre: 'Ana',
    apellido: 'Pérez',
    correo: 'ana@test.com',
    nombreUsuario: 'ana',
    fechaNacimiento: '2000-01-01T00:00:00.000Z',
    descripcion: 'Hola',
    imagenPerfil: null,
    perfil: 'usuario',
    habilitado: true,
    ...cambios,
  };
}

export function publicacionDePrueba(cambios: Partial<Publicacion> = {}): Publicacion {
  return {
    id: 'p1',
    titulo: 'Mi publicación',
    mensaje: 'Un mensaje',
    imagen: null,
    ancho: null,
    alto: null,
    autor: { id: 'u1', nombreUsuario: 'ana', imagenPerfil: null },
    meGusta: 2,
    leGusta: false,
    createdAt: '2026-10-25T18:00:00.000Z',
    ...cambios,
  };
}

export function paginadoDePrueba<T>(data: T[], extra: Partial<Paginado<T>> = {}): Paginado<T> {
  return { data, total: data.length, offset: 0, limit: 3, hasMore: false, ...extra };
}

export function comentarioDePrueba(cambios: Partial<Comentario> = {}): Comentario {
  return {
    id: 'c1',
    mensaje: 'Qué buena idea',
    modificado: false,
    autor: { id: 'u2', nombreUsuario: 'beto', imagenPerfil: null },
    createdAt: '2026-10-26T10:00:00.000Z',
    ...cambios,
  };
}

/** Reemplazo de AuthService para los specs: expone la misma API que usan los componentes. */
export function authDePrueba(usuario: Usuario | null, token: string | null = 'token-de-prueba') {
  return {
    usuario: signal(usuario),
    token: signal(token),
    autenticado: signal(usuario !== null),
    tokenVigente: () => !!token,
    logout: () => {},
    cerrarSesion: () => {},
    urlImagen: (ruta: string | null | undefined) => ruta ?? null,
  };
}

/** JWT sintético para probar el reloj del cliente; la firma se verifica en los e2e del backend. */
export function tokenDePrueba(emitido = Date.now(), duracionMinutos = 15): string {
  const iat = Math.floor(emitido / 1000);
  return `cabecera.${btoa(JSON.stringify({ sub: 'u1', tipo: 'acceso', iat, exp: iat + duracionMinutos * 60 }))}.firma`;
}
