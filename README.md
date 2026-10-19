# Mosaico — Red social (TP #2, Programación IV)

- `frontend/`: Angular 22
- `backend/`: NestJS 12 + MongoDB (Mongoose)

## Cómo correrlo

Requiere Node 20+ y una instancia de MongoDB (local o Atlas).

```bash
# Backend (http://localhost:3000)
cd backend
npm install
# editar .env: MONGO_URI, JWT_SECRET, FRONTEND_URL
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
| `POST /auth/registro` (multipart) | Crea el usuario, encripta la contraseña con bcrypt y guarda la imagen en `uploads/perfiles` | 201 · 400 validación · 409 correo/usuario duplicado |
| `POST /auth/login` (JSON `usuario`, `password`) | Acepta correo o nombre de usuario; devuelve los datos del usuario y un JWT (15 min) | 200 · 400 · 401 |

## Deploy

- **Frontend**: `cd frontend && npm run build` publica `dist/frontend/browser` (incluye `_redirects` para Netlify y `vercel.json` para Vercel). Antes, poner la URL del backend en `frontend/src/environments/environment.prod.ts`.
- **Backend**: variables de entorno `PORT`, `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL` (la URL del front desplegado, para CORS). Las imágenes se guardan en disco (`uploads/`), así que el hosting necesita almacenamiento persistente.
