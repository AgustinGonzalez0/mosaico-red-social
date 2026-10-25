# Mosaico — Red social (TP #2, Programación IV)

- `frontend/`: Angular 22
- `backend/`: NestJS 12 + MongoDB (Mongoose)

## Cómo correrlo

Requiere Node 20+ y una instancia de MongoDB (local o Atlas).

```bash
# Backend (http://localhost:3000)
cd backend
npm install
# copiar .env.example a .env y completar: MONGO_URI, JWT_SECRET, FRONTEND_URL
# y las credenciales de Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
npm run start:dev

# Frontend (http://localhost:4200)
cd frontend
npm install
npm start
```

MongoDB rápido con Docker: `docker run -d -p 27017:27017 --name mongo mongo:7`

## Sprint 1

| Endpoint | Descripción | Respuestas |
|---|---|---|
| `POST /auth/registro` (multipart) | Crea el usuario, encripta la contraseña con bcrypt y sube la imagen de perfil a Cloudinary (carpeta `mosaico/perfiles`) y guarda su URL | 201 · 400 validación · 409 correo/usuario duplicado · 500 si Cloudinary falla o no está configurado |
| `POST /auth/login` (JSON `usuario`, `password`) | Acepta correo o nombre de usuario; devuelve los datos del usuario y un JWT (15 min) | 200 · 400 · 401 |

## Sprint 2

Todas las rutas de publicaciones exigen `Authorization: Bearer <JWT>`. El `JwtAuthGuard` verifica la firma y el vencimiento del token y consulta en MongoDB que el usuario exista y siga habilitado; el autor y el rol salen siempre de ahí, nunca de lo que mande el cliente.

| Endpoint | Descripción | Respuestas |
|---|---|---|
| `POST /publicaciones` (multipart: `titulo`, `mensaje`, `imagen` opcional) | Crea una publicación del usuario autenticado. La imagen se sube a Cloudinary (`mosaico/publicaciones`) y se guarda su URL, ancho y alto | 201 · 400 validación o imagen inválida · 401 · 413 imagen > 5 MB · 500 si Cloudinary falla |
| `GET /publicaciones?orden=fecha\|meGusta&autor=<id>&offset=0&limit=12` | Lista paginada. `orden` por defecto `fecha` (más recientes primero); `limit` máx. 50. Devuelve `{ data, total, offset, limit, hasMore }`. Cada publicación trae `meGusta` (cantidad) y `leGusta` (si el usuario autenticado ya dio el suyo) | 200 · 400 parámetros inválidos · 401 |
| `DELETE /publicaciones/:id` | Baja lógica (`activa: false`). Solo el autor o un administrador | 204 · 400 · 401 · 403 · 404 |
| `POST /publicaciones/:id/me-gusta` | Da "me gusta" (uno por usuario). Devuelve `{ meGusta, leGusta }` | 201 · 400 · 401 · 404 · 409 ya había dado me gusta |
| `DELETE /publicaciones/:id/me-gusta` | Quita el "me gusta" propio. Devuelve `{ meGusta, leGusta }` | 200 · 400 · 401 · 404 · 409 no había dado me gusta |
| `GET /publicaciones/:id/comentarios?offset=0&limit=12` | Solo lectura (Mi Perfil). Los comentarios se escriben recién en el Sprint 3 | 200 · 400 · 401 · 404 |

### Tests

```bash
cd backend
npm test            # unitarios (DTOs, guard JWT, validación de imágenes)
npm run test:e2e -- test/publicaciones.e2e-spec.ts   # e2e contra una MongoDB en memoria (no toca Atlas)

cd frontend
npm test -- --watch=false
```

Los e2e de publicaciones descargan un `mongod` la primera vez (mongodb-memory-server) y simulan solo la llamada de red a Cloudinary.

## Deploy

- **Frontend**: `cd frontend && npm run build` publica `dist/frontend/browser` (incluye `_redirects` para Netlify y `vercel.json` para Vercel). Antes, poner la URL del backend en `frontend/src/environments/environment.prod.ts`.
- **Backend**: variables de entorno `PORT`, `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL` (la URL del front desplegado, para CORS) y `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Las imágenes viven en Cloudinary, así que el hosting no necesita almacenamiento persistente.
