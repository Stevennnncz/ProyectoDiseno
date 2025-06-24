"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { createClient } from "@/lib/supabase/client"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Participant {
  usuario_id?: string;
  junta_directiva_miembro_id?: string;
  id?: string; // Para participantes externos
  usuarios?: {
    id: string;
    nombre: string;
    email: string;
  };
  junta_directiva_miembros?: {
    id: string;
    nombre_completo: string;
    correo: string;
  };
  nombre?: string; // Para participantes externos directamente
  email?: string; // Para participantes externos directamente
  estado_asistencia: string;
  isExternal: boolean;
  type: 'USUARIO' | 'JUNTA_DIRECTIVA' | 'EXTERNO';
}

interface AssignResponsiblePanelProps {
  puntoId: string;
  participantes: Participant[];
  onAgreementSaved: (agreement: any) => void;
  existingAgreement?: any; // New prop for existing agreement
}

export function AssignResponsiblePanel({
  puntoId,
  participantes,
  onAgreementSaved,
  existingAgreement,
}: AssignResponsiblePanelProps) {
  const [descripcion, setDescripcion] = useState(existingAgreement?.descripcion || "");
  const [fechaLimite, setFechaLimite] = useState<Date | undefined>(
    existingAgreement?.fecha_limite ? new Date(existingAgreement.fecha_limite) : undefined
  );
  const [selectedResponsibles, setSelectedResponsibles] = useState<string[]>(
    existingAgreement?.acuerdo_responsables?.map((ar: any) => {
      // Adaptar para los diferentes tipos de ID de responsable
      if (ar.usuario_id) return ar.usuario_id;
      if (ar.junta_directiva_miembro_id) return ar.junta_directiva_miembro_id;
      if (ar.external_participant_id) return ar.external_participant_id;
      return null;
    }).filter(Boolean) || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Effect to populate form when an existing agreement is passed
  useEffect(() => {
    if (existingAgreement) {
      setDescripcion(existingAgreement.descripcion || "");
      setFechaLimite(existingAgreement.fecha_limite ? new Date(existingAgreement.fecha_limite) : undefined);
      setSelectedResponsibles(existingAgreement.acuerdo_responsables?.map((ar: any) => {
        // Adaptar para los diferentes tipos de ID de responsable
        if (ar.usuario_id) return ar.usuario_id;
        if (ar.junta_directiva_miembro_id) return ar.junta_directiva_miembro_id;
        if (ar.external_participant_id) return ar.external_participant_id;
        return null;
      }).filter(Boolean) || []);
    } else {
      // Reset form if no existing agreement (e.g., switching to a new point without agreement)
      setDescripcion("");
      setFechaLimite(undefined);
      setSelectedResponsibles([]);
    }
  }, [existingAgreement]);

  const handleResponsibleChange = (participantId: string, isChecked: boolean) => {
    setSelectedResponsibles((prev) =>
      isChecked ? [...prev, participantId] : prev.filter((id) => id !== participantId)
    );
  };

  const handleSaveAgreement = async () => {
    setError(null);
    if (!descripcion.trim()) {
      setError("La descripción del acuerdo es requerida.");
      return;
    }
    if (selectedResponsibles.length === 0) {
      setError("Debe seleccionar al menos un responsable.");
      return;
    }

    setIsLoading(true);
    try {
      let acuerdoId = existingAgreement?.id;
      let acuerdoError: any = null;
      let acuerdoData: any = null;

      if (acuerdoId) {
        // Update existing agreement
        const { data, error } = await supabase
          .from("acuerdos")
          .update({
            descripcion: descripcion.trim(),
            fecha_limite: fechaLimite ? format(fechaLimite, "yyyy-MM-dd") : null,
          })
          .eq("id", acuerdoId)
          .select()
          .single();
        acuerdoData = data;
        acuerdoError = error;
      } else {
        // Create new agreement
        const { data, error } = await supabase
          .from("acuerdos")
          .insert({
            punto_id: puntoId,
            descripcion: descripcion.trim(),
            fecha_limite: fechaLimite ? format(fechaLimite, "yyyy-MM-dd") : null,
            estado: "PENDIENTE", // Initial state for agreement
          })
          .select()
          .single();
        acuerdoData = data;
        acuerdoError = error;
        acuerdoId = acuerdoData?.id; // Get the ID of the newly created agreement
      }

      if (acuerdoError || !acuerdoId) {
        throw new Error(`Error al ${acuerdoId ? 'actualizar' : 'crear'} el acuerdo: ${acuerdoError?.message || "Desconocido"}`);
      }

      // 2. Manage responsible persons for the agreement
      // First, delete existing responsibles for this agreement
      const { error: deleteError } = await supabase
        .from("acuerdo_responsables")
        .delete()
        .eq("acuerdo_id", acuerdoId);

      if (deleteError) {
        throw new Error(`Error al eliminar responsables anteriores: ${deleteError.message}`);
      }

      // Then, insert newly selected responsibles
      if (selectedResponsibles.length > 0) {
        const responsibleEntries = selectedResponsibles.map((participantId) => {
          const selectedParticipant = participantes.find(p => 
            (p.type === 'USUARIO' && p.usuario_id === participantId) ||
            (p.type === 'JUNTA_DIRECTIVA' && p.junta_directiva_miembro_id === participantId) ||
            (p.type === 'EXTERNO' && p.id === participantId)
          );
          
          if (!selectedParticipant) {
            console.warn(`Participante con ID ${participantId} no encontrado en la lista.`);
            return null; // O manejar el error de alguna otra forma
          }

          if (selectedParticipant.type === 'USUARIO') {
            return { acuerdo_id: acuerdoId, usuario_id: participantId };
          } else if (selectedParticipant.type === 'JUNTA_DIRECTIVA') {
            return { acuerdo_id: acuerdoId, junta_directiva_miembro_id: participantId };
          } else if (selectedParticipant.type === 'EXTERNO') {
            return { acuerdo_id: acuerdoId, external_participant_id: participantId };
          }
          return null;
        }).filter(Boolean); // Filtra cualquier null que se haya retornado

        const { error: insertResponsiblesError } = await supabase
          .from("acuerdo_responsables")
          .insert(responsibleEntries);

        if (insertResponsiblesError) {
          throw new Error(`Error al asignar nuevos responsables: ${insertResponsiblesError.message}`);
        }
      }

      // Finally, fetch the complete updated agreement with its responsibles
      const { data: finalAcuerdoData, error: finalAcuerdoError } = await supabase
        .from("acuerdos")
        .select(`
          *,
          acuerdo_responsables (
            usuario_id,
            junta_directiva_miembro_id,
            external_participant_id
          )
        `)
        .eq("id", acuerdoId)
        .single();

      if (finalAcuerdoError) {
        throw new Error(`Error al obtener el acuerdo actualizado: ${finalAcuerdoError.message}`);
      }

      onAgreementSaved(finalAcuerdoData); // Pass the updated/created agreement with responsibles
      // No reset here, as we want to keep the loaded data if it was an update
    } catch (err: any) {
      console.error("Error saving agreement:", err);
      setError(err.message || "Error al guardar el acuerdo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Asignar Responsable a Acuerdo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="descripcion">Descripción del Acuerdo</Label>
          <Textarea
            id="descripcion"
            placeholder="Ej: Revisar el informe financiero del Q2"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <Label>Fecha Máxima</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-full justify-start text-left font-normal ${
                  !fechaLimite && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fechaLimite ? (
                  format(fechaLimite, "PPP", { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={fechaLimite}
                onSelect={setFechaLimite}
                initialFocus
                locale={es}
                fromDate={new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label>Personas Convocadas (Responsables)</Label>
          <ScrollArea className="h-[150px] w-full rounded-md border p-4">
            {participantes.length > 0 ? (
              participantes.map((participante) => {
                let displayId = '';
                let displayName = 'N/A';
                let displayEmail = 'N/A';
                
                if (participante.type === 'USUARIO' && participante.usuarios) {
                  displayId = participante.usuario_id || '';
                  displayName = participante.usuarios.nombre || 'N/A';
                  displayEmail = participante.usuarios.email || 'N/A';
                } else if (participante.type === 'JUNTA_DIRECTIVA' && participante.junta_directiva_miembros) {
                  displayId = participante.junta_directiva_miembro_id || '';
                  displayName = participante.junta_directiva_miembros.nombre_completo || 'N/A';
                  displayEmail = participante.junta_directiva_miembros.correo || 'N/A';
                } else if (participante.type === 'EXTERNO') {
                  displayId = participante.id || '';
                  displayName = participante.nombre || 'N/A';
                  displayEmail = participante.email || 'N/A';
                }

                return (
                  <div key={displayId} className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id={`responsable-${displayId}`}
                      checked={selectedResponsibles.includes(displayId)}
                      onCheckedChange={(checked) => handleResponsibleChange(displayId, checked as boolean)}
                    />
                    <Label htmlFor={`responsable-${displayId}`}>
                      {displayName} ({displayEmail})
                    </Label>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">No hay participantes disponibles.</p>
            )}
          </ScrollArea>
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <Button onClick={handleSaveAgreement} className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Guardar Acuerdo
        </Button>
      </CardContent>
    </Card>
  );
} 