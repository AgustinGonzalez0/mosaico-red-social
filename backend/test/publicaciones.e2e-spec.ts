import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { Model } from 'mongoose';
import request from 'supertest';
import type { Comentario } from '../src/publicaciones/schemas/comentario.schema.js';
import type { Publicacion } from '../src/publicaciones/schemas/publicacion.schema.js';
import type { User } from '../src/users/schemas/user.schema.js';

// Cloudinary se simula solo en la frontera de red: guardarImagen / subirImagen corren de verdad.
const { subirAMock } = vi.hoisted(() => ({
  subirAMock: vi.fn(
    (
      opciones: { folder: string },
      callback: (error: unknown, resultado: unknown) => void,
    ) => ({
      on: vi.fn(),
      end: vi.fn(() =>
        callback(undefined, {
          secure_url: `https://res.cloudinary.com/test/image/upload/${opciones.folder}/foto.png`,
          width: 640,
          height: 480,
        }),
      ),
    }),
  ),
}));
vi.mock('cloudinary', () => ({
  v2: { config: vi.fn(), uploader: { upload_stream: subirAMock } },
}));

// PNG válido de 1x1 píxel.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

interface Sesion {
  id: string;
  token: string;
  nombreUsuario: string;
}

describe('Publicaciones (e2e)', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication;
  let usuarios: Model<User>;
  let publicaciones: Model<Publicacion>;
  let comentarios: Model<Comentario>;
  let ana: Sesion;
  let beto: Sesion;
  let admin: Sesion;

  const http = () => request(app.getHttpServer());
  const auth = (s: Sesion) => ({ Authorization: `Bearer ${s.token}` });

  async function registrar(nombreUsuario: string): Promise<Sesion> {
    const res = await http()
      .post('/auth/registro')
      .field('nombre', 'Test')
      .field('apellido', nombreUsuario)
      .field('correo', `${nombreUsuario}@test.com`)
      .field('nombreUsuario', nombreUsuario)
      .field('password', 'Password1')
      .field('repetirPassword', 'Password1')
      .field('fechaNacimiento', '2000-01-01')
      .field('descripcion', 'usuario de prueba')
      .expect(201);
    return { id: res.body.usuario.id, token: res.body.token, nombreUsuario };
  }

  async function publicar(sesion: Sesion, titulo: string, mensaje = 'mensaje de prueba') {
    const res = await http()
      .post('/publicaciones')
      .set(auth(sesion))
      .field('titulo', titulo)
      .field('mensaje', mensaje)
      .expect(201);
    return res.body as { id: string };
  }

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    // Las variables de entorno ya definidas tienen prioridad sobre el .env: nunca se toca la base real.
    process.env.MONGO_URI = mongo.getUri('mosaico-test');
    process.env.JWT_SECRET = 'secreto-solo-para-tests';
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';
    expect(process.env.MONGO_URI).toContain('127.0.0.1');

    const { AppModule } = await import('../src/app.module.js');
    const { configurarApp } = await import('../src/app.setup.js');
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();

    usuarios = app.get(getModelToken('User'));
    publicaciones = app.get(getModelToken('Publicacion'));
    comentarios = app.get(getModelToken('Comentario'));

    ana = await registrar('ana');
    beto = await registrar('beto');
    admin = await registrar('admin');
    await usuarios.updateOne({ _id: admin.id }, { perfil: 'administrador' });
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  beforeEach(async () => {
    await publicaciones.deleteMany({});
    await comentarios.deleteMany({});
    subirAMock.mockClear();
  });

  describe('autenticación', () => {
    it('rechaza con 401 las operaciones sin token', async () => {
      const { id } = await publicar(ana, 'una');
      await http().get('/publicaciones').expect(401);
      await http().post('/publicaciones').field('titulo', 'x').field('mensaje', 'y').expect(401);
      await http().delete(`/publicaciones/${id}`).expect(401);
      await http().post(`/publicaciones/${id}/me-gusta`).expect(401);
      await http().delete(`/publicaciones/${id}/me-gusta`).expect(401);
      await http().get(`/publicaciones/${id}/comentarios`).expect(401);
    });

    it('rechaza con 401 un token mal formado, firmado con otra clave o vencido', async () => {
      await http().get('/publicaciones').set('Authorization', 'Bearer basura').expect(401);
      await http().get('/publicaciones').set('Authorization', ana.token).expect(401); // sin "Bearer"

      const ajeno = await new JwtService({ secret: 'otra-clave' }).signAsync({ sub: ana.id });
      await http().get('/publicaciones').set('Authorization', `Bearer ${ajeno}`).expect(401);

      const vencido = await app.get(JwtService).signAsync({ sub: ana.id }, { expiresIn: '-10s' });
      await http().get('/publicaciones').set('Authorization', `Bearer ${vencido}`).expect(401);
    });

    it('rechaza con 401 a un usuario deshabilitado aunque su token siga vigente', async () => {
      const temporal = await registrar('temporal');
      await http().get('/publicaciones').set(auth(temporal)).expect(200);
      await usuarios.updateOne({ _id: temporal.id }, { habilitado: false });
      await http().get('/publicaciones').set(auth(temporal)).expect(401);
    });

    it('mantiene funcionando el registro y el login', async () => {
      await http()
        .post('/auth/login')
        .send({ usuario: 'ana', password: 'Password1' })
        .expect(200)
        .expect((res) => expect(res.body.token).toBeTruthy());
      await http().post('/auth/login').send({ usuario: 'ana', password: 'Incorrecta1' }).expect(401);
      await http()
        .post('/auth/registro')
        .field('nombre', 'Dup')
        .field('apellido', 'Dup')
        .field('correo', 'ana@test.com')
        .field('nombreUsuario', 'otra')
        .field('password', 'Password1')
        .field('repetirPassword', 'Password1')
        .field('fechaNacimiento', '2000-01-01')
        .field('descripcion', 'x')
        .expect(409);
    });
  });

  describe('POST /publicaciones', () => {
    it('crea una publicación con imagen, subiéndola a Cloudinary y guardando solo su URL', async () => {
      const res = await http()
        .post('/publicaciones')
        .set(auth(ana))
        .field('titulo', '  Mi foto  ')
        .field('mensaje', 'Una descripción')
        .attach('imagen', PNG, { filename: 'foto.png', contentType: 'image/png' })
        .expect(201);

      expect(res.body).toMatchObject({
        titulo: 'Mi foto', // se recorta
        mensaje: 'Una descripción',
        imagen: 'https://res.cloudinary.com/test/image/upload/mosaico/publicaciones/foto.png',
        ancho: 640,
        alto: 480,
        autor: { id: ana.id, nombreUsuario: 'ana', imagenPerfil: null },
        meGusta: 0,
        leGusta: false,
      });
      expect(res.body.id).toMatch(/^[0-9a-f]{24}$/);
      expect(res.body.createdAt).toBeTruthy();
      expect(JSON.stringify(res.body)).not.toContain('password');
      expect(subirAMock).toHaveBeenCalledTimes(1);

      const enBase = await publicaciones.findById(res.body.id).lean();
      expect(enBase?.imagen).toBe(res.body.imagen);
      expect(enBase?.activa).toBe(true);
      expect(enBase?.autor.toString()).toBe(ana.id);
    });

    it('crea una publicación sin imagen', async () => {
      const res = await http()
        .post('/publicaciones')
        .set(auth(ana))
        .field('titulo', 'Solo texto')
        .field('mensaje', 'Sin foto')
        .expect(201);
      expect(res.body.imagen).toBeNull();
      expect(res.body.ancho).toBeNull();
      expect(subirAMock).not.toHaveBeenCalled();
    });

    it.each([
      ['sin título', { mensaje: 'hola' }],
      ['con el título vacío', { titulo: '', mensaje: 'hola' }],
      ['con el título solo de espacios', { titulo: '   ', mensaje: 'hola' }],
      ['con el título demasiado largo', { titulo: 'a'.repeat(101), mensaje: 'hola' }],
      ['sin mensaje', { titulo: 'hola' }],
      ['con el mensaje solo de espacios', { titulo: 'hola', mensaje: '   ' }],
      ['con el mensaje demasiado largo', { titulo: 'hola', mensaje: 'a'.repeat(501) }],
    ])('rechaza con 400 una publicación %s (y no sube la imagen)', async (_caso, campos) => {
      let peticion = http().post('/publicaciones').set(auth(ana));
      for (const [campo, valor] of Object.entries(campos)) peticion = peticion.field(campo, valor);
      const res = await peticion
        .attach('imagen', PNG, { filename: 'foto.png', contentType: 'image/png' })
        .expect(400);
      expect(res.body.message).toBeDefined();
      expect(subirAMock).not.toHaveBeenCalled();
      expect(await publicaciones.countDocuments()).toBe(0);
    });

    it('devuelve un único mensaje claro por campo inválido', async () => {
      const res = await http().post('/publicaciones').set(auth(ana)).field('mensaje', 'x').expect(400);
      expect(res.body.message).toEqual(['El título es obligatorio']);
    });

    it('rechaza con 400 una imagen con un formato no permitido', async () => {
      await http()
        .post('/publicaciones')
        .set(auth(ana))
        .field('titulo', 't')
        .field('mensaje', 'm')
        .attach('imagen', Buffer.from('%PDF-1.4'), { filename: 'a.pdf', contentType: 'application/pdf' })
        .expect(400);
      expect(subirAMock).not.toHaveBeenCalled();
    });

    it('rechaza con 400 un archivo que dice ser PNG pero no lo es', async () => {
      const res = await http()
        .post('/publicaciones')
        .set(auth(ana))
        .field('titulo', 't')
        .field('mensaje', 'm')
        .attach('imagen', Buffer.from('esto es texto, no una imagen'), {
          filename: 'falsa.png',
          contentType: 'image/png',
        })
        .expect(400);
      expect(res.body.message).toBe('El archivo no es una imagen válida');
      expect(subirAMock).not.toHaveBeenCalled();
      expect(await publicaciones.countDocuments()).toBe(0);
    });

    it('rechaza con 413 una imagen que supera los 5 MB', async () => {
      const grande = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
      await http()
        .post('/publicaciones')
        .set(auth(ana))
        .field('titulo', 't')
        .field('mensaje', 'm')
        .attach('imagen', grande, { filename: 'grande.png', contentType: 'image/png' })
        .expect(413);
    });

    it('no deja que el cliente elija el autor', async () => {
      await http()
        .post('/publicaciones')
        .set(auth(ana))
        .field('titulo', 't')
        .field('mensaje', 'm')
        .field('autor', beto.id)
        .expect(400);

      const creada = await publicar(ana, 'mía');
      const enBase = await publicaciones.findById(creada.id).lean();
      expect(enBase?.autor.toString()).toBe(ana.id);
    });
  });

  describe('GET /publicaciones', () => {
    it('ordena por fecha, de la más reciente a la más antigua, por defecto', async () => {
      for (const titulo of ['p1', 'p2', 'p3', 'p4']) await publicar(ana, titulo);
      const res = await http().get('/publicaciones').set(auth(ana)).expect(200);
      expect(res.body.data.map((p: { titulo: string }) => p.titulo)).toEqual(['p4', 'p3', 'p2', 'p1']);
      expect(res.body).toMatchObject({ total: 4, offset: 0, limit: 12, hasMore: false });
    });

    it('ordena por cantidad de me gusta con desempate por fecha', async () => {
      const a = await publicar(ana, 'a-1like');
      const b = await publicar(ana, 'b-3likes');
      const c = await publicar(ana, 'c-1like');
      const d = await publicar(ana, 'd-0likes');
      for (const s of [ana, beto, admin]) await http().post(`/publicaciones/${b.id}/me-gusta`).set(auth(s));
      await http().post(`/publicaciones/${a.id}/me-gusta`).set(auth(ana));
      await http().post(`/publicaciones/${c.id}/me-gusta`).set(auth(ana));
      expect(d.id).toBeDefined();

      const res = await http().get('/publicaciones?orden=meGusta').set(auth(ana)).expect(200);
      expect(res.body.data.map((p: { titulo: string; meGusta: number }) => [p.titulo, p.meGusta])).toEqual([
        ['b-3likes', 3],
        ['c-1like', 1], // empate con a-1like: gana la más reciente
        ['a-1like', 1],
        ['d-0likes', 0],
      ]);
    });

    it('pagina con offset y limit sin repetir ni saltear publicaciones', async () => {
      for (let i = 1; i <= 7; i++) await publicar(ana, `p${i}`);

      const p1 = await http().get('/publicaciones?offset=0&limit=3').set(auth(ana)).expect(200);
      const p2 = await http().get('/publicaciones?offset=3&limit=3').set(auth(ana)).expect(200);
      const p3 = await http().get('/publicaciones?offset=6&limit=3').set(auth(ana)).expect(200);

      expect(p1.body).toMatchObject({ total: 7, offset: 0, limit: 3, hasMore: true });
      expect(p2.body).toMatchObject({ total: 7, offset: 3, limit: 3, hasMore: true });
      expect(p3.body).toMatchObject({ total: 7, offset: 6, limit: 3, hasMore: false });

      const titulos = [...p1.body.data, ...p2.body.data, ...p3.body.data].map(
        (p: { titulo: string }) => p.titulo,
      );
      expect(titulos).toEqual(['p7', 'p6', 'p5', 'p4', 'p3', 'p2', 'p1']);
    });

    it('también pagina cuando se ordena por me gusta', async () => {
      const ids: string[] = [];
      for (let i = 1; i <= 5; i++) ids.push((await publicar(ana, `p${i}`)).id);
      await http().post(`/publicaciones/${ids[0]}/me-gusta`).set(auth(ana));
      await http().post(`/publicaciones/${ids[0]}/me-gusta`).set(auth(beto));
      await http().post(`/publicaciones/${ids[2]}/me-gusta`).set(auth(ana));

      const p1 = await http().get('/publicaciones?orden=meGusta&limit=2').set(auth(ana));
      const p2 = await http().get('/publicaciones?orden=meGusta&limit=2&offset=2').set(auth(ana));
      const p3 = await http().get('/publicaciones?orden=meGusta&limit=2&offset=4').set(auth(ana));
      const titulos = [...p1.body.data, ...p2.body.data, ...p3.body.data].map(
        (p: { titulo: string }) => p.titulo,
      );
      expect(titulos).toEqual(['p1', 'p3', 'p5', 'p4', 'p2']);
    });

    it('filtra las publicaciones de un usuario', async () => {
      await publicar(ana, 'de-ana-1');
      await publicar(beto, 'de-beto');
      await publicar(ana, 'de-ana-2');

      const res = await http().get(`/publicaciones?autor=${ana.id}`).set(auth(beto)).expect(200);
      expect(res.body.total).toBe(2);
      expect(res.body.data.map((p: { titulo: string }) => p.titulo)).toEqual(['de-ana-2', 'de-ana-1']);
      expect(res.body.data.every((p: { autor: { id: string } }) => p.autor.id === ana.id)).toBe(true);
    });

    it('trae solo las últimas 3 publicaciones de un usuario (para Mi Perfil)', async () => {
      for (let i = 1; i <= 5; i++) await publicar(ana, `p${i}`);
      const res = await http().get(`/publicaciones?autor=${ana.id}&limit=3`).set(auth(ana)).expect(200);
      expect(res.body.data.map((p: { titulo: string }) => p.titulo)).toEqual(['p5', 'p4', 'p3']);
      expect(res.body).toMatchObject({ total: 5, hasMore: true });
    });

    it.each([
      ['limit=0'],
      ['limit=51'],
      ['limit=abc'],
      ['limit=1.5'],
      ['offset=-1'],
      ['offset=abc'],
      ['orden=popularidad'],
      ['autor=no-es-un-id'],
      ['inventado=1'],
    ])('rechaza con 400 los parámetros inválidos (%s)', async (query) => {
      await http().get(`/publicaciones?${query}`).set(auth(ana)).expect(400);
    });

    it('informa si el usuario que consulta ya dio me gusta y no expone quiénes lo dieron', async () => {
      const { id } = await publicar(ana, 'una');
      await http().post(`/publicaciones/${id}/me-gusta`).set(auth(beto)).expect(201);

      const paraBeto = await http().get('/publicaciones').set(auth(beto));
      const paraAna = await http().get('/publicaciones').set(auth(ana));
      expect(paraBeto.body.data[0]).toMatchObject({ meGusta: 1, leGusta: true });
      expect(paraAna.body.data[0]).toMatchObject({ meGusta: 1, leGusta: false });
      expect(JSON.stringify(paraAna.body)).not.toContain(beto.id);
    });
  });

  describe('me gusta', () => {
    it('da y quita me gusta, y el cambio persiste', async () => {
      const { id } = await publicar(ana, 'una');

      const dar = await http().post(`/publicaciones/${id}/me-gusta`).set(auth(beto)).expect(201);
      expect(dar.body).toEqual({ meGusta: 1, leGusta: true });
      expect((await publicaciones.findById(id).lean())?.meGusta.map(String)).toEqual([beto.id]);

      const quitar = await http().delete(`/publicaciones/${id}/me-gusta`).set(auth(beto)).expect(200);
      expect(quitar.body).toEqual({ meGusta: 0, leGusta: false });
      expect((await publicaciones.findById(id).lean())?.meGusta).toEqual([]);
    });

    it('impide dar dos me gusta a la misma publicación (409)', async () => {
      const { id } = await publicar(ana, 'una');
      await http().post(`/publicaciones/${id}/me-gusta`).set(auth(beto)).expect(201);
      await http().post(`/publicaciones/${id}/me-gusta`).set(auth(beto)).expect(409);
      expect((await publicaciones.findById(id).lean())?.meGusta).toHaveLength(1);
    });

    it('registra un único me gusta aunque lleguen muchos clics simultáneos', async () => {
      const { id } = await publicar(ana, 'una');
      const respuestas = await Promise.all(
        Array.from({ length: 8 }, () => http().post(`/publicaciones/${id}/me-gusta`).set(auth(beto))),
      );
      const estados = respuestas.map((r) => r.status);
      expect(estados.filter((s) => s === 201)).toHaveLength(1);
      expect(estados.filter((s) => s === 409)).toHaveLength(7);
      expect((await publicaciones.findById(id).lean())?.meGusta).toHaveLength(1);
    });

    it('impide quitar un me gusta que no se había dado (409)', async () => {
      const { id } = await publicar(ana, 'una');
      await http().post(`/publicaciones/${id}/me-gusta`).set(auth(ana)).expect(201);
      await http().delete(`/publicaciones/${id}/me-gusta`).set(auth(beto)).expect(409);
      expect((await publicaciones.findById(id).lean())?.meGusta).toHaveLength(1); // el de ana sigue
    });

    it('cada usuario cuenta una sola vez y su me gusta es independiente', async () => {
      const { id } = await publicar(ana, 'una');
      await http().post(`/publicaciones/${id}/me-gusta`).set(auth(ana)).expect(201);
      const res = await http().post(`/publicaciones/${id}/me-gusta`).set(auth(beto)).expect(201);
      expect(res.body).toEqual({ meGusta: 2, leGusta: true });
    });

    it('responde 404 si la publicación no existe y 400 si el id es inválido', async () => {
      const inexistente = '64b7f0f0f0f0f0f0f0f0f0f0';
      await http().post(`/publicaciones/${inexistente}/me-gusta`).set(auth(ana)).expect(404);
      await http().delete(`/publicaciones/${inexistente}/me-gusta`).set(auth(ana)).expect(404);
      await http().post('/publicaciones/no-es-un-id/me-gusta').set(auth(ana)).expect(400);
    });

    it('no admite me gusta en una publicación eliminada', async () => {
      const { id } = await publicar(ana, 'una');
      await http().delete(`/publicaciones/${id}`).set(auth(ana)).expect(204);
      await http().post(`/publicaciones/${id}/me-gusta`).set(auth(beto)).expect(404);
    });
  });

  describe('DELETE /publicaciones/:id (baja lógica)', () => {
    it('impide eliminar la publicación de otro usuario (403)', async () => {
      const { id } = await publicar(ana, 'de ana');
      await http().delete(`/publicaciones/${id}`).set(auth(beto)).expect(403);
      expect((await publicaciones.findById(id).lean())?.activa).toBe(true);
    });

    it('permite al autor eliminar la suya y hace una baja lógica', async () => {
      const { id } = await publicar(ana, 'de ana');
      await http().delete(`/publicaciones/${id}`).set(auth(ana)).expect(204);

      const enBase = await publicaciones.findById(id).lean();
      expect(enBase).not.toBeNull(); // el documento sigue existiendo
      expect(enBase?.activa).toBe(false);
    });

    it('permite a un administrador eliminar la de otro usuario', async () => {
      const { id } = await publicar(ana, 'de ana');
      await http().delete(`/publicaciones/${id}`).set(auth(admin)).expect(204);
      expect((await publicaciones.findById(id).lean())?.activa).toBe(false);
    });

    it('usa el perfil actual de la base y no el que figura en el token', async () => {
      const { id } = await publicar(ana, 'de ana');
      const promovido = await registrar('promovido');
      // El token se emitió cuando era "usuario"; si lo promueven, el guard lo lee de la base.
      await usuarios.updateOne({ _id: promovido.id }, { perfil: 'administrador' });
      await http().delete(`/publicaciones/${id}`).set(auth(promovido)).expect(204);

      const degradado = await publicar(ana, 'otra');
      await usuarios.updateOne({ _id: promovido.id }, { perfil: 'usuario' });
      await http().delete(`/publicaciones/${degradado.id}`).set(auth(promovido)).expect(403);
    });

    it('las publicaciones eliminadas dejan de aparecer en los listados y no se pueden volver a eliminar', async () => {
      const a = await publicar(ana, 'se queda');
      const b = await publicar(ana, 'se elimina');
      await http().delete(`/publicaciones/${b.id}`).set(auth(ana)).expect(204);

      const todas = await http().get('/publicaciones').set(auth(ana)).expect(200);
      expect(todas.body.data.map((p: { id: string }) => p.id)).toEqual([a.id]);
      expect(todas.body.total).toBe(1);

      const deAna = await http().get(`/publicaciones?autor=${ana.id}`).set(auth(ana));
      expect(deAna.body.total).toBe(1);

      await http().delete(`/publicaciones/${b.id}`).set(auth(ana)).expect(404);
    });

    it('responde 404 si no existe y 400 si el id es inválido', async () => {
      await http().delete('/publicaciones/64b7f0f0f0f0f0f0f0f0f0f0').set(auth(ana)).expect(404);
      await http().delete('/publicaciones/xyz').set(auth(ana)).expect(400);
    });
  });

  describe('GET /publicaciones/:id/comentarios', () => {
    it('devuelve una lista vacía mientras no haya comentarios', async () => {
      const { id } = await publicar(ana, 'una');
      const res = await http().get(`/publicaciones/${id}/comentarios`).set(auth(ana)).expect(200);
      expect(res.body).toEqual({ data: [], total: 0, offset: 0, limit: 12, hasMore: false });
    });

    it('lista los comentarios existentes, los más recientes primero y paginados', async () => {
      const { id } = await publicar(ana, 'una');
      for (const mensaje of ['c1', 'c2', 'c3']) {
        await comentarios.create({ publicacion: id, autor: beto.id, mensaje });
      }
      const res = await http().get(`/publicaciones/${id}/comentarios?limit=2`).set(auth(ana)).expect(200);
      expect(res.body.data.map((c: { mensaje: string }) => c.mensaje)).toEqual(['c3', 'c2']);
      expect(res.body).toMatchObject({ total: 3, hasMore: true });
      expect(res.body.data[0]).toMatchObject({
        modificado: false,
        autor: { id: beto.id, nombreUsuario: 'beto' },
      });
      expect(JSON.stringify(res.body)).not.toContain('password');
    });

    it('responde 404 si la publicación fue eliminada', async () => {
      const { id } = await publicar(ana, 'una');
      await http().delete(`/publicaciones/${id}`).set(auth(ana)).expect(204);
      await http().get(`/publicaciones/${id}/comentarios`).set(auth(ana)).expect(404);
    });
  });
});
