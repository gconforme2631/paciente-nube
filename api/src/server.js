// Punto de entrada: inicia el servidor HTTP.
const app = require('./app');

const PUERTO = process.env.PORT ?? 3000;
app.listen(PUERTO, () => {
  console.log(`API disponible en http://localhost:${PUERTO}/api/pacientes`);
});