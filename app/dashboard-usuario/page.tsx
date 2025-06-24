import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { Button } from "@/components/ui/button"

function getLocalDateTime(fecha: string | null | undefined, hora: string | null | undefined): Date | null {
  if (!fecha || !hora) return null;
  const [year, month, day] = fecha.split('-').map(Number)
  const [h, m, s] = hora.split(':').map(Number)
  
  // Crear fecha en zona horaria específica (ej: Mexico)
  const date = new Date(year, month - 1, day, h, m, s, 0)
  
  // Ajustar por diferencia de zona horaria (ej: UTC-6 para México)
  const offsetHours = 6; // Cambia según tu zona horaria
  date.setHours(date.getHours() + offsetHours);
  
  return date;
}

export default async function DashboardUsuarioPage() {
  const supabase = await createClient()

  // Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Verificar si hay usuario autenticado
  if (!user) {
    redirect('/login')
  }

  // Obtener el rol del usuario
  const { data: userData, error: userError } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    console.error("Error al obtener el rol del usuario:", userError)
    redirect('/login')
  }

  // Si es administrador, redirigir al dashboard principal
  if (userData.rol === 'ADMINISTRADOR') {
    redirect('/dashboard')
  }

  // Obtener las sesiones en las que participa el usuario
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
      sesiones_usuarios (
        usuario_id,
        estado_asistencia,
        usuarios ( id, nombre, email )
      ),
      sesion_participantes_externos (
        id,
        email,
        estado_asistencia
      )
    `)
    .eq('sesiones_usuarios.usuario_id', user.id) // Asegurarse de que el usuario participa
    .order("fecha", { ascending: true })

  if (error) {
    console.error("Error al obtener las sesiones:", error)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-white rounded-lg p-8 shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">Hubo un error al cargar las sesiones.</p>
        </div>
      </div>
    )
  }

  // Encontrar la sesión en curso
  const now = new Date()
  let sesionEnCurso = null;

  if (sesiones && sesiones.length > 0) {
    sesionEnCurso = sesiones.find((sesion) => {
      const fechaHora = getLocalDateTime(sesion.fecha, sesion.hora);
      const fin = fechaHora ? new Date(fechaHora.getTime() + 2 * 60 * 60 * 1000) : null;
      return fechaHora && fin && 
             (sesion.estado === "EN_CURSO" || sesion.estado === "PROGRAMADA") && 
             now >= fechaHora && now <= fin;
    });
  }

  return (
    <div className="flex flex-col items-center min-h-[95vh] bg-gray-50">
      <div className="flex justify-center items-center w-full flex-1">
        {sesionEnCurso ? (
          <div className="bg-white rounded-2xl p-12 w-full max-w-xl shadow-lg border text-center">
            <h2 className="text-3xl font-bold mb-4">Sesión en Curso</h2>
            <p className="text-gray-700 text-2xl font-semibold mb-6">
              {sesionEnCurso.codigo_sesion || sesionEnCurso.titulo}
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              <Link href={`/dashboard-usuario/sesiones/${sesionEnCurso.id}`}>Ver Agenda</Link>
            </Button>
          </div>
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