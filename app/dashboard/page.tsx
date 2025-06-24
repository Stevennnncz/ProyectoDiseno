import { createClient } from "@/lib/supabase/server"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { redirect } from 'next/navigation'
import IniciarSesionButton from './IniciarSesionButton'
import TemporizadorPunto from './TemporizadorPunto'
import EmpezarPuntoButton from './EmpezarPuntoButton'
import FinalizarSesionButton from './FinalizarSesionButton'
import CurrentSessionView from '@/components/CurrentSessionView'

function getLocalDateTime(fecha: string | null | undefined, hora: string | null | undefined): Date | null {
  if (!fecha || !hora) return null;
  const [year, month, day] = fecha.split('-').map(Number)
  const [h, m, s] = hora.split(':').map(Number)
  // El mes en Date es base 0
  return new Date(year, month - 1, day, h, m, s, 0)
}

export default async function DashboardPage() {
  // Debug temporal - remover después
  console.log('NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  console.log('Current time (server):', new Date().toISOString())
  
  const supabase = await createClient()

  // Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. Verificar si hay usuario autenticado
  if (!user) {
    redirect('/login') // Redirigir a la página de login si no hay usuario
  }

  // 2. Obtener el rol del usuario desde la tabla 'usuarios'
  const { data: userData, error: userError } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    console.error("Error al obtener el rol del usuario:", userError)
    redirect('/login') // Redirigir si hay un error o no se encuentra el rol
  }

  // 3. Verificar si el rol es ADMINISTRADOR
  if (userData.rol !== 'ADMINISTRADOR') {
    // Opcional: Podrías redirigir a una página de "Acceso Denegado" si existe
    redirect('/acceso-denegado') // O redirigir a /login si no quieres una página específica
  }

  // Corregir la consulta: solo agendas
  const { data: sesiones, error } = await supabase
    .from("sesiones")
    .select(`
      *,
      agendas(
        *,
        puntos_agenda (
          *,
          documentos (*),
          acuerdos (
            *,
            acuerdo_responsables (*)
          ),
          votos_a_favor,
          votos_en_contra,
          votos_abstenciones
        )
      ),
      sesiones_participantes (
        usuario_id,
        junta_directiva_miembro_id,
        estado_asistencia,
        usuarios (id, nombre, email),
        junta_directiva_miembros (id, nombre_completo, correo)
      ),
      sesion_participantes_externos (
        id,
        email,
        nombre,
        estado_asistencia
      )
    `)
    .order("fecha", { ascending: true })

  const { data: juntaDirectivaMiembros, error: jdError } = await supabase
    .from("junta_directiva_miembros")
    .select("id, nombre_completo, correo, puesto")
    .order("nombre_completo", { ascending: true })

  if (jdError) {
    console.error("Error al obtener miembros de la junta directiva:", jdError)
    // Decide how to handle this error: redirect, return empty, etc.
  }

  let sesionEnCurso = null
  let requiereInicioManual = false
  let debugSesiones = []
  if (sesiones && sesiones.length > 0) {
    const now = new Date()
    debugSesiones = sesiones.map((sesion) => {
      const fechaHora = getLocalDateTime(sesion.fecha, sesion.hora);
      const fin = fechaHora ? new Date(fechaHora.getTime() + 2 * 60 * 60 * 1000) : null; // Handle potential null
      return {
        id: sesion.id,
        estado: sesion.estado,
        fecha: sesion.fecha,
        hora: sesion.hora,
        fechaHora: fechaHora ? fechaHora.toString() : null, // Handle potential null
        now: now.toString(),
        enCurso: fechaHora && fin ? (
          (sesion.estado === "EN_CURSO" && now >= fechaHora && now <= fin) ||
          (sesion.estado === "PROGRAMADA" && now >= fechaHora && now <= fin)
        ) : false // Handle potential null in enCurso calculation
      }
    })
    sesionEnCurso = sesiones.find((sesion) => {
      const fechaHora = getLocalDateTime(sesion.fecha, sesion.hora);
      const fin = fechaHora ? new Date(fechaHora.getTime() + 2 * 60 * 60 * 1000) : null; // Handle potential null
      // Mostrar si está en EN_CURSO o si está PROGRAMADA y ya inició
      if (fechaHora && fin && sesion.estado === "EN_CURSO" && now >= fechaHora && now <= fin) return true; // Handle potential null
      if (fechaHora && fin && sesion.estado === "PROGRAMADA" && now >= fechaHora && now <= fin) { // Handle potential null
        requiereInicioManual = true
        return true
      }
      return false
    })
  }

  // Combine internal (junta directiva members) and external participants for CurrentSessionView
  let allParticipantes = [];
  if (sesionEnCurso) {
    allParticipantes = [
      ...(sesionEnCurso.sesiones_participantes || []).map((sp: any) => {
        if (sp.usuario_id && sp.usuarios) {
          return {
            id: sp.usuario_id,
            usuario_id: sp.usuario_id,
            usuarios: sp.usuarios,
            estado_asistencia: sp.estado_asistencia || 'PENDIENTE',
            isExternal: false,
            type: 'USUARIO',
          };
        } else if (sp.junta_directiva_miembro_id && sp.junta_directiva_miembros) {
          return {
            id: sp.junta_directiva_miembro_id,
            junta_directiva_miembro_id: sp.junta_directiva_miembro_id,
            junta_directiva_miembros: sp.junta_directiva_miembros,
            estado_asistencia: sp.estado_asistencia || 'PENDIENTE',
      isExternal: false,
            type: 'JUNTA_DIRECTIVA',
          };
        }
        return null; // En caso de datos inconsistentes
      }).filter(Boolean),
      ...(sesionEnCurso.sesion_participantes_externos || []).map((ep: any) => ({
        id: ep.id,
        nombre: ep.nombre,
        email: ep.email,
        estado_asistencia: ep.estado_asistencia || 'PENDIENTE',
        isExternal: true,
        type: 'EXTERNO',
      })),
    ];
  }

  console.log("DashboardPage - sesionEnCurso fetched:", sesionEnCurso);
  console.log("DashboardPage - allParticipantes for CurrentSessionView:", allParticipantes); // Debug combined participants

  // Simulación de punto de agenda actual y estado
  const puntoActual = sesionEnCurso?.agendas?.[0] || { nombre: "Nombre del punto", estado: "Pendiente" }
  const estadoPunto = puntoActual.estado || "Pendiente"
  // Simulación de tiempo restante (en segundos)
  const tiempoRestante = 900 // 15 minutos por punto, ejemplo

  return (
    <div className="flex flex-col items-center min-h-[95vh] bg-gray-50">
      <div className="flex justify-center items-center w-full flex-1">
        {sesionEnCurso ? (
          <CurrentSessionView
            sesionEnCurso={sesionEnCurso}
            requiereInicioManual={requiereInicioManual}
            participantes={allParticipantes}
          />
        ) : (
          <div className="bg-white rounded-2xl p-12 w-full max-w-xl shadow-lg border text-center">
            <h2 className="text-3xl font-bold mb-4">No hay ninguna sesión en curso</h2>
            <p className="text-gray-600">Cuando haya una sesión en curso, aparecerá aquí.</p>
          </div>
        )}
      </div>
    </div>
  )
}
