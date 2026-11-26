// Servicio que se comunica con la API REST de pacientes (la misma de la APE-2).
// En el celular, "localhost" es el propio celular: la URL debe usar la IP del computador.
const URL_API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/pacientes';

export interface Paciente {
  id: number;
  identificacion: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string; // AAAA-MM-DD
  telefono: string;
  correo: string;
}

export type NuevoPaciente = Omit<Paciente, 'id'>;

// Formato de error de la API: { campo, mensaje } (igual que en la web y el escritorio).
export interface ErrorCampo {
  campo: string | null;
  mensaje: string;
}

// Error con los mensajes que devuelve la API (400, 404 o 409).
export class ErrorApi extends Error {
  errores: ErrorCampo[];
  constructor(errores: ErrorCampo[]) {
    super(errores.map((e) => e.mensaje).join(' '));
    this.errores = errores;
  }
}

async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(URL_API + ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json' },
  });
  if (respuesta.status === 204) return undefined as T; // DELETE no devuelve contenido
  const cuerpo = await respuesta.json();
  if (!respuesta.ok) {
    throw new ErrorApi(cuerpo.errores ?? [{ campo: null, mensaje: 'Error inesperado del servidor.' }]);
  }
  return cuerpo as T;
}

export const pacienteApi = {
  listar: () => solicitar<Paciente[]>(''),
  agregar: (paciente: NuevoPaciente) =>
    solicitar<Paciente>('', { method: 'POST', body: JSON.stringify(paciente) }),
  actualizar: (id: number, paciente: NuevoPaciente) =>
    solicitar<Paciente>(`/${id}`, { method: 'PUT', body: JSON.stringify(paciente) }),
  eliminar: (id: number) => solicitar<void>(`/${id}`, { method: 'DELETE' }),
};