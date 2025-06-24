import { getJuntaDirectivaMiembros } from "./actions"
import { JuntaDirectivaClient } from "@/components/junta-directiva/junta-directiva-client"

// Este es el Server Component que obtiene los datos
export default async function JuntaDirectivaPage() {
  const { data: miembros, error } = await getJuntaDirectivaMiembros()

  if (error) {
    return <div className="text-red-500">Error al cargar los miembros de la junta directiva: {error}</div>
  }

  return <JuntaDirectivaClient initialMiembros={miembros || []} />
} 