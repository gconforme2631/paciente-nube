const PATRON_IDENTIFICACION = /^\d{6,13}$/; // Cédula / DNI: solo dígitos, 6 a 13
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PATRON_TELEFONO = /^\+?[\d\s-]+$/; // Admite +593, espacios y guiones
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/; // Formato del <input type="date">

function fechaHoy(ahora = new Date()) {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

function esFechaReal(texto) {
  if (!PATRON_FECHA.test(texto)) return false;
  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  );
}

const limpiar = (valor) => String(valor ?? '').trim();
const unirEspacios = (texto) => texto.replace(/\s+/g, ' ');

function validarPaciente(paciente = {}, hoy = fechaHoy()) {
  const datos = {
    identificacion: limpiar(paciente.identificacion),
    nombres: unirEspacios(limpiar(paciente.nombres)),
    apellidos: unirEspacios(limpiar(paciente.apellidos)),
    fechaNacimiento: limpiar(paciente.fechaNacimiento),
    telefono: unirEspacios(limpiar(paciente.telefono)),
    correo: limpiar(paciente.correo).toLowerCase(),
  };

  const errores = [];
  const agregarError = (campo, mensaje) => errores.push({ campo, mensaje });

  if (!PATRON_IDENTIFICACION.test(datos.identificacion)) {
    agregarError('identificacion', 'La identificación debe tener entre 6 y 13 dígitos, sin letras.');
  }

  if (!datos.nombres) {
    agregarError('nombres', 'Ingrese los nombres del paciente.');
  }

  if (!datos.apellidos) {
    agregarError('apellidos', 'Ingrese los apellidos del paciente.');
  }

  if (!esFechaReal(datos.fechaNacimiento)) {
    agregarError('fechaNacimiento', 'Ingrese una fecha de nacimiento válida.');
  } else if (datos.fechaNacimiento > hoy) {
    agregarError('fechaNacimiento', 'La fecha de nacimiento no puede ser futura.');
  } else if (datos.fechaNacimiento < '1900-01-01') {
    agregarError('fechaNacimiento', 'La fecha de nacimiento debe ser posterior a 1900.');
  }

  const digitosTelefono = datos.telefono.replace(/\D/g, '');
  if (
    !PATRON_TELEFONO.test(datos.telefono) ||
    digitosTelefono.length < 7 ||
    digitosTelefono.length > 15
  ) {
    agregarError('telefono', 'El teléfono debe tener entre 7 y 15 dígitos (puede iniciar con +).');
  }

  if (!PATRON_CORREO.test(datos.correo)) {
    agregarError('correo', 'El correo electrónico no es válido.');
  }

  return { valido: errores.length === 0, errores, datos };
}

module.exports = { validarPaciente, fechaHoy };
