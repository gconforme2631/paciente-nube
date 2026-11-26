// Elige la base de datos: PostgreSQL si existe DATABASE_URL; si no, SQLite.
module.exports = process.env.DATABASE_URL
  ? require('./db-postgres')
  : require('./db-sqlite');