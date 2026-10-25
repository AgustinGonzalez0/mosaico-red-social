import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import request from 'supertest';

const FRONTEND = 'https://mosaico-red.netlify.app';

// Prueba de arranque aislada: levanta la app real contra una MongoDB en memoria (nunca la base real).
describe('Aplicación (e2e)', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    // Las variables ya definidas tienen prioridad sobre el .env.
    process.env.MONGO_URI = mongo.getUri('mosaico-test-app');
    process.env.JWT_SECRET = 'secreto-solo-para-tests';
    process.env.FRONTEND_URL = FRONTEND;
    expect(process.env.MONGO_URI).toContain('127.0.0.1');

    const { AppModule } = await import('../src/app.module.js');
    const { configurarApp } = await import('../src/app.setup.js');
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  it('arranca y no expone nada en la raíz', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  it('las rutas de publicaciones exigen autenticación (401)', async () => {
    await request(app.getHttpServer()).get('/publicaciones').expect(401);
    await request(app.getHttpServer()).post('/publicaciones').expect(401);
    await request(app.getHttpServer()).delete('/publicaciones/64b7f0f0f0f0f0f0f0f0f0f0').expect(401);
  });

  it('el login valida el cuerpo (400) y rechaza credenciales inexistentes (401)', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ usuario: 'nadie', password: 'Password1' })
      .expect(401);
  });

  it('CORS permite al frontend desplegado usar DELETE y el encabezado Authorization', async () => {
    const res = await request(app.getHttpServer())
      .options('/publicaciones/64b7f0f0f0f0f0f0f0f0f0f0')
      .set('Origin', FRONTEND)
      .set('Access-Control-Request-Method', 'DELETE')
      .set('Access-Control-Request-Headers', 'authorization,content-type')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND);
    expect(res.headers['access-control-allow-methods']).toContain('DELETE');
    expect(res.headers['access-control-allow-headers']?.toLowerCase()).toContain('authorization');
  });

  it('CORS no habilita a otros orígenes', async () => {
    const res = await request(app.getHttpServer())
      .options('/publicaciones')
      .set('Origin', 'https://sitio-ajeno.example.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
