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

## Deploy

- **Frontend**: `cd frontend && npm run build` publica `dist/frontend/browser` (incluye `_redirects` para Netlify y `vercel.json` para Vercel). Antes, poner la URL del backend en `frontend/src/environments/environment.prod.ts`.
- **Backend**: variables de entorno `PORT`, `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL` (la URL del front desplegado, para CORS) y `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Las imágenes viven en Cloudinary, así que el hosting no necesita almacenamiento persistente.
