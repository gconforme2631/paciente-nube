// Pruebas de integración: levantan la API en un puerto libre y la consultan con fetch.
process.env.DB_ARCHIVO = ':memory:'; // base temporal, no toca citas-medicas.db

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

let servidor;
let url;

before(() => new Promise((listo) => {
  servidor = app.listen(0, () => {
    url = `http://localhost:${servidor.address().port}/api/pacientes`;
    listo();
  });
}));

after(() => servidor.close());

const pacienteValido = {
  identificacion: '1312345678',
  nombres: 'Valeria',
  apellidos: 'Gómez Zambrano',
  fechaNacimiento: '1990-01-01',
  telefono: '+593 99 123 4567',
  correo: 'Valeria.Gomez@example.com',
};

const enviar = (paciente) => fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(paciente),
});

const actualizar = (id, paciente) => fetch(`${url}/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(paciente),
});

test('POST registra un paciente válido y responde 201', async () => {
  const respuesta = await enviar(pacienteValido);
  assert.equal(respuesta.status, 201);
  const cuerpo = await respuesta.json();
  assert.equal(cuerpo.correo, 'valeria.gomez@example.com'); // se guarda en minúsculas
});

test('POST rechaza datos inválidos con 400 e indica el campo', async () => {
  const respuesta = await enviar({ ...pacienteValido, identificacion: '12AB', fechaNacimiento: '2999-01-01' });
  assert.equal(respuesta.status, 400);
  const { errores } = await respuesta.json();
  assert.deepEqual(errores.map((e) => e.campo), ['identificacion', 'fechaNacimiento']);
});

test('POST rechaza una identificación duplicada con 409', async () => {
  const respuesta = await enviar({ ...pacienteValido, correo: 'otro@example.com' });
  assert.equal(respuesta.status, 409);
  const { errores } = await respuesta.json();
  assert.equal(errores[0].campo, 'identificacion');
});

test('GET devuelve la lista de pacientes', async () => {
  const pacientes = await (await fetch(url)).json();
  assert.equal(pacientes.length, 1);
  assert.equal(pacientes[0].apellidos, 'Gómez Zambrano');
});

test('DELETE elimina el paciente y luego responde 404', async () => {
  const [paciente] = await (await fetch(url)).json();
  assert.equal((await fetch(`${url}/${paciente.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await fetch(`${url}/${paciente.id}`, { method: 'DELETE' })).status, 404);
});

test('PUT actualiza un paciente y responde 200', async () => {
  const nuevo = { ...pacienteValido, identificacion: '0912345678' };
  const creado = await (await enviar(nuevo)).json();
  const respuesta = await actualizar(creado.id, { ...nuevo, telefono: '0991234567' });
  assert.equal(respuesta.status, 200);
  assert.equal((await respuesta.json()).telefono, '0991234567');
});

test('PUT responde 404 si el paciente no existe', async () => {
  assert.equal((await actualizar(9999, pacienteValido)).status, 404);
});

test('GET /api/salud responde 200 con estado ok', async () => {
  const respuesta = await fetch(url.replace('/pacientes', '/salud'));
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), { estado: 'ok' });
});