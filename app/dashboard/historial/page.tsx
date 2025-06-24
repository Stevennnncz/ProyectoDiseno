import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { HistorialTable } from "@/components/historial/historial-table"

export default async function HistorialPage() {
  const supabase = await createClient()

  const { data: sesiones, error } = await supabase
    .from("sesiones")
    .select(`
      *,
      agendas (
        id,
        puntos_agenda (
          id,
          titulo,
          acuerdos (
            id,
            descripcion,
            estado
          )
        )
      ),
      actas (
        id,
        url,
        fecha_generacion
      )
    `)
    .in("estado", ["FINALIZADA", "CANCELADA"])
    .order("fecha", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historial de Sesiones</h1>
        <p className="text-gray-600">Consulta sesiones pasadas y sus resultados</p>
      </div>

      <Suspense fallback={<div>Cargando historial...</div>}>
        <HistorialTable sesiones={sesiones || []} />
      </Suspense>
    </div>
  )
}
