import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { AgendaOverview } from "@/components/agenda/agenda-overview"

export default async function AgendaPage() {
  const supabase = await createClient()

  // Obtener sesiones próximas con sus agendas
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
          requiere_votacion,
          documentos (
            id,
            nombre,
            url,
            tipo
          )
        )
      )
    `)
    .in("estado", ["PROGRAMADA", "EN_CURSO"])
    .order("fecha", { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Agenda</h1>
        <p className="text-gray-600">Administra los puntos de agenda de las sesiones</p>
      </div>

      <Suspense fallback={<div>Cargando agendas...</div>}>
        <AgendaOverview sesiones={sesiones || []} />
      </Suspense>
    </div>
  )
}
