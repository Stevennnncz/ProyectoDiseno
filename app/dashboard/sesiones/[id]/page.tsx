import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SessionDetails } from "@/components/sesiones/session-details"

interface SessionPageProps {
  params: Promise<{ id: string }>
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params
  console.log("Attempting to fetch session with ID:", id);
  const supabase = await createClient()

  const { data: sesion, error } = await supabase
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
          estado_votacion,
          votos_a_favor,
          votos_en_contra,
          votos_abstenciones,
          anotaciones,
          documentos (
            id,
            nombre,
            url,
            tipo
          ),
          votaciones (
            id,
            estado,
            votos (
              id,
              opcion,
              usuario_id
            )
          ),
          acuerdos (
            id,
            descripcion,
            fecha_limite,
            estado,
            acuerdo_responsables (
              usuario_id,
              usuarios (id, nombre, email),
              junta_directiva_miembro_id,
              junta_directiva_miembros (id, nombre_completo, correo),
              external_participant_id,
              sesion_participantes_externos ( id, nombre, email )
            )
          ),
          punto_responsables (
            usuario_id,
            usuarios ( id, nombre, email ),
            junta_directiva_miembro_id,
            junta_directiva_miembros (id, nombre_completo, correo),
            external_participant_id,
            sesion_participantes_externos ( id, nombre, email )
          )
        )
      ),
      sesiones_participantes (
        usuario_id,
        junta_directiva_miembro_id,
        estado_asistencia,
        usuarios ( id, nombre, email ),
        junta_directiva_miembros (id, nombre_completo, correo)
      ),
      sesion_participantes_externos (
        id,
        email,
        nombre,
        estado_asistencia
      )
    `)
    .eq("id", id)
    .order('orden', { foreignTable: 'agendas.puntos_agenda' })
    .single()

  if (error || !sesion) {
    console.error("Error fetching session or session not found. ID used:", id, "Error details:", error, "Session object:", sesion);
    notFound()
  }

  console.log("Session details fetched successfully for ID:", id, ":", JSON.stringify(sesion, null, 2));
  // Iterar sobre puntos_agenda para inspeccionar documentos en detalle
  sesion.agendas?.[0]?.puntos_agenda?.forEach((punto: any, index: number) => {
    if (punto.documentos && punto.documentos.length > 0) {
      console.log(`Documentos para el punto ${index + 1} (${punto.titulo}):`, JSON.stringify(punto.documentos, null, 2));
    } else {
      console.log(`Punto ${index + 1} (${punto.titulo}): No tiene documentos adjuntos.`);
    }
  });

  // Combinar participantes internos (usuarios y miembros de la junta) y externos
  const allParticipantes = [
    ...(sesion.sesiones_participantes || []).map((sp: any) => {
      if (sp.usuario_id && sp.usuarios) {
        // Es un usuario interno
        return {
          id: sp.usuario_id,
          usuario_id: sp.usuario_id,
          usuarios: sp.usuarios,
          estado_asistencia: sp.estado_asistencia || 'PENDIENTE',
          isExternal: false,
          type: 'USUARIO'
        };
      } else if (sp.junta_directiva_miembro_id && sp.junta_directiva_miembros) {
        // Es un miembro de la junta directiva
        return {
          id: sp.junta_directiva_miembro_id,
          junta_directiva_miembro_id: sp.junta_directiva_miembro_id,
          junta_directiva_miembros: sp.junta_directiva_miembros,
          estado_asistencia: sp.estado_asistencia || 'PENDIENTE',
          isExternal: false,
          type: 'JUNTA_DIRECTIVA'
        };
      }
      return null; // En caso de datos inconsistentes
    }).filter(Boolean), // Filtra cualquier null que se haya retornado
    ...(sesion.sesion_participantes_externos || []).map((ep: any) => ({
      id: ep.id,
      nombre: ep.nombre,
      email: ep.email,
      estado_asistencia: ep.estado_asistencia || 'PENDIENTE',
      isExternal: true,
      type: 'EXTERNO'
    })),
  ];

  console.log("All Participants sent to SessionDetails (and then to AsistenciaPanel/HistoricalAttendanceView): ", JSON.stringify(allParticipantes, null, 2));

  return <SessionDetails sesion={sesion} participantes={allParticipantes} />
}
