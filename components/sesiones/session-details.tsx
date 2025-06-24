"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, MapPin, Play, Pause, FileText } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { AgendaManager } from "@/components/agenda/agenda-manager"
import { VotingPanel } from "@/components/voting/voting-panel"
import { AcuerdosPanel } from "@/components/acuerdos/acuerdos-panel"
import { AsistenciaPanel } from "@/components/asistencia/asistencia-panel"
import { HistoricalAttendanceView } from "@/components/asistencia/historical-attendance-view"
import { updateSessionStatus } from "@/app/dashboard/sesiones/[id]/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PuntoAgenda {
  id: string;
  orden: number;
  titulo: string;
  descripcion: string | null;
  tiempo_estimado: number | null;
  categoria: string;
  requiere_votacion: boolean;
  // Puedes añadir más propiedades aquí si son necesarias
}

interface SessionDetailsProps {
  sesion: any
  participantes: any[]
}

export function SessionDetails({ sesion, participantes }: SessionDetailsProps) {
  console.log("SessionDetails - sesion object:", JSON.stringify(sesion, null, 2));
  const [activeTab, setActiveTab] = useState("agenda")
  const [sessionStatus, setSessionStatus] = useState(sesion.estado)
  const router = useRouter();

  const getEstadoBadge = (estado: string) => {
    const variants = {
      PROGRAMADA: { variant: "default" as const, color: "bg-blue-100 text-blue-800" },
      EN_CURSO: { variant: "secondary" as const, color: "bg-green-100 text-green-800" },
      FINALIZADA: { variant: "outline" as const, color: "bg-gray-100 text-gray-800" },
      CANCELADA: { variant: "destructive" as const, color: "bg-red-100 text-red-800" },
    }

    const config = variants[estado as keyof typeof variants] || variants.PROGRAMADA

    return <Badge variant={config.variant}>{estado.replace("_", " ")}</Badge>
  }

  const handleEndSession = async () => {
    if (window.confirm("¿Estás seguro de finalizar la sesión?")) {
      console.log("Client: Iniciando proceso de finalización de sesión...");
      try {
        console.log("Client: Paso 1 - Actualizando el estado de la sesión a FINALIZADA.");
        const result = await updateSessionStatus(sesion.id, "FINALIZADA");

        if (!result.success) {
          console.error("Client: Error al actualizar el estado de la sesión (Server Action):", result.error);
          throw new Error(result.error || "Error al finalizar la sesión.");
        }
        console.log("Client: Paso 1 completado - Estado de la sesión actualizado a FINALIZADA.");

        setSessionStatus("FINALIZADA");
        toast.success("Sesión finalizada exitosamente.");
        router.refresh();
        console.log("Client: Proceso de finalización de sesión completado.");
      } catch (error: any) {
        console.error("Client: Error fatal durante el proceso de finalización de sesión:", error);
        toast.error(`Error al finalizar la sesión: ${error.message}`);
      }
    }
  }

  const agenda = sesion.agendas?.[0]
  const puntosAgenda: PuntoAgenda[] = agenda?.puntos_agenda || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{sesion.codigo_sesion}</h1>
          <p className="text-gray-600 mt-1">
            {sesion.tipo} • {format(parseISO(sesion.fecha), "PPP", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {getEstadoBadge(sessionStatus)}
          {sessionStatus === "EN_CURSO" && (
            <Button 
              variant="destructive" 
              onClick={() => { 
                handleEndSession(); 
              }}
            >
              <Pause className="mr-2 h-4 w-4" />Finalizar Sesión
            </Button>
          )}
        </div>
      </div>

      {/* Información básica */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <Calendar className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Fecha</p>
              <p className="text-sm text-gray-600">{format(parseISO(sesion.fecha), "dd/MM/yyyy")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Clock className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Hora</p>
              <p className="text-sm text-gray-600">{sesion.hora}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <MapPin className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Modalidad</p>
              <p className="text-sm text-gray-600">{sesion.modalidad}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <FileText className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Puntos</p>
              <p className="text-sm text-gray-600">{puntosAgenda.length} items</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${sessionStatus === "PROGRAMADA" ? "grid-cols-1" : "grid-cols-4"}`}>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          {sessionStatus !== "PROGRAMADA" && (
            <>
              <TabsTrigger value="votaciones">Votaciones</TabsTrigger>
              <TabsTrigger value="acuerdos">Acuerdos</TabsTrigger>
              <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="agenda" className="space-y-4">
          <AgendaManager agendaId={agenda?.id} puntos={puntosAgenda} sessionStatus={sessionStatus} participantes={participantes} />
        </TabsContent>

        {sessionStatus !== "PROGRAMADA" && (
          <>
            <TabsContent value="votaciones" className="space-y-4">
              <VotingPanel puntos={puntosAgenda.filter((p: PuntoAgenda) => p.requiere_votacion)} sessionStatus={sessionStatus} />
            </TabsContent>

            <TabsContent value="acuerdos" className="space-y-4">
              <AcuerdosPanel puntos={puntosAgenda} sessionId={sesion.id} sessionStatus={sessionStatus} />
            </TabsContent>

            <TabsContent value="asistencia" className="space-y-4">
              {sessionStatus === 'EN_CURSO' ? (
                <AsistenciaPanel participantes={participantes} sessionStatus={sessionStatus} sessionId={sesion.id} />
              ) : sessionStatus === 'FINALIZADA' || sessionStatus === 'CANCELADA' ? (
                <HistoricalAttendanceView sesion={sesion} participantes={participantes} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Control de Asistencia</CardTitle>
                    <CardDescription>Registro de participantes en la sesión</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">No disponible para este estado de sesión.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
