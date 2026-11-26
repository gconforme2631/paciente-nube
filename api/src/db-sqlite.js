// Acceso a datos con el SQLite integrado en Node.js (desarrollo local y pruebas).
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const SQLITE_CONSTRAINT_UNIQUE = 2067; // código de SQLite para un valor duplicado

const archivo = process.env.DB_ARCHIVO ?? path.join(__dirname, '..', 'citas-medicas.db');
const db = new DatabaseSync(archivo);

db.exec(`CREATE TABLE IF NOT EXISTS pacientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identificacion TEXT NOT NULL UNIQUE,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  fecha_nacimiento TEXT NOT NULL,
  telefono TEXT NOT NULL,
  correo TEXT NOT NULL
)`);

const COLUMNAS = `id, identificacion, nombres, apellidos,
  fecha_nacimiento AS fechaNacimiento, telefono, correo`;

// Marca el error de identificación duplicada para que app.js responda 409.
const marcarDuplicado = (error) => {
  if (error.errcode === SQLITE_CONSTRAINT_UNIQUE) error.duplicado = true;
  return error;
};

// async: misma interfaz que db-postgres.js
const listar = async () =>
  db.prepare(`SELECT ${COLUMNAS} FROM pacientes
    ORDER BY apellidos COLLATE NOCASE, nombres COLLATE NOCASE`).all();

const obtener = async (id) =>
  db.prepare(`SELECT ${COLUMNAS} FROM pacientes WHERE id = ?`).get(id);

const agregar = async (p) => {
  try {
    const resultado = db
      .prepare(`INSERT INTO pacientes
        (identificacion, nombres, apellidos, fecha_nacimiento, telefono, correo)
        VALUES (?, ?, ?, ?, ?, ?)`)
      .run(p.identificacion, p.nombres, p.apellidos, p.fechaNacimiento, p.telefono, p.correo);
    return Number(resultado.lastInsertRowid);
  } catch (error) {
    throw marcarDuplicado(error);
  }
};

const actualizar = async (id, p) => {
  try {
    const resultado = db
      .prepare(`UPDATE pacientes SET identificacion = ?, nombres = ?, apellidos = ?,
        fecha_nacimiento = ?, telefono = ?, correo = ? WHERE id = ?`)
      .run(p.identificacion, p.nombres, p.apellidos, p.fechaNacimiento, p.telefono, p.correo, id);
    return Number(resultado.changes);
  } catch (error) {
    throw marcarDuplicado(error);
  }
};

const eliminar = async (id) =>
  Number(db.prepare('DELETE FROM pacientes WHERE id = ?').run(id).changes);

module.exports = { listar, obtener, agregar, actualizar, eliminar };