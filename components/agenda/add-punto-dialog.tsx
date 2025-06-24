"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { upsertPuntoAgenda } from "@/app/dashboard/sesiones/[id]/actions";

const puntoSchema = z.object({
  titulo: z.string().min(1, "El título es requerido"),
  descripcion: z.string().optional(),
  tiempo_estimado: z.number().min(1).max(300).optional(),
  categoria: z.enum(["INFORMATIVO", "APROBACION", "DISCUSION"]),
  requiere_votacion: z.boolean().default(false),
  responsable: z.string().optional(),
  responsibleType: z.enum(["USUARIO", "JUNTA_DIRECTIVA", "EXTERNO"]).optional(),
  documentos: z.any().optional(),
})

type PuntoFormData = z.infer<typeof puntoSchema> & { documentos?: FileList | null };

interface AddPuntoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agendaId?: string
  orden: number
  puntoToEdit?: any
  participantes: Array<{
    usuario_id: string;
    junta_directiva_miembro_id?: string;
    id?: string;
    usuarios?: { id: string; nombre: string; email: string };
    junta_directiva_miembros?: { id: string; nombre_completo: string; correo: string };
    nombre?: string;
    email?: string;
    type: 'USUARIO' | 'JUNTA_DIRECTIVA' | 'EXTERNO';
  }>
}

export function AddPuntoDialog({ open, onOpenChange, agendaId, orden, puntoToEdit, participantes }: AddPuntoDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PuntoFormData>({
    resolver: zodResolver(puntoSchema),
    defaultValues: {
      requiere_votacion: false,
      responsable: '',
      responsibleType: undefined,
      documentos: null,
    },
  })

  useEffect(() => {
    if (open) {
      let currentResponsableId = '';
      let currentResponsibleType: 'USUARIO' | 'JUNTA_DIRECTIVA' | 'EXTERNO' | undefined = undefined;

      if (puntoToEdit && puntoToEdit.punto_responsables?.[0]) {
        const resp = puntoToEdit.punto_responsables[0];
        if (resp.usuario_id) {
          currentResponsableId = resp.usuario_id;
          currentResponsibleType = 'USUARIO';
        } else if (resp.junta_directiva_miembro_id) {
          currentResponsableId = resp.junta_directiva_miembro_id;
          currentResponsibleType = 'JUNTA_DIRECTIVA';
        } else if (resp.external_participant_id) {
          currentResponsableId = resp.external_participant_id;
          currentResponsibleType = 'EXTERNO';
        }
      }

      if (puntoToEdit) {
        reset({
          titulo: puntoToEdit.titulo,
          descripcion: puntoToEdit.descripcion || '',
          tiempo_estimado: puntoToEdit.tiempo_estimado || '',
          categoria: puntoToEdit.categoria,
          requiere_votacion: puntoToEdit.requiere_votacion,
          responsable: currentResponsableId,
          responsibleType: currentResponsibleType,
          documentos: null,
        });
      } else {
        reset({
          requiere_votacion: false,
          responsable: '',
          responsibleType: undefined,
          documentos: null,
          titulo: '',
          descripcion: '',
          tiempo_estimado: '',
          categoria: undefined,
        });
      }
    }
  }, [open, puntoToEdit])

  const requiereVotacion = watch("requiere_votacion")
  const responsableSeleccionadoId = watch("responsable") || '';
  const responsableSeleccionadoType = watch("responsibleType");

  const onSubmit = async (data: PuntoFormData) => {
    if (!agendaId && !puntoToEdit) {
      setError("ID de agenda no disponible y no hay punto para editar.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData();
      if (puntoToEdit?.id) {
        formData.append("id", puntoToEdit.id);
      }
      formData.append("agenda_id", agendaId || "");
      formData.append("orden", String(orden));
      formData.append("titulo", data.titulo);
      if (data.descripcion) formData.append("descripcion", data.descripcion);
      if (data.tiempo_estimado) formData.append("tiempo_estimado", String(data.tiempo_estimado));
      formData.append("categoria", data.categoria);
      formData.append("requiere_votacion", String(data.requiere_votacion));

      if (data.responsable) {
        formData.append("responsableId", data.responsable);
        const selectedParticipant = participantes.find(p => 
          (p.type === 'USUARIO' && p.usuario_id === data.responsable) ||
          (p.type === 'JUNTA_DIRECTIVA' && p.junta_directiva_miembro_id === data.responsable) ||
          (p.type === 'EXTERNO' && p.id === data.responsable)
        );
        if (selectedParticipant) {
          formData.append("responsibleType", selectedParticipant.type);
        } else {
            if (data.responsibleType) {
                formData.append("responsibleType", data.responsibleType);
            } else {
                formData.append("responsibleType", "USUARIO"); 
            }
        }
      }

      if (data.documentos && data.documentos.length > 0) {
        for (let i = 0; i < data.documentos.length; i++) {
          formData.append(`documentos`, data.documentos[i]);
        }
      }

      const result = await upsertPuntoAgenda(formData);

      if (!result.success) {
        throw new Error(result.error || "Error al guardar el punto.");
      }

      onOpenChange(false);
      router.refresh();
    } catch (err: any) {
      console.error("Error saving point:", err);
      setError(err.message || "Error al guardar el punto.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{puntoToEdit ? "Editar Punto de Agenda" : "Agregar Punto a la Agenda"}</DialogTitle>
          <DialogDescription>{puntoToEdit ? "Modifique la información del punto de agenda" : "Complete la información del nuevo punto de agenda"}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="titulo">Título del Punto</Label>
              <Input id="titulo" placeholder="Ej: Aprobación del presupuesto 2024" {...register("titulo")} />
              {errors.titulo && <p className="text-sm text-red-500">{errors.titulo.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción (Opcional)</Label>
              <Textarea id="descripcion" placeholder="Descripción detallada del punto..." {...register("descripcion")} />
              {errors.descripcion && <p className="text-sm text-red-500">{errors.descripcion.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select onValueChange={(value) => setValue("categoria", value as any)} value={watch("categoria")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFORMATIVO">Informativo</SelectItem>
                    <SelectItem value="APROBACION">Aprobación</SelectItem>
                    <SelectItem value="DISCUSION">Discusión</SelectItem>
                  </SelectContent>
                </Select>
                {errors.categoria && <p className="text-sm text-red-500">{errors.categoria.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiempo_estimado">Tiempo Estimado (min)</Label>
                <Input
                  id="tiempo_estimado"
                  type="number"
                  min="1"
                  max="300"
                  placeholder="15"
                  {...register("tiempo_estimado", { valueAsNumber: true })}
                />
                {errors.tiempo_estimado && <p className="text-sm text-red-500">{errors.tiempo_estimado.message}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiere_votacion"
                checked={requiereVotacion}
                onCheckedChange={(checked) => setValue("requiere_votacion", !!checked)}
              />
              <Label htmlFor="requiere_votacion">Este punto requiere votación</Label>
            </div>

            <div className="space-y-2">
              <Label>Responsable (Opcional)</Label>
              <ScrollArea className="h-[150px] border rounded-md p-4">
                <div className="space-y-2">
                  {participantes.map((participante) => {
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
                    } else if (participante.type === 'EXTERNO' && participante.id) {
                      displayId = participante.id || '';
                      displayName = participante.nombre || 'N/A';
                      displayEmail = participante.email || 'N/A';
                    }

                    return (
                      <div key={displayId} className="flex items-center space-x-2">
                      <Checkbox
                          id={`responsable-${displayId}`}
                          checked={responsableSeleccionadoId === displayId}
                        onCheckedChange={(checkedState) => {
                          const isChecked = checkedState === true;
                            setValue("responsable", isChecked ? displayId : '');
                            setValue("responsibleType", isChecked ? participante.type : undefined);
                        }}
                      />
                      <label
                          htmlFor={`responsable-${displayId}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                          {displayName} ({displayEmail})
                      </label>
                    </div>
                    );
                  })}
                </div>
              </ScrollArea>
              {errors.responsable && <p className="text-sm text-red-500">{errors.responsable.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentos">Adjuntar Documentos (Opcional)</Label>
              <Input id="documentos" type="file" multiple {...register("documentos")} accept=".pdf" />
              {errors.documentos && <p className="text-sm text-red-500">{errors.documentos.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {puntoToEdit ? "Actualizar Punto" : "Agregar Punto"}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
