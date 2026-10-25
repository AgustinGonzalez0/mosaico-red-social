import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Configuración global de la app (CORS y validación de DTOs). La usan main.ts y los tests e2e. */
export function configurarApp(app: INestApplication): void {
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
