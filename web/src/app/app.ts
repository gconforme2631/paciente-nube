// Componente principal: lista de pacientes y modal de registro/edición.
import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ErrorCampo, Paciente, PacienteApi } from './paciente-api';

type Campo = 'identificacion' | 'nombres' | 'apellidos' | 'fechaNacimiento' | 'telefono' | 'correo';

const ERROR_GENERAL = 'Ocurrió un error inesperado al guardar. Intente nuevamente.';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly api = inject(PacienteApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = viewChild.required<ElementRef<HTMLDialogElement>>('modal');
  private readonly resumen = viewChild.required<ElementRef<HTMLDivElement>>('resumen');

  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly anuncio = signal('');                       // solo para lectores de pantalla
  protected readonly errores = signal<Partial<Record<Campo, string>>>({});
  protected readonly errorGeneral = signal('');
  protected readonly guardando = signal(false);
  protected readonly hoy = signal(this.fechaHoy());
  protected readonly editandoId = signal<number | null>(null); // null = registro nuevo

  protected readonly formulario = this.fb.nonNullable.group({
    identificacion: '',
    nombres: '',
    apellidos: '',
    fechaNacimiento: '',
    telefono: '',
    correo: '',
  });

  ngOnInit() {
    this.cargar();
  }

  protected cargar() {
    this.api.listar().subscribe({
      next: (datos) => this.pacientes.set(datos),
      error: () => this.anuncio.set('No se pudo conectar con la API. Verifique que esté en ejecución.'),
    });
  }

  // ---------- Modal ----------
  protected abrirModal(paciente?: Paciente) {
    const dialogo = this.modal().nativeElement;
    if (dialogo.open) return;
    this.formulario.reset();
    if (paciente) {
      const { id, ...datos } = paciente;
      this.formulario.setValue(datos);
      this.editandoId.set(id);
    } else {
      this.editandoId.set(null);
    }
    this.limpiarErrores();
    this.hoy.set(this.fechaHoy());
    dialogo.showModal();
    document.getElementById('identificacion')?.focus();
  }

  protected cerrarModal() {
    this.modal().nativeElement.close();
  }

  // Cierra el modal al hacer clic en el fondo oscuro.
  protected clicEnFondo(evento: MouseEvent) {
    if (evento.target === this.modal().nativeElement) this.cerrarModal();
  }

  // ---------- Errores ----------
  protected limpiarError(campo: Campo) {
    this.errores.update(({ [campo]: _, ...resto }) => resto);
  }

  private limpiarErrores() {
    this.errores.set({});
    this.errorGeneral.set('');
  }

  private mostrarErrores(lista: ErrorCampo[]) {
    this.limpiarErrores();
    const porCampo: Partial<Record<Campo, string>> = {};
    let primerCampo: string | null = null;

    for (const { campo, mensaje } of lista) {
      if (campo && campo in this.formulario.controls) {
        porCampo[campo as Campo] = mensaje;
        primerCampo ??= campo;
      } else {
        this.errorGeneral.set(mensaje);
      }
    }
    this.errores.set(porCampo);

    // Lleva el foco al primer campo con error (o al resumen) después de actualizar la vista.
    setTimeout(() => {
      const destino = primerCampo ? document.getElementById(primerCampo) : this.resumen().nativeElement;
      destino?.focus();
    });
  }

  // ---------- Acciones ----------
  protected guardar() {
    const datos = this.formulario.getRawValue();
    const id = this.editandoId();
    const peticion = id === null ? this.api.agregar(datos) : this.api.actualizar(id, datos);
    const accion = id === null ? 'registrado' : 'actualizado';
    this.guardando.set(true);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.anuncio.set(`Paciente ${datos.nombres.trim()} ${datos.apellidos.trim()} ${accion}.`);
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.guardando.set(false);
        this.mostrarErrores(respuesta.error?.errores ?? [{ campo: null, mensaje: ERROR_GENERAL }]);
      },
    });
  }

  protected eliminar(paciente: Paciente, botonNuevo: HTMLButtonElement) {
    const nombreCompleto = `${paciente.nombres} ${paciente.apellidos}`;
    this.api.eliminar(paciente.id).subscribe({
      next: () => {
        this.anuncio.set(`Paciente ${nombreCompleto} eliminado.`);
        this.cargar();
        botonNuevo.focus();
      },
      error: () => this.anuncio.set(`No se pudo eliminar a ${nombreCompleto}.`),
    });
  }

  // ---------- Utilidades ----------
  protected formatearFecha(iso: string) {
    const [anio, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  private fechaHoy() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }
}