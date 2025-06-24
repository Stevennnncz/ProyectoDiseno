"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Calendar, MapPin, Users, Clock, Loader2 } from "lucide-react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { submitJustificacionAusencia, updateAsistenciaSesion } from "../../app/dashboard-usuario/actions"
import { useRouter } from "next/navigation"

interface Sesion {
  id: string
  codigo_sesion: string
  fecha: string
  hora: string
  modalidad: string
  lugar?: string
  estado: string
  tipo: string
  agendas?: Array<{
    id: string
    puntos_agenda: Array<{ count: number }>
  }>
  sesiones_usuarios?: Array<{
    usuario_id: string;
    estado_asistencia: string;
    asistira: boolean;
  }>;
}

interface UserSesionesTableProps {
  sesiones: Sesion[]
  justificaciones?: string[]
}

export function UserSesionesTable({ sesiones, justificaciones = [] }: UserSesionesTableProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [busqueda, setBusqueda] = useState("")
  // Usar un Map para gestionar el estado de cada sesión individualmente
  const [justificacionState, setJustificacionState] = useState<Map<string, {
    checked: boolean;
    file: File | null;
    isLoading: boolean;
    submitted: boolean;
  }>>(new Map())
  const router = useRouter()

  // Depuración: mostrar los IDs de sesiones y justificaciones
  console.log('justificaciones:', justificaciones.map(String));
  console.log('sesiones:', sesiones.map(s => String(s.id)));

  const sesiones_filtradas = sesiones.filter((sesion) => {
    const coincideBusqueda =
      sesion.codigo_sesion.toLowerCase().includes(busqueda.toLowerCase()) ||
      sesion.tipo.toLowerCase().includes(busqueda.toLowerCase())

    const coincideTipo = filtroTipo === "todos" || sesion.tipo === filtroTipo

    return coincideBusqueda && coincideTipo
  })

  // Inicializar justificacionState para cada sesión al cargar
  useState(() => {
    const initialState = new Map<string, {
      checked: boolean;
      file: File | null;
      isLoading: boolean;
      submitted: boolean;
    }>();
    sesiones.forEach(sesion => {
      const asistira = sesion.sesiones_usuarios?.[0]?.asistira;
      // Asegurar comparación de strings
      const sesionIdStr = String(sesion.id);
      const submitted = justificaciones.map(String).includes(sesionIdStr);
      initialState.set(sesion.id, {
        checked: asistira === false,
        file: null,
        isLoading: false,
        submitted,
      });
    });
    setJustificacionState(initialState);
  }, [sesiones, justificaciones]);

  const handleCheckboxChange = async (sesionId: string, checked: boolean) => {
    // Actualizar el estado local
    setJustificacionState(prevState => {
      const newState = new Map(prevState);
      newState.set(sesionId, {
        ...newState.get(sesionId)!,
        checked: checked,
        file: null, // Reset file if unchecked
      });
      return newState;
    });

    // Actualizar en la base de datos
    const result = await updateAsistenciaSesion(sesionId, !checked);
    
    if (result.success) {
      toast.success(result.message);
      router.refresh(); // Recargar la página para actualizar el estado visual
    } else {
      toast.error(result.error || "Error al actualizar el estado de asistencia");
      // Revertir el cambio en el estado local si falla
      setJustificacionState(prevState => {
        const newState = new Map(prevState);
        newState.set(sesionId, {
          ...newState.get(sesionId)!,
          checked: !checked,
        });
        return newState;
      });
    }
  }

  const handleFileChange = (sesionId: string, file: File | null) => {
    setJustificacionState(prevState => {
      const newState = new Map(prevState);
      newState.set(sesionId, { ...newState.get(sesionId)!, file: file });
      return newState;
    });
  }

  const handleSubmitJustificacion = async (sesionId: string) => {
    const currentState = justificacionState.get(sesionId)!;
    if (!currentState.checked) {
      toast.error("Debe marcar 'No asistiré' para enviar una justificación.");
      return;
    }
    if (!currentState.file) {
      toast.error("Debe adjuntar un archivo para justificar la ausencia.");
      return;
    }

    setJustificacionState(prevState => {
      const newState = new Map(prevState);
      newState.set(sesionId, { ...newState.get(sesionId)!, isLoading: true });
      return newState;
    });

    const formData = new FormData();
    formData.append("sesion_id", sesionId);
    if (currentState.file) {
      formData.append("archivo", currentState.file);
    }

    const result = await submitJustificacionAusencia(formData);

    setJustificacionState(prevState => {
      const newState = new Map(prevState);
      newState.set(sesionId, { ...newState.get(sesionId)!, isLoading: false });
      return newState;
    });

    if (result.success) {
      toast.success(result.message);
      setJustificacionState(prevState => {
        const newState = new Map(prevState);
        newState.set(sesionId, { ...newState.get(sesionId)!, submitted: true });
        return newState;
      });
      router.refresh(); // Recargar la página para actualizar el estado visual
    } else {
      toast.error(result.error || "Error al enviar justificación.");
    }
  }

  const getEstadoBadge = (estado: string) => {
    const variants = {
      PROGRAMADA: "default",
      EN_CURSO: "secondary",
      FINALIZADA: "outline",
      CANCELADA: "destructive",
    } as const

    return <Badge variant={variants[estado as keyof typeof variants] || "default"}>{estado.replace("_", " ")}</Badge>
  }

  const getModalidadIcon = (modalidad: string) => {
    switch (modalidad) {
      case "PRESENCIAL":
        return <MapPin className="h-4 w-4" />
      case "VIRTUAL":
        return <Users className="h-4 w-4" />
      case "HIBRIDA":
        return <Calendar className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Buscar por código o tipo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="ORDINARIA">Ordinaria</SelectItem>
            <SelectItem value="EXTRAORDINARIA">Extraordinaria</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de sesiones */}
      <div className="grid gap-4">
        {sesiones_filtradas.map((sesion) => {
          const sessionState = justificacionState.get(sesion.id) || { checked: false, file: null, isLoading: false, submitted: false };
          return (
            <Card key={sesion.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {sesion.codigo_sesion}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {sesion.tipo} • {format(parseISO(sesion.fecha), "PPP", { locale: es })} • {sesion.hora}
                    </p>
                  </div>
                  {getEstadoBadge(sesion.estado)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      {getModalidadIcon(sesion.modalidad)}
                      {sesion.modalidad}
                    </span>
                    {sesion.lugar && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {sesion.lugar}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {/* Sumar los puntos de todas las agendas */}
                      {Array.isArray(sesion.agendas)
                        ? sesion.agendas.reduce((acc, agenda) => acc + (agenda.puntos_agenda?.length || 0), 0)
                        : 0} puntos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard-usuario/sesiones/${sesion.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver agenda
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Sección "No asistirá" */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`no-asistira-${sesion.id}`}
                      checked={sessionState.checked}
                      onCheckedChange={(checked: boolean) => handleCheckboxChange(sesion.id, checked)}
                      disabled={sessionState.submitted || sessionState.isLoading}
                    />
                    <Label htmlFor={`no-asistira-${sesion.id}`}>
                      No asistiré
                    </Label>
                    {sessionState.submitted && <Badge variant="secondary">Justificación enviada</Badge>}
                  </div>

                  {sessionState.checked && !sessionState.submitted && (
                    <div className="space-y-4 mt-4 p-4 border rounded-md bg-gray-50">
                      <div>
                        <Label htmlFor={`archivo-${sesion.id}`}>Adjuntar Archivo</Label>
                        <Input
                          id={`archivo-${sesion.id}`}
                          type="file"
                          onChange={(e) => handleFileChange(sesion.id, e.target.files?.[0] || null)}
                          className="mt-1"
                          disabled={sessionState.isLoading}
                        />
                      </div>
                      <Button
                        onClick={() => handleSubmitJustificacion(sesion.id)}
                        disabled={sessionState.isLoading || !sessionState.file} // Deshabilitar si no hay archivo o está cargando
                        className="w-full"
                      >
                        {sessionState.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar Justificación
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {sesiones_filtradas.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No se encontraron sesiones que coincidan con los filtros.</p>
        </div>
      )}
    </div>
  )
} 