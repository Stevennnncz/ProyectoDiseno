"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ParticipanteConAsistencia {
  usuario_id?: string; // Para usuarios internos
  junta_directiva_miembro_id?: string; // Para miembros de la junta directiva
  id?: string; // Para participantes externos
  usuarios?: { id: string; nombre: string; email: string };
  junta_directiva_miembros?: { id: string; nombre_completo: string; correo: string };
  nombre?: string; // Para participantes externos
  email?: string; // Para participantes externos
  estado_asistencia: 'PENDIENTE' | 'PRESENTE' | 'AUSENTE';
  isExternal: boolean;
  type: 'USUARIO' | 'JUNTA_DIRECTIVA' | 'EXTERNO';
}

interface HistoricalAttendanceViewProps {
  sesion: any; // Mantener por si se necesitan otros datos de la sesión
  participantes: Array<ParticipanteConAsistencia>; // La lista de participantes ya procesada
}

export function HistoricalAttendanceView({ sesion, participantes }: HistoricalAttendanceViewProps) {
  const allParticipantes = participantes;

  const totalConvocados = allParticipantes.length;
  const presentesCount = allParticipantes.filter((p: ParticipanteConAsistencia) => p.estado_asistencia === 'PRESENTE').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asistencia</CardTitle>
        {/* No CardDescription needed as per request */}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen de asistencia */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalConvocados}</p>
            <p className="text-sm text-gray-600">Convocados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{presentesCount}</p>
            <p className="text-sm text-gray-600">Presentes</p>
          </div>
          {/* Optionally show quorum badge based on final count if applicable/meaningful */}
          {/* <Badge variant={presentesCount >= totalConvocados / 2 ? "default" : "secondary"}>
            Quórum: {presentesCount >= totalConvocados / 2 ? "Alcanzado" : "Pendiente"}
          </Badge> */}
        </div>

        {/* Lista de participantes */}
        <ScrollArea className="h-[300px] border rounded-md p-4">
          <div className="space-y-3">
            {allParticipantes.length === 0 ? (
              <p className="text-gray-500">No hay participantes registrados para esta sesión.</p>
            ) : (
              allParticipantes.map((participante: ParticipanteConAsistencia) => {
                let displayName = 'N/A';
                let displayEmail = 'N/A';

                if (participante.type === 'USUARIO' && participante.usuarios) {
                  displayName = participante.usuarios.nombre || 'N/A';
                  displayEmail = participante.usuarios.email || 'N/A';
                } else if (participante.type === 'JUNTA_DIRECTIVA' && participante.junta_directiva_miembros) {
                  displayName = participante.junta_directiva_miembros.nombre_completo || 'N/A';
                  displayEmail = participante.junta_directiva_miembros.correo || 'N/A';
                } else if (participante.type === 'EXTERNO') {
                  displayName = participante.nombre || participante.email || 'N/A';
                  displayEmail = participante.email || 'N/A';
                }

                // Usar un ID único para la clave, combinando el tipo y un ID existente
                const keyId = participante.usuario_id || participante.junta_directiva_miembro_id || participante.id || `${participante.type}-${displayEmail}`;

                return (
                  <div key={keyId} className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">
                      {displayName} ({displayEmail})
                    </p>
                    <Badge variant={participante.estado_asistencia === 'PRESENTE' ? "default" : "secondary"}>
                      {participante.estado_asistencia}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 