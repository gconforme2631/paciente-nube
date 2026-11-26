// Acceso a datos con PostgreSQL (servicio gestionado en la nube o contenedor local).
const { Pool } = require('pg');

const UNIQUE_VIOLATION = '23505'; // código de PostgreSQL para un valor duplicado

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// fecha_nacimiento como TEXT (AAAA-MM-DD): mismo formato que espera el frontend.
const listo = pool.query(`CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  identificacion TEXT NOT NULL UNIQUE,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  fecha_nacimiento TEXT NOT NULL,
  telefono TEXT NOT NULL,
  correo TEXT NOT NULL
)`);
listo.catch((error) => console.error('No se pudo preparar PostgreSQL:', error.message));

// Alias entre comillas: sin ellas PostgreSQL lo devuelve en minúsculas.
const COLUMNAS = `id, identificacion, nombres, apellidos,
  fecha_nacimiento AS "fechaNacimiento", telefono, correo`;

// Marca el error de identificación duplicada para que app.js responda 409.
const marcarDuplicado = (error) => {
  if (error.code === UNIQUE_VIOLATION) error.duplicado = true;
  return error;
};

const listar = async () => {
  await listo;
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM pacientes ORDER BY LOWER(apellidos), LOWER(nombres)`,
  );
  return rows;
};

const obtener = async (id) => {
  await listo;
  const { rows } = await pool.query(`SELECT ${COLUMNAS} FROM pacientes WHERE id = $1`, [id]);
  return rows[0];
};

const agregar = async (p) => {
  await listo;
  try {
    const { rows } = await pool.query(
      `INSERT INTO pacientes
        (identificacion, nombres, apellidos, fecha_nacimiento, telefono, correo)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [p.identificacion, p.nombres, p.apellidos, p.fechaNacimiento, p.telefono, p.correo],
    );
    return rows[0].id;
  } catch (error) {
    throw marcarDuplicado(error);
  }
};

const actualizar = async (id, p) => {
  await listo;
  try {
    const { rowCount } = await pool.query(
      `UPDATE pacientes SET identificacion = $1, nombres = $2, apellidos = $3,
        fecha_nacimiento = $4, telefono = $5, correo = $6 WHERE id = $7`,
      [p.identificacion, p.nombres, p.apellidos, p.fechaNacimiento, p.telefono, p.correo, id],
    );
    return rowCount;
  } catch (error) {
    throw marcarDuplicado(error);
  }
};

const eliminar = async (id) => {
  await listo;
  const { rowCount } = await pool.query('DELETE FROM pacientes WHERE id = $1', [id]);
  return rowCount;
};

module.exports = { listar, obtener, agregar, actualizar, eliminar };