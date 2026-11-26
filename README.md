# Citas médicas · Registro de pacientes en la nube

Proyecto de las actividades **APE-2, APE-3 y APE-4 · Plataformas de Desarrollo de Software** (Maestría en Ingeniería en Software, UTM). Incluye una API REST con Node.js y Express, una web en Angular y una app móvil con React Native (Expo). En la APE-4 la API se empaqueta con Docker y se despliega en Render con PostgreSQL gestionado, de modo que la web y el celular la consumen desde internet.

## Enlaces

| Recurso | URL |
|---|---|
| Repositorio | https://github.com/gconforme2631/paciente-nube |
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
paciente-nube/
├── docker-compose.yml        # API + PostgreSQL en el computador
├── .env.example              # Plantilla de credenciales locales (el .env no se sube)
├── .gitignore
├── README.md
├── api/
│   ├── Dockerfile            # Imagen de la API (node:24-alpine)
│   ├── .dockerignore
│   ├── package.json
│   ├── src/
│   │   ├── validaciones.js   # Reglas de negocio
│   │   ├── db.js             # Elige PostgreSQL o SQLite
│   │   ├── db-postgres.js    # Acceso a datos con PostgreSQL (pg)
│   │   ├── db-sqlite.js      # Acceso a datos con SQLite
│   │   ├── app.js            # Rutas REST, CORS y códigos HTTP
│   │   └── server.js         # Punto de entrada
│   └── test/
│       └── api.test.js       # Pruebas de integración (node:test)
├── web/                      # Frontend en Angular
│   └── src/
│       ├── index.html
│       └── app/
│           ├── paciente-api.ts   # Servicio que consume la API
│           ├── app.ts            # Lógica: listar, registrar, editar y eliminar
│           ├── app.html          # Tabla de pacientes y modal de registro/edición
│           └── app.css
└── movil/                    # App móvil con Expo
    ├── .env.example          # EXPO_PUBLIC_API_URL
    ├── App.tsx
    └── src/
        └── paciente-api.ts
```

## Requisitos previos

- Node.js 24 LTS (`node -v`)
- Angular CLI: `npm install -g @angular/cli`
- Docker Desktop con WSL 2 (`docker --version`)
- Expo Go instalado en el celular

## Instalación

```bash
cd api
npm install

cd ../web
npm install

cd ../movil
npm install
```

## Ejecución en el computador

**Opción 1: API con SQLite (desarrollo rápido)**

```bash
cd api
npm run dev
```

**Opción 2: API + PostgreSQL con Docker Compose**

Desde la raíz del proyecto:

```bash
copy .env.example .env
docker compose up --build
```

En el `.env` se cambia la contraseña (solo letras y números). Los datos se guardan en el volumen `datos` y se conservan al reiniciar los contenedores. Para detener todo se usa `docker compose down`.

**Web**

```bash
cd web
ng serve
```

Disponible en `http://localhost:4200`. La URL de la API se configura en `web/src/app/paciente-api.ts`.

**Móvil**

```bash
cd movil
copy .env.example .env
npx expo start --clear
```

La URL de la API se configura en `movil/.env` con la variable `EXPO_PUBLIC_API_URL`.

## Despliegue en Render

1. **Base de datos:** New › Postgres, plan Free. Al terminar se copia la *Internal Database URL*.
2. **Web Service:** New › Web Service › repositorio `paciente-nube`, Language **Docker**, Root Directory **api**, misma región que la base, plan Free y Health Check Path `/api/salud`.
3. **Variables de entorno:**

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Internal Database URL de Render (secreto, no se publica) |
| `CORS_ORIGINS` | `http://localhost:4200,http://localhost:8081` |
| `NODE_ENV` | `production` |

**Despliegue continuo:** cada `git push` a la rama `main` hace que Render construya y publique una nueva imagen de forma automática, sin pasos manuales.

## Pruebas

```bash
cd api
npm test
```

Resultado esperado: `tests 8 · pass 8 · fail 0`. Las pruebas usan SQLite en memoria y no modifican ninguna base de datos.

| Prueba | Resultado esperado |
|---|---|
| POST con datos válidos | 201 |
| POST con datos inválidos | 400 con el campo del error |
| POST con identificación duplicada | 409 |
| GET de la lista | 200 con los pacientes |
| DELETE de un paciente | 204 y luego 404 |
| PUT de un paciente existente | 200 con los datos actualizados |
| PUT de un paciente inexistente | 404 |
| GET `/api/salud` | 200 con `{ estado: 'ok' }` |

## Endpoints de la API

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/api/salud` | Estado de la API (health check) | 200 |
| GET | `/api/pacientes` | Lista los pacientes | 200 |
| POST | `/api/pacientes` | Registra un paciente | 201, 400, 409 |
| PUT | `/api/pacientes/:id` | Actualiza un paciente | 200, 400, 404, 409 |
| DELETE | `/api/pacientes/:id` | Elimina un paciente | 204, 400, 404 |

Los errores se devuelven con el formato `{ "errores": [{ "campo": "...", "mensaje": "..." }] }`, de modo que la web y la app móvil muestran cada mensaje junto al campo correspondiente.

## Reglas de validación

- **Identificación:** entre 6 y 13 dígitos, sin letras y única por paciente.
- **Nombres y apellidos:** obligatorios.
- **Fecha de nacimiento:** fecha real, no futura y posterior a 1900.
- **Teléfono:** entre 7 y 15 dígitos; admite `+`, espacios y guiones.
- **Correo electrónico:** formato válido; se guarda en minúsculas.

## Seguridad

- Las credenciales viajan por variables de entorno; no se escriben en el código.
- `.env` y los archivos `.db` están incluidos en `.gitignore`.
- CORS solo permite los orígenes definidos en `CORS_ORIGINS`.
- El contenedor se ejecuta con el usuario `node`, sin privilegios de administrador.
- Los errores internos no se exponen al cliente (respuesta 500 genérica).

## Usabilidad y accesibilidad (web)

- Etiquetas asociadas a cada campo e indicación de campos obligatorios.
- Mensajes de error por campo con texto y borde, sin depender solo del color.
- Foco visible y navegación completa con teclado (Tab, Enter, Esc).
- Enlace "Saltar al contenido" y avisos para lectores de pantalla (`aria-live`).
- Diseño responsivo: el formulario pasa a una columna en pantallas pequeñas.

## Notas

- En el plan gratuito de Render, el servicio se suspende tras 15 minutos sin tráfico; la primera petición posterior puede tardar alrededor de un minuto.
- La base PostgreSQL gratuita de Render vence 30 días después de su creación.
- Al ejecutar la API con SQLite puede aparecer el aviso `ExperimentalWarning`; es normal.