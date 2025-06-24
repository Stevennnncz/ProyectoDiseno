"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import IniciarSesionButton from '../app/dashboard/IniciarSesionButton';
import TemporizadorPunto from '../app/dashboard/TemporizadorPunto';
import EmpezarPuntoButton from '../app/dashboard/EmpezarPuntoButton';
import FinalizarSesionButton from '../app/dashboard/FinalizarSesionButton';
import { AsistenciaPanel } from "@/components/asistencia/asistencia-panel";
import { VotingInputPanel } from "@/components/voting/voting-input-panel";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AssignResponsiblePanel } from "@/components/acuerdos/assign-responsible-panel";
import { Badge } from "@/components/ui/badge";
import { AgendaManager } from "@/components/agenda/agenda-manager";

interface CurrentSessionViewProps {
  sesionEnCurso: any;
  requiereInicioManual: boolean;
  participantes: any[];
}

export default function CurrentSessionView({ sesionEnCurso, requiereInicioManual, participantes }: CurrentSessionViewProps) {
  console.log("CurrentSessionView - Render. sesionEnCurso (props):", sesionEnCurso);
  const [showQuorumControl, setShowQuorumControl] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showVotingPanel, setShowVotingPanel] = useState(false);
  const [showAssignResponsiblePanel, setShowAssignResponsiblePanel] = useState(false);
  const [anotaciones, setAnotaciones] = useState("");
  const [currentPuntoId, setCurrentPuntoId] = useState<string | null>(null);
  const [hasQuorum, setHasQuorum] = useState(false);
  const [showQuorumModal, setShowQuorumModal] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [puntosAgenda, setPuntosAgenda] = useState<any[]>([]);

  // Use a ref to store the ID of the point whose annotations are currently loaded
  const loadedPuntoIdRef = useRef<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // Effect to initialize puntosAgenda and currentPuntoId when sesionEnCurso changes
  useEffect(() => {
    console.log("CurrentSessionView - useEffect [sesionEnCurso] triggered. sesionEnCurso:", sesionEnCurso);
    const initialPuntos = sesionEnCurso?.agendas?.[0]?.puntos_agenda || [];
    // Sort points by 'orden' to ensure correct sequence
    initialPuntos.sort((a: any, b: any) => a.orden - b.orden);
    setPuntosAgenda(initialPuntos);
    console.log("CurrentSessionView - useEffect [sesionEnCurso] - puntosAgenda set to:", initialPuntos);
    console.log("CurrentSessionView - Initial Puntos Documents Check:", initialPuntos.map((p: any) => ({ id: p.id, titulo: p.titulo, documentos: p.documentos?.length })));

    // Determine initial currentPuntoId
    const initialEnCursoPunto = initialPuntos.find((punto: any) => (punto.estado ? punto.estado.replace(/^"|"$/g, '') : '') === 'EN_CURSO');

    if (initialEnCursoPunto) {
      setCurrentPuntoId(initialEnCursoPunto.id);
      setAnotaciones(initialEnCursoPunto.anotaciones || "");
      console.log("Initial EN_CURSO point found:", initialEnCursoPunto.id);
    } else if (initialPuntos.length > 0) {
      // If no EN_CURSO point, default to the first point
      setCurrentPuntoId(initialPuntos[0].id);
      setAnotaciones(initialPuntos[0].anotaciones || "");
      console.log("No EN_CURSO point, defaulting to first point:", initialPuntos[0].id);
    } else {
      // No points available
      setCurrentPuntoId(null);
      setAnotaciones("");
      console.log("No points available in agenda.");
    }
    console.log("CurrentSessionView - useEffect (sesionEnCurso changed) - puntosAgenda state after update:", initialPuntos);

  }, [sesionEnCurso]); // Only run when sesionEnCurso changes (i.e., initial load or different session)

  // Derive puntoParaMostrar based on the currentPuntoId state
  const puntoParaMostrar = puntosAgenda.find((p: any) => p.id === currentPuntoId) || { 
    id: "dummy-id",
    titulo: "Sin título", 
    estado: "PENDIENTE", 
    tiempo_estimado: 15, 
    requiere_votacion: false, 
    estado_votacion: "PENDIENTE",
    anotaciones: "",
    documentos: [], // Ensure default documents is an empty array
    acuerdos: [], // Ensure default acuerdos is an empty array
  };
  console.log("CurrentSessionView - puntoParaMostrar (derived):", puntoParaMostrar);
  console.log("CurrentSessionView - puntoParaMostrar Documents Check:", puntoParaMostrar.documentos);

  useEffect(() => {
    // This useEffect handles setting annotations based on the *current* puntoParaMostrar
    // It runs when puntoParaMostrar changes, ensuring annotations are in sync.
    console.log("CurrentSessionView - useEffect (puntoParaMostrar changed):", puntoParaMostrar);
    if (puntoParaMostrar.id && puntoParaMostrar.id !== loadedPuntoIdRef.current) {
      setAnotaciones(puntoParaMostrar.anotaciones || "");
      loadedPuntoIdRef.current = puntoParaMostrar.id;
    } else if (!puntoParaMostrar.id && loadedPuntoIdRef.current !== null) {
      setAnotaciones("");
      loadedPuntoIdRef.current = null;
    }
  }, [puntoParaMostrar]); // Only depend on puntoParaMostrar for annotations

  const estadoVotacionDisplay = puntoParaMostrar.estado_votacion ? puntoParaMostrar.estado_votacion.replace(/^"|"$/g, '') : "PENDIENTE";

  // Calculate currentIndex and nextPuntoIndex for conditional rendering of "Siguiente punto" button
  const currentIndex = puntosAgenda.findIndex((p: any) => p.id === puntoParaMostrar.id);
  const nextPuntoIndex = currentIndex + 1;
  const showSiguientePuntoButton = nextPuntoIndex < puntosAgenda.length;

  const estadoPuntoActual = puntoParaMostrar?.estado ? puntoParaMostrar.estado.replace(/^"|"$/g, '') : "";

  const updatePuntoEstadoVotacion = async (newStatus: string, aFavorCount: number, enContraCount: number, abstencionesCount: number) => {
    try {
      const { error } = await supabase
        .from('puntos_agenda')
        .update({
          estado_votacion: newStatus,
          votos_a_favor: aFavorCount,
          votos_en_contra: enContraCount,
          votos_abstenciones: abstencionesCount,
        })
        .eq('id', puntoParaMostrar.id);

      if (error) {
        console.error("Error updating punto estado_votacion or vote counts:", error);
        alert("Error al actualizar el estado del punto y conteo de votos. Intente de nuevo.");
      } else {
        console.log("Punto updated successfully with new vote status and counts.", newStatus);
        // Update local state instead of refreshing
        setPuntosAgenda(prevPuntos => {
          const updated = prevPuntos.map(p => 
            p.id === puntoParaMostrar.id ? { ...p, estado_votacion: newStatus, votos_a_favor: aFavorCount, votos_en_contra: enContraCount, votos_abstenciones: abstencionesCount } : p
          );
          console.log("CurrentSessionView - setPuntosAgenda (updatePuntoEstadoVotacion):", updated);
          setShowVotingPanel(false); // Cierra el panel de votación
          return updated;
        });
        // router.refresh(); // No refresh here
      }
    } catch (error) {
      console.error("Exception updating punto estado_votacion or vote counts:", error);
      alert("Ocurrió un error inesperado al actualizar el estado del punto y conteo de votos.");
    }
  };

  const updatePuntoActivityStateAndAnnotations = async (puntoId: string, newActivityState: string, annotations: string) => {
    console.log(`Attempting to update punto ${puntoId} activity state to: ${newActivityState} and save annotations.`);
    const { error } = await supabase
      .from("puntos_agenda")
      .update({ estado: newActivityState, anotaciones: annotations })
      .eq("id", puntoId);

    if (error) {
      console.error("Error updating punto activity state or annotations:", error);
      alert("Error al actualizar el estado de actividad o las anotaciones del punto. Intente de nuevo.");
    } else {
      console.log("Punto estado de actividad y anotaciones actualizados exitosamente.");
      // Update local state instead of refreshing
      setPuntosAgenda(prevPuntos => {
        const updated = prevPuntos.map(p => 
          p.id === puntoId ? { ...p, estado: newActivityState, anotaciones: annotations } : p
        );
        console.log("CurrentSessionView - setPuntosAgenda (updatePuntoActivityStateAndAnnotations):", updated);
        return updated;
      });
      // If the point was finalized, set the next point as current (if exists)
      if (newActivityState === "FINALIZADO") {
        const currentIndex = puntosAgenda.findIndex((p: any) => p.id === puntoId);
        if (currentIndex !== -1 && currentIndex + 1 < puntosAgenda.length) {
          setCurrentPuntoId(puntosAgenda[currentIndex + 1].id);
        } else {
          // If it's the last point or no next point, stay on the current point but update its state
          // The button will be disabled, which is fine.
        }
      }
      // router.refresh(); // No refresh here
    }
  };

  const handleFinalizarPunto = async () => {
    console.log("handleFinalizarPunto called for punto:", puntoParaMostrar.id);
    if (puntoParaMostrar.id) {
      await updatePuntoActivityStateAndAnnotations(puntoParaMostrar.id, "FINALIZADO", anotaciones);
    }
  };

  const handleTimerEnd = async () => {
    console.log("handleTimerEnd called for punto:", puntoParaMostrar.id);
    if (puntoParaMostrar.id && puntoParaMostrar.estado !== "FINALIZADO") {
      await updatePuntoActivityStateAndAnnotations(puntoParaMostrar.id, "FINALIZADO", anotaciones);
    }
  };

  const handlePuntoStarted = (startedPuntoId: string) => {
    console.log("handlePuntoStarted called for puntoId:", startedPuntoId);
    // Update the local state to mark the point as EN_CURSO
    setPuntosAgenda(prevPuntos => {
      const updated = prevPuntos.map(p => 
        p.id === startedPuntoId ? { ...p, estado: "EN_CURSO", inicio: new Date().toISOString() } : p
      );
      console.log("CurrentSessionView - setPuntosAgenda (handlePuntoStarted):", updated);
      return updated;
    });
    setCurrentPuntoId(startedPuntoId); // Set the started point as the current one
    console.log("handlePuntoStarted - puntosAgenda after update:", puntosAgenda);
  };

  const handleSiguientePunto = () => {
    console.log("handleSiguientePunto called");
    console.log("puntoParaMostrar.id:", puntoParaMostrar.id);
    console.log("puntosAgenda (before next point logic):", puntosAgenda);
    const currentIndex = puntosAgenda.findIndex((p: any) => p.id === puntoParaMostrar.id);
    console.log("currentIndex:", currentIndex);
    const nextPuntoIndex = currentIndex + 1;
    console.log("nextPuntoIndex:", nextPuntoIndex);
    console.log("puntosAgenda.length:", puntosAgenda.length);
    if (nextPuntoIndex < puntosAgenda.length) {
      setCurrentPuntoId(puntosAgenda[nextPuntoIndex].id);
      console.log("Setting currentPuntoId to next point:", puntosAgenda[nextPuntoIndex].id);
    } else {
      alert("No hay más puntos en la agenda.");
    }
  };

  console.log("DashboardPage - sesionEnCurso fetched:", sesionEnCurso);

  return (
    <div className="bg-white rounded-2xl p-10 w-full max-w-5xl shadow-lg border flex flex-col items-center">
      <h2 className="text-3xl font-bold mb-2">Sesión en Curso</h2>
      {requiereInicioManual && (
        <IniciarSesionButton sesionId={sesionEnCurso.id} isDisabledExternally={!hasQuorum} />
      )}
      <div className="flex w-full gap-8">
        {/* Contenido principal de la sesión */}
        <div className="bg-gray-50 rounded-xl p-8 flex-1 flex flex-col gap-6 min-w-[420px]" style={{ maxWidth: 900 }}>
          {/* Subtítulo dentro del recuadro */}
          <p className="text-lg font-semibold text-gray-800 mb-4">{sesionEnCurso.tipo} #{sesionEnCurso.codigo_sesion}</p>
          {/* Agenda y punto actual */}
          <div className="bg-white rounded-lg p-6 flex flex-col gap-4 shadow-sm border">
            {/* Título del punto de agenda */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">{puntoParaMostrar.titulo || 'Sin título'}</h3>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <span className="text-sm text-gray-600">
                Tiempo restante: <TemporizadorPunto inicio={puntoParaMostrar.inicio} tiempoEstimado={puntoParaMostrar.tiempo_estimado || 15} estado={estadoPuntoActual} isPaused={isPaused} onTimerEnd={handleTimerEnd} />
              </span>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded transition-colors mt-2 md:mt-1"
                style={{ minWidth: 160 }}
                onClick={() => setIsPaused(!isPaused)}
                disabled={estadoPuntoActual !== 'EN_CURSO'}
              >
                {isPaused ? "Continuar" : "Pausar"}
              </button>
            </div>
          </div>
          {/* Controles y acciones */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Columna izquierda */}
            <div className="flex-1 flex flex-col gap-4">
              <button
                className="bg-white hover:bg-gray-50 text-gray-800 font-semibold px-4 py-2 rounded transition-colors w-full border shadow-sm"
                onClick={() => setShowDocuments(!showDocuments)}
                disabled={estadoPuntoActual !== 'EN_CURSO'}
              >
                Ver documentos adjuntos
              </button>
              {showDocuments && (
                <div className="bg-white rounded-lg p-4 shadow-sm border mt-2">
                  <h4 className="font-semibold mb-2">Documentos Adjuntos</h4>
                  {puntoParaMostrar.documentos && puntoParaMostrar.documentos.length > 0 ? (
                    <ul>
                      {puntoParaMostrar.documentos.map((doc: any) => (
                        <li key={doc.id} className="text-sm text-gray-700 mb-1">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {doc.nombre} ({doc.tipo})
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No hay documentos adjuntos para este punto.</p>
                  )}
                </div>
              )}
              {puntoParaMostrar.requiere_votacion && (
                <div className="flex gap-2">
                  <input className="border rounded px-2 py-1 flex-1 bg-gray-50" value={estadoVotacionDisplay} readOnly />
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition-colors"
                    onClick={() => setShowVotingPanel(!showVotingPanel)}
                    disabled={estadoPuntoActual !== 'EN_CURSO'}
                  >
                    Realizar votación
                  </button>
                </div>
              )}
              {showVotingPanel && puntoParaMostrar.requiere_votacion && (
                <VotingInputPanel
                  puntoId={puntoParaMostrar.id}
                  onVoteProcessed={updatePuntoEstadoVotacion}
                  initialAFavor={puntoParaMostrar.votos_a_favor}
                  initialEnContra={puntoParaMostrar.votos_en_contra}
                  initialAbstenciones={puntoParaMostrar.votos_abstenciones}
                />
              )}
              <textarea
                className="border rounded px-2 py-2 min-h-[80px] bg-white shadow-sm"
                placeholder="Anotaciones"
                value={anotaciones}
                onChange={(e) => setAnotaciones(e.target.value)}
                disabled={estadoPuntoActual !== 'EN_CURSO'}
              ></textarea>
              <button
                className="bg-white hover:bg-gray-50 text-gray-800 font-semibold px-4 py-2 rounded transition-colors w-full border shadow-sm"
                onClick={() => setShowAssignResponsiblePanel(!showAssignResponsiblePanel)}
                disabled={estadoPuntoActual !== 'EN_CURSO'}
              >
                Asignar responsable a acuerdos
              </button>
              {showAssignResponsiblePanel && (
                <AssignResponsiblePanel
                  puntoId={puntoParaMostrar.id}
                  participantes={participantes}
                  onAgreementSaved={(savedAgreement: any) => {
                    setShowAssignResponsiblePanel(false);
                    // Update the local puntosAgenda with the new/updated agreement
                    setPuntosAgenda(prevPuntos => prevPuntos.map(punto =>
                      punto.id === puntoParaMostrar.id
                        ? { ...punto, acuerdos: [savedAgreement] } // Assuming one agreement per point, and savedAgreement is complete
                        : punto
                    ));
                    // router.refresh(); // Removed to prevent annotations from resetting
                  }}
                  existingAgreement={puntoParaMostrar.acuerdos?.[0]}
                />
              )}
            </div>

            {/* Columna derecha */}
            <div className="flex flex-col gap-3 w-full md:w-56 mt-6 md:mt-0">
              {(() => {
                const normalizedEstado = String(puntoParaMostrar.estado || '').replace(/"/g, '').trim().toUpperCase();

                if (normalizedEstado === 'PENDIENTE') {
                  return <EmpezarPuntoButton puntoId={puntoParaMostrar.id} sessionStatus={sesionEnCurso.estado} onPuntoStarted={handlePuntoStarted} />;
                } else if (normalizedEstado === 'EN_CURSO') {
                  return (
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded transition-colors w-full"
                      onClick={handleFinalizarPunto}
                    >
                      Finalizar Punto
                    </button>
                  );
                } else if (normalizedEstado === 'FINALIZADO') {
                  return (
                    <button
                      className="bg-red-600 text-white font-semibold px-4 py-2 rounded transition-colors w-full"
                      disabled={true}
                    >
                      Punto Finalizado
                    </button>
                  );
                }
                return null;
              })()}

              {showSiguientePuntoButton && ( // Only render if there's a next point
                <button
                  className="bg-white hover:bg-gray-50 text-gray-800 font-semibold px-4 py-2 rounded transition-colors border shadow-sm"
                  onClick={handleSiguientePunto}
                  disabled={puntoParaMostrar.estado !== 'FINALIZADO'}
                >
                  Siguiente punto
                </button>
              )}
              <button
                className="bg-white hover:bg-gray-50 text-gray-800 font-semibold px-4 py-2 rounded transition-colors border shadow-sm"
                onClick={() => setShowQuorumModal(true)}
              >
                Control del quórum
              </button>
              {showQuorumModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg p-6 shadow-xl relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold mb-4">Control de Quórum y Asistencia</h3>
                    <AsistenciaPanel
                      participantes={participantes}
                      sessionStatus={sesionEnCurso.estado}
                      sessionId={sesionEnCurso.id}
                      onQuorumChange={setHasQuorum}
                    />
                    <button
                      className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded transition-colors w-full"
                      onClick={() => setShowQuorumModal(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
              <button
                className="bg-white hover:bg-gray-50 text-gray-800 font-semibold px-4 py-2 rounded transition-colors border shadow-sm"
                onClick={() => setShowAgendaModal(true)}
              >
                Ver agenda
              </button>
              <FinalizarSesionButton
                sesionId={sesionEnCurso.id}
              />
            </div>
          </div>
        </div>
      </div>
      {showAgendaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 shadow-xl relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4">Agenda de la Sesión</h3>
            {puntosAgenda.length > 0 ? (
              <div className="grid gap-4">
                {puntosAgenda.map((punto: any) => (
                  <div key={punto.id} className="bg-white rounded-lg p-6 shadow-sm border">
                    <h4 className="text-xl font-semibold mb-2">{punto.titulo || 'Sin título'}</h4>
                    <p className="text-gray-700 mb-2">Descripción: {punto.descripcion || 'No hay descripción'}</p>
                    <p className="text-gray-600 mb-2">Tiempo Estimado: {punto.tiempo_estimado} minutos</p>
                    <p className="text-gray-600 mb-2">Estado: {punto.estado ? punto.estado.replace(/^"|"$/g, '') : 'PENDIENTE'}</p>
                    {punto.requiere_votacion && (
                      <p className="text-gray-600">Estado de Votación: {punto.estado_votacion ? punto.estado_votacion.replace(/^"|"$/g, '') : 'N/A'}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No hay puntos en la agenda.</p>
            )}
            <button
              className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded transition-colors w-full"
              onClick={() => setShowAgendaModal(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}