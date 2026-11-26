// Servicio que se comunica con la API REST del backend.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

// Formato de error que devuelve la API (igual al del proyecto de escritorio).
export interface ErrorCampo {
  campo: string | null;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class PacienteApi {
  private readonly http = inject(HttpClient);
  private readonly url = 'http://localhost:3000/api/pacientes';

  listar() {
    return this.http.get<Paciente[]>(this.url);
  }

  agregar(paciente: NuevoPaciente) {
    return this.http.post<Paciente>(this.url, paciente);
  }

  actualizar(id: number, paciente: NuevoPaciente) {
    return this.http.put<Paciente>(`${this.url}/${id}`, paciente);
  }

  eliminar(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}