# Citas médicas · Registro de pacientes (versión web)

Aplicación web desarrollada para la actividad **APE-2 · Plataformas de Desarrollo de Software** (Maestría en Ingeniería en Software, UTM). Es la versión web del proyecto de escritorio de la Unidad 1: una API REST con Node.js, Express y SQLite, y un frontend en Angular que la consume.

## Arquitectura

| Capa | Tecnología | Puerto |
|---|---|---|
| Frontend | Angular (formulario reactivo, signals, HttpClient) | 4200 |
| API REST | Node.js + Express | 3000 |
| Base de datos | SQLite integrado en Node.js (`node:sqlite`), archivo `citas-medicas.db` | — |

## Requisitos previos

- Node.js 22.13 o superior (`node -v`)
- Angular CLI: `npm install -g @angular/cli`
- Google Chrome (para la evaluación con Lighthouse)

## Estructura del proyecto

```text
pacientes-web/
├── README.md
├── api/
│   ├── src/
│   │   ├── validaciones.js   # Reglas de negocio (las mismas del proyecto de escritorio)
│   │   ├── db.js             # Acceso a datos con SQLite
│   │   ├── app.js            # Rutas REST y códigos HTTP
│   │   └── server.js         # Punto de entrada del servidor
│   └── test/
│       └── api.test.js       # Pruebas de integración con node:test
└── web/
    └── src/
        ├── app/
        │   ├── paciente-api.ts   # Servicio que consume la API
        │   ├── app.ts            # Lógica del componente principal
        │   ├── app.html          # Lista de pacientes y modal de registro/edición
        │   └── app.css           # Estilos del componente
        ├── styles.css            # Estilos globales (paleta, tipografía, foco)
        └── index.html
```


## Instalación

Instalar las dependencias de cada parte:

```bash
cd api
npm install

cd ../web
npm install
```

## Ejecución

Se necesitan dos terminales abiertas al mismo tiempo.

**Terminal 1: API**

```bash
cd api
npm run dev
```

La API queda disponible en `http://localhost:3000/api/pacientes`.

**Terminal 2: Frontend**

```bash
cd web
ng serve
```

La aplicación queda disponible en `http://localhost:4200`.

## Pruebas

Desde la carpeta `api`:

```bash
npm test
```

Resultado esperado: `tests 6 · pass 6 · fail 0`. Las pruebas usan una base de datos temporal en memoria y no modifican `citas-medicas.db`.

## Endpoints de la API

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/api/pacientes` | Lista los pacientes | 200 |
| POST | `/api/pacientes` | Registra un paciente | 201, 400, 409 |
| PUT | `/api/pacientes/:id` | Actualiza un paciente | 200, 400, 404, 409 |
| DELETE | `/api/pacientes/:id` | Elimina un paciente | 204, 400, 404 |

Los errores se devuelven con el formato `{ "errores": [{ "campo": "...", "mensaje": "..." }] }`, de modo que el frontend muestra cada mensaje debajo del campo correspondiente.

## Reglas de validación

- **Identificación:** entre 6 y 13 dígitos, sin letras y única por paciente.
- **Nombres y apellidos:** obligatorios.
- **Fecha de nacimiento:** fecha real, no futura y posterior a 1900.
- **Teléfono:** entre 7 y 15 dígitos; admite `+`, espacios y guiones.
- **Correo electrónico:** formato válido; se guarda en minúsculas.

## Usabilidad y accesibilidad

- Etiquetas asociadas a cada campo e indicación de campos obligatorios.
- Mensajes de error por campo con texto y borde, sin depender solo del color.
- Foco visible y navegación completa con teclado (Tab, Enter, Esc).
- Enlace "Saltar al contenido" y avisos para lectores de pantalla (`aria-live`).
- Contraste de colores según WCAG AA.
- Diseño responsivo: el formulario pasa a una columna en pantallas pequeñas.

## Notas

- Al ejecutar la API puede aparecer el aviso `ExperimentalWarning` de SQLite; es normal.
- El archivo `citas-medicas.db` se crea automáticamente la primera vez que se inicia la API.
- El puntaje de Performance de Lighthouse es menor en modo desarrollo (`ng serve`).