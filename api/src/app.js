// Define la API REST: rutas, validación y códigos de estado HTTP.
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { validarPaciente } = require('./validaciones');

const SQLITE_CONSTRAINT_UNIQUE = 2067; // código de SQLite para un valor duplicado

const app = express();
app.use(cors({ origin: 'http://localhost:4200' })); // solo el frontend de Angular
app.use(express.json());

// Mismo formato de error que el proyecto de escritorio: { campo, mensaje }.
const error = (campo, mensaje) => ({ errores: [{ campo, mensaje }] });

// GET /api/pacientes → lista de pacientes
app.get('/api/pacientes', (_req, res) => {
  res.json(db.listar());
});

// POST /api/pacientes → registra un paciente
app.post('/api/pacientes', (req, res) => {
  const { valido, errores, datos } = validarPaciente(req.body);
  if (!valido) return res.status(400).json({ errores });
  try {
    const id = db.agregar(datos);
    res.status(201).json(db.obtener(id));
  } catch (e) {
    if (e.errcode === SQLITE_CONSTRAINT_UNIQUE) {
      return res.status(409).json(
        error('identificacion', 'Ya existe un paciente registrado con esta identificación.'));
    }
    throw e;
  }
});

// DELETE /api/pacientes/:id → elimina un paciente
app.delete('/api/pacientes/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json(error(null, 'El identificador no es válido.'));
  }
  if (db.eliminar(id) === 0) {
    return res.status(404).json(error(null, 'Paciente no encontrado.'));
  }
  res.status(204).end();
});

// Errores no controlados: no se expone el detalle interno al cliente.
app.use((e, _req, res, _next) => {
  console.error(e);
  res.status(500).json(error(null, 'Ocurrió un error inesperado. Intente nuevamente.'));
});

module.exports = app;