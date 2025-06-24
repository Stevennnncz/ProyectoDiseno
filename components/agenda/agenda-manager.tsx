"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Clock, FileText, Vote, Edit, Trash2, GripVertical, Play, Pause, FastForward } from "lucide-react"
import { AddPuntoDialog } from "./add-punto-dialog"
import { deletePuntoAgenda, updatePuntoEstado } from "@/app/dashboard/sesiones/[id]/actions"
import TemporizadorPunto from "@/app/dashboard/TemporizadorPunto"
import { useRouter } from "next/navigation"

interface AgendaManagerProps {
  agendaId?: string
  puntos: any[]
  sessionStatus: string
  participantes: any[]
  onPuntosUpdated?: (updatedPuntos: any[]) => void
}

export function AgendaManager({
  agendaId,
  puntos: initialPuntos,
  sessionStatus,
  participantes,
  onPuntosUpdated,
}: AgendaManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedPunto, setSelectedPunto] = useState<any>(null)
  const [puntos, setPuntos] = useState(initialPuntos);
  const [activePuntoId, setActivePuntoId] = useState<string | null>(null);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Synchronize internal puntos state with initialPuntos prop
  useEffect(() => {
    setPuntos(initialPuntos);
    const currentActive = initialPuntos.find((p: any) => p.estado_punto === 'EN_CURSO');
    if (currentActive) {
      setActivePuntoId(currentActive.id);
    } else {
      setActivePuntoId(null);
    }
  }, [initialPuntos]);

  // Function to find the index of the active punto
  const findActivePuntoIndex = () => {
    if (!activePuntoId) return -1;
    return puntos.findIndex(p => p.id === activePuntoId);
  };

  const getCategoriaColor = (categoria: string) => {
    const colors = {
      INFORMATIVO: "bg-blue-100 text-blue-800",
      APROBACION: "bg-green-100 text-green-800",
      DISCUSION: "bg-yellow-100 text-yellow-800",
    }
    return colors[categoria as keyof typeof colors] || colors.INFORMATIVO
  }

  const getTiempoTotal = () => {
    return puntos.reduce((total, punto) => total + (punto.tiempo_estimado || 0), 0)
  }

  const handleStartPunto = async (puntoId: string) => {
    if (!agendaId) {
      alert("Error: ID de agenda no disponible.");
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("id", puntoId);
      formData.append("estado", "EN_CURSO");
      formData.append("sesion_id", agendaId ?? '');
      const result = await updatePuntoEstado(formData);
      if (result.success) {
        setActivePuntoId(puntoId);
        setIsTimerPaused(false);
        setPuntos(prev => prev.map(p => p.id === puntoId ? { ...p, estado_punto: "EN_CURSO" } : p));
      } else {
        alert(`Error al iniciar el punto: ${result.error}`);
      }
    } catch (error: any) {
      console.error("Error starting punto:", error);
      alert(`Error al iniciar el punto: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizarPunto = async (puntoId: string) => {
    if (!agendaId) {
      alert("Error: ID de agenda no disponible.");
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("id", puntoId);
      formData.append("estado", "FINALIZADO");
      formData.append("sesion_id", agendaId ?? '');
      const result = await updatePuntoEstado(formData);
      if (result.success) {
        setActivePuntoId(null); // No active punto after finalizing
        setIsTimerPaused(true);
        setPuntos(prev => prev.map(p => p.id === puntoId ? { ...p, estado_punto: "FINALIZADO" } : p));
      } else {
        alert(`Error al finalizar el punto: ${result.error}`);
      }
    } catch (error: any) {
      console.error("Error finalizing punto:", error);
      alert(`Error al finalizar el punto: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPunto = async () => {
    const currentActiveIndex = findActivePuntoIndex();
    if (currentActiveIndex === -1) {
      alert("No hay un punto activo para avanzar.");
      return;
    }

    const currentPunto = puntos[currentActiveIndex];
    const nextPunto = puntos[currentActiveIndex + 1];

    if (!nextPunto) {
      alert("No hay más puntos en la agenda.");
      return;
    }

    setIsLoading(true);
    try {
      // Finalizar el punto actual si no está ya finalizado
      if (currentPunto.estado_punto !== "FINALIZADO") {
        const formDataCurrent = new FormData();
        formDataCurrent.append("id", currentPunto.id ?? '');
        formDataCurrent.append("estado", "FINALIZADO");
        formDataCurrent.append("sesion_id", agendaId ?? '');
        const resultCurrent = await updatePuntoEstado(formDataCurrent);
        if (!resultCurrent.success) {
          throw new Error(`Error al finalizar el punto actual: ${resultCurrent.error}`);
        }
        setPuntos(prev => prev.map(p => p.id === currentPunto.id ? { ...p, estado_punto: "FINALIZADO" } : p));
      }

      // Iniciar el siguiente punto
      const formDataNext = new FormData();
      formDataNext.append("id", nextPunto.id ?? '');
      formDataNext.append("estado", "EN_CURSO");
      formDataNext.append("sesion_id", agendaId ?? '');
      const resultNext = await updatePuntoEstado(formDataNext);
      if (resultNext.success) {
        setActivePuntoId(nextPunto.id);
        setIsTimerPaused(false);
        setPuntos(prev => prev.map(p => p.id === nextPunto.id ? { ...p, estado_punto: "EN_CURSO" } : p));
      } else {
        throw new Error(`Error al iniciar el siguiente punto: ${resultNext.error}`);
      }
    } catch (error: any) {
      console.error("Error advancing to next punto:", error);
      alert(`Error al avanzar de punto: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePunto = async (puntoId: string) => {
    if (window.confirm("¿Estás seguro de eliminar este punto de agenda?")) {
      try {
        if (!agendaId) {
          throw new Error("ID de agenda no disponible.");
        }

        const formData = new FormData();
        formData.append("id", puntoId);
        formData.append("sesion_id", agendaId); // Assuming agendaId can be used to derive session ID for revalidation

        const result = await deletePuntoAgenda(formData);

        if (!result.success) {
          throw new Error(result.error || "Error al eliminar el punto.");
        } else {
          if (onPuntosUpdated) {
            const updatedPuntos = puntos.filter(p => p.id !== puntoId);
            onPuntosUpdated(updatedPuntos);
          }
        }

      } catch (error: any) {
        console.error("Error deleting punto agenda:", error);
        alert(`No se pudo eliminar el punto: ${error.message}`);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Agenda de la Sesión</h3>
          <p className="text-sm text-gray-600">
            {puntos.length} puntos • {getTiempoTotal()} minutos estimados
          </p>
        </div>
        {sessionStatus === "PROGRAMADA" && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Punto
          </Button>
        )}
      </div>

      {/* Lista de puntos */}
      <div className="space-y-3">
        {puntos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No hay puntos en la agenda</p>
              {sessionStatus === "PROGRAMADA" && (
                <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primer Punto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          puntos
            .sort((a, b) => a.orden - b.orden)
            .map((punto, index) => (
              <Card key={punto.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {sessionStatus === "PROGRAMADA" && (
                        <GripVertical className="h-5 w-5 text-gray-400 mt-1 cursor-move" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                          <CardTitle className="text-base">{punto.titulo}</CardTitle>
                        </div>
                        {punto.descripcion && <CardDescription>{punto.descripcion}</CardDescription>}
                        {/* Mostrar Anotaciones */}
                        {punto.anotaciones && (
                          <CardDescription className="text-sm text-gray-700">Anotaciones: {punto.anotaciones}</CardDescription>
                        )}

                        {console.log(`Debug AgendaManager: punto ${index + 1} - punto.punto_responsables:`, punto.punto_responsables)}

                        {punto.punto_responsables && punto.punto_responsables.length > 0 && (
                          <p className="text-sm text-gray-700 mt-2">
                            Responsable: {
                              punto.punto_responsables[0].usuarios?.nombre ||
                              punto.punto_responsables[0].junta_directiva_miembros?.nombre_completo ||
                              punto.punto_responsables[0].sesion_participantes_externos?.nombre ||
                              "N/A"
                            }
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoriaColor(punto.categoria)}>{punto.categoria}</Badge>
                      {sessionStatus === "PROGRAMADA" && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedPunto(punto);
                            setShowAddDialog(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePunto(punto.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {punto.tiempo_estimado && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {punto.tiempo_estimado} min
                          {activePuntoId === punto.id && sessionStatus === "EN_CURSO" && punto.estado_punto === "EN_CURSO" && (
                            <TemporizadorPunto
                              tiempoEstimado={punto.tiempo_estimado}
                              estado={punto.estado_punto}
                              isPaused={isTimerPaused}
                              onTimerEnd={() => handleFinalizarPunto(punto.id)}
                            />
                          )}
                        </span>
                      )}
                      {punto.documentos?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {punto.documentos.length} documentos
                        </span>
                      )}
                      {punto.requiere_votacion && (
                        <span className="flex items-center gap-1">
                          <Vote className="h-4 w-4" />
                          Requiere votación
                        </span>
                      )}
                    </div>

                    {sessionStatus === "EN_CURSO" && (
                      <div className="flex gap-2">
                        {activePuntoId === punto.id ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsTimerPaused(!isTimerPaused)}
                              disabled={isLoading || punto.estado_punto === "FINALIZADO"}
                            >
                              {isTimerPaused && punto.estado_punto !== "FINALIZADO" ? (
                                <Play className="mr-2 h-4 w-4" />
                              ) : (
                                <Pause className="mr-2 h-4 w-4" />
                              )}
                              {isTimerPaused && punto.estado_punto !== "FINALIZADO" ? "Reanudar" : "Pausar"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFinalizarPunto(punto.id)}
                              disabled={isLoading || punto.estado_punto === "FINALIZADO"}
                            >
                              {punto.estado_punto === "FINALIZADO" ? "Punto Finalizado" : "Finalizar Punto"}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleNextPunto}
                              disabled={isLoading || findActivePuntoIndex() === puntos.length - 1 || activePuntoId === null}
                            >
                              <FastForward className="mr-2 h-4 w-4" />
                              Pasar de Punto
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartPunto(punto.id)}
                            disabled={isLoading || activePuntoId !== null || punto.estado_punto === "FINALIZADO"}
                          >
                            {punto.estado_punto === "FINALIZADO" ? "Punto Finalizado" : "Iniciar Punto"}
                        </Button>
                        )}
                        {punto.requiere_votacion && (
                          <Button variant="outline" size="sm">
                            <Vote className="mr-2 h-4 w-4" />
                            Votar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Documentos adjuntos */}
                  {punto.documentos?.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Documentos:</p>
                      <div className="flex flex-wrap gap-2">
                        {punto.documentos.map((doc: any) => (
                          <Button
                            key={doc.id}
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.url, "_blank")}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            {doc.nombre}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
        )}
      </div>

      {/* Dialog para agregar punto */}
      <AddPuntoDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) { // Reset selectedPunto when dialog is closed
            setSelectedPunto(null);
          }
        }}
        agendaId={agendaId}
        orden={puntos.length + 1}
        puntoToEdit={selectedPunto} // Pass the selected point for editing
        participantes={participantes} // Pass participants to the dialog
      />
    </div>
  )
}
