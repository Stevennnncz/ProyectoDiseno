"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface ParticipanteConAsistencia {
  usuario_id?: string; // Para usuarios internos
  junta_directiva_miembro_id?: string; // Para miembros de la junta directiva
  id?: string; // Para participantes externos
  usuarios?: { id: string; nombre: string; email: string };
  junta_directiva_miembros?: { id: string; nombre_completo: string; correo: string };
  nombre?: string; // Para participantes externos (aunque ya viene en .usuarios para internos)
  email?: string; // Para participantes externos
  estado_asistencia: 'PENDIENTE' | 'PRESENTE' | 'AUSENTE';
  isExternal: boolean;
  type: 'USUARIO' | 'JUNTA_DIRECTIVA' | 'EXTERNO';
}

interface AsistenciaPanelProps {
  participantes: Array<ParticipanteConAsistencia>; // Lista inicial con todos los datos
  sessionStatus: string;
  sessionId: string;
  onQuorumChange?: (hasQuorum: boolean) => void;
}

export function AsistenciaPanel({ participantes: initialParticipantes, sessionStatus, sessionId, onQuorumChange }: AsistenciaPanelProps) {
  const [attendanceStatus, setAttendanceStatus] = useState<ParticipanteConAsistencia[]>(initialParticipantes.map(p => ({
    ...p,
    estado_asistencia: p.estado_asistencia || 'PENDIENTE', // Asegura un estado por defecto si es null/undefined
  })));
  const [isLoading, setIsLoading] = useState(false); // No isLoading de fetch inicial
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  // New useEffect to calculate and report quorum whenever attendanceStatus changes
  useEffect(() => {
    const currentPresentesCount = attendanceStatus.filter(p => p.estado_asistencia === 'PRESENTE').length;
    const currentTotalParticipantes = attendanceStatus.length;
    if (onQuorumChange) {
      onQuorumChange(currentPresentesCount >= currentTotalParticipantes / 2);
    }
  }, [attendanceStatus, onQuorumChange]);

  const handleAttendanceChange = async (participantId: string, isPresent: boolean, type: 'USUARIO' | 'JUNTA_DIRECTIVA' | 'EXTERNO') => {
    // Optimistically update the UI
    setAttendanceStatus(prev => {
      const updatedStatus = prev.map((p: ParticipanteConAsistencia) => {
        let targetId = '';
        if (p.type === 'USUARIO') targetId = p.usuario_id || '';
        else if (p.type === 'JUNTA_DIRECTIVA') targetId = p.junta_directiva_miembro_id || '';
        else if (p.type === 'EXTERNO') targetId = p.id || '';
        
        return targetId === participantId
          ? { ...p, estado_asistencia: (isPresent ? 'PRESENTE' : 'AUSENTE') } as ParticipanteConAsistencia
          : p
      });
      return updatedStatus;
    });

    const newStatus = isPresent ? 'PRESENTE' : 'AUSENTE';

    try {
      if (type === 'USUARIO' || type === 'JUNTA_DIRECTIVA') {
        const { error } = await supabase
          .from('sesiones_participantes')
          .update({ estado_asistencia: newStatus })
          .eq('sesion_id', sessionId)
          .or(
            `usuario_id.eq.${participantId},junta_directiva_miembro_id.eq.${participantId}`
          ); // Update using OR for either ID type

        if (error) {
          console.error("Error updating attendance in DB for internal participant:", error);
          alert("Error al actualizar la asistencia en la base de datos para el participante interno.");
        } else {
          console.log("Asistencia actualizada exitosamente en sesiones_participantes.", participantId, newStatus);
          router.refresh();
        }
      } else if (type === 'EXTERNO') {
        const { error } = await supabase
          .from('sesion_participantes_externos')
          .update({ estado_asistencia: newStatus })
          .eq('sesion_id', sessionId)
          .eq('id', participantId);

        if (error) {
          console.error("Error updating attendance in DB for external user:", error);
          alert("Error al actualizar la asistencia de participante externo en la base de datos.");
        } else {
          console.log("Asistencia actualizada exitosamente en sesion_participantes_externos.", participantId, newStatus);
          router.refresh();
        }
      }
    } catch (error: any) {
      console.error("Error in handleAttendanceChange:", error);
      alert(`Error al actualizar la asistencia: ${error.message}`);
    }
  };

  const totalParticipantes = attendanceStatus.length;
  const presentesCount = attendanceStatus.filter(p => p.estado_asistencia === 'PRESENTE').length;
  // Enable checkboxes if session is EN_CURSO or PROGRAMADA (to allow quorum control before start)
  const canChangeAttendance = sessionStatus === "EN_CURSO" || sessionStatus === "PROGRAMADA";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Cargando asistencia...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
     return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">{error}</p>
           {/* Optionally show participants without attendance data on error */}
            <div className="space-y-3 mt-4">
            {initialParticipantes.map((participante) => {
                let displayId = participante.id || participante.usuario_id || participante.junta_directiva_miembro_id || '';
                let displayName = 'N/A';
                let displayEmail = 'N/A';

                if (participante.type === 'USUARIO' && participante.usuarios) {
                    displayName = participante.usuarios.nombre || 'N/A';
                    displayEmail = participante.usuarios.email || 'N/A';
                } else if (participante.type === 'JUNTA_DIRECTIVA' && participante.junta_directiva_miembros) {
                    displayName = participante.junta_directiva_miembros.nombre_completo || 'N/A';
                    displayEmail = participante.junta_directiva_miembros.correo || 'N/A';
                } else if (participante.type === 'EXTERNO') {
                    displayName = participante.nombre || 'N/A';
                    displayEmail = participante.email || 'N/A';
                }

                return (
                  <div key={displayId} className="flex items-center justify-between" style={{ marginBottom: '40px' }}>
                    <Label
                      htmlFor={`asistencia-${displayId}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 mr-2"
                    >
                      {displayName} ({displayEmail})
                    </Label>
                     <Checkbox
                      id={`asistencia-${displayId}`}
                      checked={false} // Show as unchecked on error
                      disabled={true} // Disable checkboxes on error
                    />
                  </div>
                );
              })
            }
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Control de Quórum y Asistencia</CardTitle>
        <CardDescription>Marque los participantes presentes en la sesión</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen de asistencia */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalParticipantes}</p>
            <p className="text-sm text-gray-600">Convocados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{presentesCount}</p>
            <p className="text-sm text-gray-600">Presentes</p>
          </div>
          <Badge variant={presentesCount >= totalParticipantes / 2 ? "default" : "secondary"}>
            Quórum: {presentesCount >= totalParticipantes / 2 ? "Alcanzado" : "Pendiente"}
          </Badge>
        </div>

        <div className="space-y-10">
          {attendanceStatus.length === 0 ? (
            <p className="text-gray-500">No hay participantes registrados para esta sesión.</p>
          ) : (
            <ScrollArea className="h-[200px] pr-4">
              <div className="flex flex-col py-6 gap-y-10">
              {attendanceStatus.map((participante: ParticipanteConAsistencia) => {
                let displayId = participante.id || participante.usuario_id || participante.junta_directiva_miembro_id || '';
                let displayName = 'N/A';
                let displayEmail = 'N/A';

                if (participante.type === 'USUARIO' && participante.usuarios) {
                  displayName = participante.usuarios.nombre || 'N/A';
                  displayEmail = participante.usuarios.email || 'N/A';
                } else if (participante.type === 'JUNTA_DIRECTIVA' && participante.junta_directiva_miembros) {
                  displayName = participante.junta_directiva_miembros.nombre_completo || 'N/A';
                  displayEmail = participante.junta_directiva_miembros.correo || 'N/A';
                } else if (participante.type === 'EXTERNO') {
                  displayName = participante.nombre || 'N/A';
                  displayEmail = participante.email || 'N/A';
                }

                return (
                  <div key={displayId} className="flex items-center justify-between">
                    <Label
                      htmlFor={`asistencia-${displayId}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 mr-2"
                    >
                      {displayName} ({displayEmail})
                    </Label>
                    <Checkbox
                      id={`asistencia-${displayId}`}
                      checked={participante.estado_asistencia === 'PRESENTE'}
                      onCheckedChange={(checkedState) => {
                        handleAttendanceChange(displayId, checkedState === true, participante.type);
                      }}
                      disabled={!canChangeAttendance}
                    />
                  </div>
                );
              })}
            </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 