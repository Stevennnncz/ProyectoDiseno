import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { SesionesTable } from "@/components/sesiones/sesiones-table"

export default async function SesionesPage() {
  const supabase = await createClient()

  // Obtener sesiones con datos relacionados
  const { data: sesiones, error } = await supabase
    .from("sesiones")
    .select(`
      *,
      agendas (
        id,
        puntos_agenda (
          id,
          orden,
          titulo,
          descripcion,
          tiempo_estimado,
          categoria,
          requiere_votacion
        )
      ),
      sesiones_participantes (
        usuario_id,
        junta_directiva_miembro_id,
        usuarios ( id, nombre, email ),
        junta_directiva_miembros ( id, nombre_completo, correo )
      ),
      sesion_participantes_externos (
        id,
        email
      )
    `)
    .eq("estado", "PROGRAMADA")
    .order("fecha", { ascending: true })

  if (error) {
    console.error("Error fetching sesiones:", error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Sesiones</h1>
        <p className="text-gray-600">Administra las sesiones de junta directiva</p>
      </div>

      <Suspense fallback={<div>Cargando sesiones...</div>}>
        <SesionesTable sesiones={sesiones || []} />
      </Suspense>
    </div>
  )
} 