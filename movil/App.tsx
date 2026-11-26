// MediAgenda: registra, lista, edita y elimina pacientes consumiendo la API REST.
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ErrorApi, NuevoPaciente, Paciente, pacienteApi } from './src/paciente-api';

type Campo = keyof NuevoPaciente;
type Mensaje = { texto: string; error: boolean } | null;

const VACIO: NuevoPaciente = {
  identificacion: '', nombres: '', apellidos: '', fechaNacimiento: '', telefono: '', correo: '',
};

// ---------- Utilidades de fecha ----------
const aISO = (fecha: Date) => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};
const desdeISO = (iso: string) => {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return iso ? new Date(anio, mes - 1, dia) : new Date(1990, 0, 1);
};
const formatear = (iso: string) => {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PantallaPacientes />
    </SafeAreaProvider>
  );
}

function PantallaPacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [formulario, setFormulario] = useState<NuevoPaciente>(VACIO);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFecha, setMostrarFecha] = useState(false);

  // Separa los errores por campo (debajo de cada input) del error general (banner).
  const mostrarError = (error: unknown) => {
    if (error instanceof ErrorApi) {
      const porCampo: Partial<Record<Campo, string>> = {};
      const generales: string[] = [];
      for (const { campo, mensaje: texto } of error.errores) {
        if (campo && campo in VACIO) porCampo[campo as Campo] = texto;
        else generales.push(texto);
      }
      setErrores(porCampo);
      setMensaje({
        texto: generales.length ? generales.join('\n') : 'Revise los campos marcados en rojo.',
        error: true,
      });
    } else {
      setMensaje({
        texto: 'No se pudo conectar con la API. Revise la URL del archivo .env y que el servidor esté activo.',
        error: true,
      });
    }
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setPacientes(await pacienteApi.listar());
    } catch (error) {
      mostrarError(error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const limpiar = () => {
    setFormulario(VACIO);
    setEditandoId(null);
    setErrores({});
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const paciente = editandoId === null
        ? await pacienteApi.agregar(formulario)
        : await pacienteApi.actualizar(editandoId, formulario);
      const accion = editandoId === null ? 'registrado' : 'actualizado';
      limpiar();
      setMensaje({ texto: `Paciente ${paciente.nombres} ${paciente.apellidos} ${accion}.`, error: false });
      await cargar();
    } catch (error) {
      mostrarError(error);
    } finally {
      setGuardando(false);
    }
  };

  const editar = (paciente: Paciente) => {
    const { id, ...datos } = paciente;
    setFormulario(datos);
    setEditandoId(id);
    setErrores({});
    setMensaje({ texto: `Editando a ${paciente.nombres} ${paciente.apellidos}.`, error: false });
  };

  const eliminar = async (paciente: Paciente) => {
    try {
      await pacienteApi.eliminar(paciente.id);
      if (editandoId === paciente.id) limpiar();
      setMensaje({ texto: `Paciente ${paciente.nombres} ${paciente.apellidos} eliminado.`, error: false });
      await cargar();
    } catch (error) {
      mostrarError(error);
    }
  };

  // Pide confirmación antes de eliminar (prevención de errores).
  const confirmarEliminar = (paciente: Paciente) => {
    const pregunta = `¿Eliminar a ${paciente.nombres} ${paciente.apellidos}?`;
    if (Platform.OS === 'web') {
      if (window.confirm(pregunta)) eliminar(paciente);
      return;
    }
    Alert.alert('Eliminar paciente', pregunta, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminar(paciente) },
    ]);
  };

  // Actualiza un campo y borra su error.
  const cambiar = (campo: Campo) => (texto: string) => {
    setFormulario((actual) => ({ ...actual, [campo]: texto }));
    setErrores(({ [campo]: _, ...resto }) => resto);
  };

  const elegirFecha = (evento: DateTimePickerEvent, fecha?: Date) => {
    if (Platform.OS === 'android') setMostrarFecha(false);
    if (evento.type === 'set' && fecha) cambiar('fechaNacimiento')(aISO(fecha));
  };

  // Campo de texto con etiqueta, error y accesibilidad.
  const campoTexto = (campo: Campo, etiqueta: string, props: Partial<React.ComponentProps<typeof TextInput>> = {}) => (
    <View style={estilos.grupo}>
      <Text style={estilos.etiqueta}>{etiqueta} <Text style={estilos.requerido}>*</Text></Text>
      <TextInput
        style={[estilos.campo, errores[campo] && estilos.campoError]}
        value={formulario[campo]}
        onChangeText={cambiar(campo)}
        accessibilityLabel={etiqueta}
        accessibilityHint={errores[campo]}
        placeholderTextColor="#6B7885"
        {...props}
      />
      {errores[campo] && <Text style={estilos.textoError}>{errores[campo]}</Text>}
    </View>
  );

  const encabezado = (
    <View>
      <Text style={estilos.titulo} accessibilityRole="header">Pacientes</Text>
      <Text style={estilos.subtituloPantalla}>Fichas administrativas de identificación y contacto.</Text>

      <View style={estilos.formulario}>
        <Text style={estilos.tituloFormulario} accessibilityRole="header">
          {editandoId === null ? 'Registrar nuevo paciente' : 'Editar paciente'}
        </Text>

        {campoTexto('identificacion', 'Número de identificación (Cédula / DNI)', {
          keyboardType: 'number-pad', maxLength: 13, placeholder: 'Ej: 1312345678',
        })}
        {campoTexto('nombres', 'Nombres', { autoCapitalize: 'words', placeholder: 'Ej: Valeria' })}
        {campoTexto('apellidos', 'Apellidos', { autoCapitalize: 'words', placeholder: 'Ej: Gómez Zambrano' })}

        {/* Fecha: selector nativo en el celular; texto AAAA-MM-DD en el navegador (Plan B). */}
        <View style={estilos.grupo}>
          <Text style={estilos.etiqueta}>Fecha de nacimiento <Text style={estilos.requerido}>*</Text></Text>
          {Platform.OS === 'web' ? (
            <TextInput
              style={[estilos.campo, errores.fechaNacimiento && estilos.campoError]}
              value={formulario.fechaNacimiento}
              onChangeText={cambiar('fechaNacimiento')}
              accessibilityLabel="Fecha de nacimiento, formato año, mes, día"
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#6B7885"
              maxLength={10}
            />
          ) : (
            <Pressable
              style={[estilos.campo, estilos.campoFecha, errores.fechaNacimiento && estilos.campoError]}
              onPress={() => setMostrarFecha(true)}
              accessibilityRole="button"
              accessibilityLabel={`Fecha de nacimiento: ${formulario.fechaNacimiento ? formatear(formulario.fechaNacimiento) : 'sin seleccionar'}`}
              accessibilityHint="Abre el calendario"
            >
              <Text style={formulario.fechaNacimiento ? estilos.textoFecha : estilos.textoPlaceholder}>
                {formulario.fechaNacimiento ? formatear(formulario.fechaNacimiento) : 'DD/MM/AAAA'}
              </Text>
            </Pressable>
          )}
          {mostrarFecha && Platform.OS !== 'web' && (
            <View>
              <DateTimePicker
                value={desdeISO(formulario.fechaNacimiento)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                onChange={elegirFecha}
              />
              {Platform.OS === 'ios' && (
                <Pressable style={estilos.botonSecundario} onPress={() => setMostrarFecha(false)}
                  accessibilityRole="button" accessibilityLabel="Listo, cerrar calendario">
                  <Text style={estilos.textoSecundario}>Listo</Text>
                </Pressable>
              )}
            </View>
          )}
          {errores.fechaNacimiento && <Text style={estilos.textoError}>{errores.fechaNacimiento}</Text>}
        </View>

        {campoTexto('telefono', 'Teléfono de contacto', {
          keyboardType: 'phone-pad', maxLength: 20, placeholder: '+593 99 123 4567',
        })}
        {campoTexto('correo', 'Correo electrónico', {
          keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false,
          placeholder: 'valeria.gomez@example.com',
        })}

        <Pressable
          style={({ pressed }) => [estilos.boton, (pressed || guardando) && estilos.botonPresionado]}
          onPress={guardar}
          disabled={guardando}
          accessibilityRole="button"
          accessibilityLabel={editandoId === null ? 'Registrar paciente' : 'Guardar cambios'}
        >
          <Text style={estilos.textoBoton}>
            {guardando ? 'Guardando…' : editandoId === null ? 'Registrar paciente' : 'Guardar cambios'}
          </Text>
        </Pressable>

        {editandoId !== null && (
          <Pressable style={estilos.botonSecundario} onPress={() => { limpiar(); setMensaje(null); }}
            accessibilityRole="button" accessibilityLabel="Cancelar edición">
            <Text style={estilos.textoSecundario}>Cancelar</Text>
          </Pressable>
        )}
      </View>

      {mensaje && (
        <Text
          style={[estilos.mensaje, mensaje.error ? estilos.mensajeError : estilos.mensajeExito]}
          accessibilityLiveRegion="polite"
        >
          {mensaje.texto}
        </Text>
      )}

      <Text style={estilos.subtitulo}>Pacientes registrados ({pacientes.length})</Text>
    </View>
  );

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style="dark" />
      <View style={estilos.barra}>
        <View style={estilos.logo}><Text style={estilos.logoTexto}>+</Text></View>
        <Text style={estilos.marca} accessibilityRole="header">MediAgenda</Text>
      </View>
      <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={pacientes}
          keyExtractor={(paciente) => String(paciente.id)}
          ListHeaderComponent={encabezado}
          ListEmptyComponent={<Text style={estilos.vacio}>Aún no hay pacientes registrados.</Text>}
          refreshing={cargando}
          onRefresh={cargar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={estilos.contenido}
          renderItem={({ item }) => (
            <View style={[estilos.tarjeta, editandoId === item.id && estilos.tarjetaEditando]}>
              <Text style={estilos.nombre}>{item.nombres} {item.apellidos}</Text>
              <Text style={estilos.detalle}>Cédula: {item.identificacion}</Text>
              <Text style={estilos.detalle}>Nacimiento: {formatear(item.fechaNacimiento)}</Text>
              <Text style={estilos.detalle}>Teléfono: {item.telefono}</Text>
              <Text style={estilos.detalle}>{item.correo}</Text>
              <View style={estilos.acciones}>
                <Pressable style={estilos.botonEditar} onPress={() => editar(item)}
                  accessibilityRole="button" accessibilityLabel={`Editar a ${item.nombres} ${item.apellidos}`}>
                  <Text style={estilos.textoEditar}>Editar</Text>
                </Pressable>
                <Pressable style={estilos.botonEliminar} onPress={() => confirmarEliminar(item)}
                  accessibilityRole="button" accessibilityLabel={`Eliminar a ${item.nombres} ${item.apellidos}`}>
                  <Text style={estilos.textoEliminar}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Misma paleta de la versión web (contraste WCAG AA).
const PRIMARIO = '#1B6579';
const TEXTO = '#1C2733';
const TEXTO_SUAVE = '#4F5D6B';
const BORDE = '#D5DDE3';
const ERROR = '#B3261E';

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#F3F6F8' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDE },
  logo: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#E2EEF2', alignItems: 'center', justifyContent: 'center' },
  logoTexto: { color: PRIMARIO, fontSize: 22, fontWeight: '700' },
  marca: { fontSize: 18, fontWeight: '700', color: TEXTO },
  contenido: { padding: 20, paddingBottom: 40 },
  titulo: { fontSize: 26, fontWeight: '700', color: TEXTO },
  subtituloPantalla: { fontSize: 15, color: TEXTO_SUAVE, marginTop: 2, marginBottom: 16 },
  formulario: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: BORDE, padding: 16 },
  tituloFormulario: { fontSize: 19, fontWeight: '700', color: TEXTO, marginBottom: 4 },
  grupo: { marginTop: 12 },
  etiqueta: { fontSize: 16, fontWeight: '600', color: TEXTO, marginBottom: 6 },
  requerido: { color: '#C62840' },
  campo: { minHeight: 48, borderWidth: 1, borderColor: '#7D8C99', borderRadius: 8, paddingHorizontal: 12, fontSize: 16, color: TEXTO, backgroundColor: '#FFFFFF' },
  campoFecha: { justifyContent: 'center' },
  campoError: { borderColor: ERROR, borderWidth: 2 },
  textoFecha: { fontSize: 16, color: TEXTO },
  textoPlaceholder: { fontSize: 16, color: '#6B7885' },
  textoError: { color: ERROR, fontSize: 14, marginTop: 4 },
  boton: { minHeight: 48, marginTop: 20, borderRadius: 8, backgroundColor: PRIMARIO, alignItems: 'center', justifyContent: 'center' },
  botonPresionado: { opacity: 0.7 },
  textoBoton: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  botonSecundario: { minHeight: 48, marginTop: 10, borderRadius: 8, borderWidth: 1, borderColor: BORDE, alignItems: 'center', justifyContent: 'center' },
  textoSecundario: { color: TEXTO, fontSize: 16, fontWeight: '600' },
  mensaje: { marginTop: 14, padding: 12, borderRadius: 8, fontSize: 15 },
  mensajeExito: { backgroundColor: '#E7F4EC', color: '#1E6B3A' },
  mensajeError: { backgroundColor: '#FDECEA', color: ERROR },
  subtitulo: { fontSize: 18, fontWeight: '700', color: TEXTO, marginTop: 24, marginBottom: 8 },
  vacio: { fontSize: 15, color: TEXTO_SUAVE, fontStyle: 'italic' },
  tarjeta: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDE },
  tarjetaEditando: { borderColor: PRIMARIO, borderWidth: 2 },
  nombre: { fontSize: 17, fontWeight: '700', color: TEXTO, marginBottom: 2 },
  detalle: { fontSize: 15, color: TEXTO_SUAVE, marginTop: 2 },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 12 },
  botonEditar: { flex: 1, minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: PRIMARIO, alignItems: 'center', justifyContent: 'center' },
  textoEditar: { color: PRIMARIO, fontSize: 15, fontWeight: '700' },
  botonEliminar: { flex: 1, minHeight: 48, borderRadius: 8, backgroundColor: ERROR, alignItems: 'center', justifyContent: 'center' },
  textoEliminar: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});