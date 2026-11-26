# Citas médicas · Registro de pacientes en la nube

Proyecto de las actividades **APE-2, APE-3 y APE-4 · Plataformas de Desarrollo de Software** (Maestría en Ingeniería en Software, UTM). Incluye una API REST con Node.js y Express, una web en Angular y una app móvil con React Native (Expo). En la APE-4 la API se empaqueta con Docker y se despliega en Render con PostgreSQL gestionado, de modo que la web y el celular la consumen desde internet.

## Enlaces

| Recurso | URL |
|---|---|
| Repositorio | https://github.com/gconforme2631/pacientes-nube |
| API pública | https://paciente-api.onrender.com/api/pacientes |
| Ruta de salud | https://paciente-api.onrender.com/api/salud |

## Arquitectura

```text
GitHub (push) ──► Render Web Service (Docker) ──► Render PostgreSQL
                          ▲
             HTTPS /api/pacientes
                          │
            Web (Angular) · Móvil (Expo)
```

| Capa | Tecnología | En el computador | En la nube |
|---|---|---|---|
| Web | Angular (formulario reactivo, signals, HttpClient) | `localhost:4200` | Consume la API de Render |
| Móvil | React Native + Expo | Expo Go | Consume la API de Render |
| API | Node.js + Express en contenedor Docker | `localhost:3000` | Render Web Service |
| Base de datos | SQLite (`node:sqlite`) o PostgreSQL con Docker Compose | `citas-medicas.db` / volumen `datos` | Render PostgreSQL |

La API elige la base según el entorno: si existe la variable `DATABASE_URL` usa PostgreSQL; si no, SQLite.

## Estructura del proyecto

```text
paciente nube/
├── docker-compose.yml        # API + PostgreSQL en el computador
├── .env.example              # Plantilla de credenciales locales (el .env no se sube)
├── .gitignore
├── api/
│   ├── Dockerfile            # Imagen de la API (node:24-alpine)
│   ├── .dockerignore
│   ├── src/
│   │   ├── validaciones.js   # Reglas de negocio
│   │   ├── db.js             # Elige PostgreSQL o SQLite
│   │   ├── db-postgres.js    # Acceso a datos con PostgreSQL (pg)
│   │   ├── db-sqlite.js      # Acceso a datos con SQLite
│   │   ├── app.js            # Rutas REST, CORS y códigos HTTP
│   │   └── server.js         # Punto de entrada
│   └── test/
│       └── api.test.js       # Pruebas de integración (node:test)
├── web/                      # Angular
│   └── src/app/
│       ├── paciente-api.ts   # Servicio que consume la API
│       ├── app.ts / app.html / app.css
└── movil/                    # Expo
    ├── .env.example          # EXPO_PUBLIC_API_URL
    ├── App.tsx
    └── src/paciente-api.ts
```

## Requisitos previos

- Node.js 24 LTS (`node -v`)
- Angular CLI: `npm install -g @angular/cli`
- Docker Desktop con WSL 2 (`docker --version`)
- Expo Go en el celular

## Instalación

```bash
cd api && npm install
cd ../web && npm install
cd ../movil && npm install
```

## Ejecución en el computador

**Opción 1: API con SQLite (desarrollo rápido)**

```bash
cd api
npm run dev
```

**Opción 2: API + PostgreSQL con Docker Compose**

```bash
copy .env.example .env      # cambiar la contraseña (solo letras y números)
docker compose up --build
```

Los datos se guardan en el volumen `datos` y se conservan al reiniciar los contenedores.

**Web y móvil**

```bash
cd web && ng serve                 # http://localhost:4200
cd movil && npx expo start --clear
```

La URL de la API se configura en `web/src/app/paciente-api.ts` y en `movil/.env` (`EXPO_PUBLIC_API_URL`).

## Despliegue en Render

1. **Base de datos:** New › Postgres, plan Free. Se copia la *Internal Database URL*.
2. **Web Service:** New › Web Service › repositorio `pacientes-nube`, Language **Docker**, Root Directory **api**, misma región que la base, plan Free y Health Check Path `/api/salud`.
3. **Variables de entorno:**

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Internal Database URL (secreto, no se publica) |
| `CORS_ORIGINS` | `http://localhost:4200,http://localhost:8081` |
| `NODE_ENV` | `production` |

**Despliegue continuo:** cada `git push` a `main` hace que Render construya y publique una nueva imagen automáticamente.

## Pruebas

```bash
cd api
npm test
```

Resultado esperado: `tests 8 · pass 8 · fail 0`. Las pruebas usan SQLite en memoria y no modifican ninguna base.

## Endpoints de la API

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/api/salud` | Estado de la API (health check) | 200 |
| GET | `/api/pacientes` | Lista los pacientes | 200 |
| POST | `/api/pacientes` | Registra un paciente | 201, 400, 409 |
| PUT | `/api/pacientes/:id` | Actualiza un paciente | 200, 400, 404, 409 |
| DELETE | `/api/pacientes/:id` | Elimina un paciente | 204, 400, 404 |

Los errores se devuelven con el formato `{ "errores": [{ "campo": "...", "mensaje": "..." }] }`.

## Reglas de validación

- **Identificación:** entre 6 y 13 dígitos, sin letras y única por paciente.
- **Nombres y apellidos:** obligatorios.
- **Fecha de nacimiento:** fecha real, no futura y posterior a 1900.
- **Teléfono:** entre 7 y 15 dígitos; admite `+`, espacios y guiones.
- **Correo electrónico:** formato válido; se guarda en minúsculas.

## Seguridad

- Las credenciales viajan por variables de entorno; no se escriben en el código.
- `.env` y los archivos `.db` están en `.gitignore`.
- CORS solo permite los orígenes definidos en `CORS_ORIGINS`.
- Los errores internos no se exponen al cliente (respuesta 500 genérica).

## Notas

- En el plan gratuito, el servicio se suspende tras 15 minutos sin tráfico; la primera petición puede tardar alrededor de un minuto.
- La base PostgreSQL gratuita de Render vence 30 días después de su creación.