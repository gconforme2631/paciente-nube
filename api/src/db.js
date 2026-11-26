// Acceso a datos con el SQLite integrado en Node.js (no requiere instalar paquetes).
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const archivo = process.env.DB_ARCHIVO ?? path.join(__dirname, '..', 'citas-medicas.db');
const db = new DatabaseSync(archivo);

// Misma estructura que la tabla del proyecto de escritorio (APE-1).
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

const listar = () =>
  db.prepare(`SELECT ${COLUMNAS} FROM pacientes
    ORDER BY apellidos COLLATE NOCASE, nombres COLLATE NOCASE`).all();

const obtener = (id) =>
  db.prepare(`SELECT ${COLUMNAS} FROM pacientes WHERE id = ?`).get(id);

const agregar = (p) => {
  const resultado = db
    .prepare(`INSERT INTO pacientes
      (identificacion, nombres, apellidos, fecha_nacimiento, telefono, correo)
      VALUES (?, ?, ?, ?, ?, ?)`)
    .run(p.identificacion, p.nombres, p.apellidos, p.fechaNacimiento, p.telefono, p.correo);
  return Number(resultado.lastInsertRowid);
};

const eliminar = (id) =>
  Number(db.prepare('DELETE FROM pacientes WHERE id = ?').run(id).changes);

module.exports = { listar, obtener, agregar, eliminar };