// Define la API REST: rutas, validación y códigos de estado HTTP.
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { validarPaciente } = require('./validaciones');

// Orígenes CORS desde CORS_ORIGINS (separados por comas). Por defecto: Angular y Expo web.
const ORIGENES = (process.env.CORS_ORIGINS ?? 'http://localhost:4200,http://localhost:8081')
  .split(',')
  .map((origen) => origen.trim());

const app = express();
app.use(cors({ origin: ORIGENES }));
app.use(express.json());

// Formato de error { campo, mensaje }, igual que el proyecto de escritorio.
const error = (campo, mensaje) => ({ errores: [{ campo, mensaje }] });
const ID_INVALIDO = error(null, 'El identificador no es válido.');
const NO_ENCONTRADO = error(null, 'Paciente no encontrado.');
const DUPLICADO = error('identificacion', 'Ya existe un paciente registrado con esta identificación.');

const leerId = (texto) => {
  const id = Number(texto);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// GET /api/salud → health check de la plataforma
app.get('/api/salud', (_req, res) => {
  res.json({ estado: 'ok' });
});

// GET /api/pacientes → lista de pacientes
app.get('/api/pacientes', async (_req, res) => {
  res.json(await db.listar());
});

// POST /api/pacientes → registra un paciente
app.post('/api/pacientes', async (req, res) => {
  const { valido, errores, datos } = validarPaciente(req.body);
  if (!valido) return res.status(400).json({ errores });
  try {
    const id = await db.agregar(datos);
    res.status(201).json(await db.obtener(id));
  } catch (e) {
    if (e.duplicado) return res.status(409).json(DUPLICADO);
    throw e;
  }
});

// PUT /api/pacientes/:id → actualiza un paciente
app.put('/api/pacientes/:id', async (req, res) => {
  const id = leerId(req.params.id);
  if (!id) return res.status(400).json(ID_INVALIDO);
  const { valido, errores, datos } = validarPaciente(req.body);
  if (!valido) return res.status(400).json({ errores });
  try {
    if ((await db.actualizar(id, datos)) === 0) return res.status(404).json(NO_ENCONTRADO);
    res.json(await db.obtener(id));
  } catch (e) {
    if (e.duplicado) return res.status(409).json(DUPLICADO);
    throw e;
  }
});

// DELETE /api/pacientes/:id → elimina un paciente
app.delete('/api/pacientes/:id', async (req, res) => {
  const id = leerId(req.params.id);
  if (!id) return res.status(400).json(ID_INVALIDO);
  if ((await db.eliminar(id)) === 0) return res.status(404).json(NO_ENCONTRADO);
  res.status(204).end();
});

// Errores no controlados: no se expone el detalle interno.
app.use((e, _req, res, _next) => {
  console.error(e);
  res.status(500).json(error(null, 'Ocurrió un error inesperado. Intente nuevamente.'));
});

module.exports = app;