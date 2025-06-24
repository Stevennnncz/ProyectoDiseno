"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Vote, CheckCircle, XCircle, Minus } from "lucide-react"

interface VotingPanelProps {
  puntos: any[]
  sessionStatus: string
}

export function VotingPanel({ puntos, sessionStatus }: VotingPanelProps) {
  const [votaciones, setVotaciones] = useState<Record<string, string>>({})

  const handleVote = (puntoId: string, opcion: string) => {
    setVotaciones((prev) => ({
      ...prev,
      [puntoId]: opcion,
    }))
  }

  const getVoteResults = (votacion: any) => {
    if (!votacion?.votos) return { aFavor: 0, enContra: 0, abstenciones: 0, total: 0, estado: "PENDIENTE" }

    const votos = votacion.votos
    const aFavor = votos.filter((v: any) => v.opcion === "A_FAVOR").length
    const enContra = votos.filter((v: any) => v.opcion === "EN_CONTRA").length
    const abstenciones = votos.filter((v: any) => v.opcion === "ABSTENCION").length
    const total = votos.length

    let estado = "PENDIENTE"
    if (total > 0) {
      if (aFavor > enContra && aFavor > abstenciones) {
        estado = "APROBADO"
      } else if (enContra > aFavor && enContra > abstenciones) {
        estado = "DENEGADO"
      } else if (abstenciones > aFavor && abstenciones > enContra) {
        estado = "ABSTENIDO"
      } else if (aFavor === enContra) {
        estado = "EMPATE"
      }
    }

    return {
      aFavor,
      enContra,
      abstenciones,
      total,
      estado
    }
  }

  if (puntos.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Vote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay puntos que requieran votación</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Sistema de Votaciones</h3>
        <p className="text-sm text-gray-600">{puntos.length} puntos requieren votación</p>
      </div>

      {puntos.map((punto) => {
        console.log("VotingPanel - punto:", JSON.stringify(punto, null, 2));
        const votacion = punto.votaciones?.[0]
        console.log("VotingPanel - votacion (punto.votaciones[0]):", JSON.stringify(votacion, null, 2));
        const resultados = getVoteResults(votacion)
        const miVoto = votaciones[punto.id]
        const votacionCerrada = votacion?.estado === "CERRADA"

        const displayEstado = punto.estado_votacion || resultados.estado;
        console.log("VotingPanel - punto.estado_votacion:", punto.estado_votacion);
        console.log("VotingPanel - displayEstado:", displayEstado);

        return (
          <Card key={punto.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{punto.titulo}</CardTitle>
                  {punto.descripcion && <CardDescription className="mt-1">{punto.descripcion}</CardDescription>}
                </div>
                <Badge variant={votacionCerrada ? "outline" : "default"}>
                  {displayEstado}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionStatus === "EN_CURSO" && !votacionCerrada && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Tu voto:</p>
                  <div className="flex gap-2">
                    <Button
                      variant={miVoto === "A_FAVOR" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleVote(punto.id, "A_FAVOR")}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />A Favor
                    </Button>
                    <Button
                      variant={miVoto === "EN_CONTRA" ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => handleVote(punto.id, "EN_CONTRA")}
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      En Contra
                    </Button>
                    <Button
                      variant={miVoto === "ABSTENCION" ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleVote(punto.id, "ABSTENCION")}
                      className="flex-1"
                    >
                      <Minus className="mr-2 h-4 w-4" />
                      Abstención
                    </Button>
                  </div>
                </div>
              )}

              {/* Resultados */}
              {resultados.total > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Resultados:</p>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600">A Favor</span>
                      <span className="text-sm font-medium">{resultados.aFavor}</span>
                    </div>
                    <Progress
                      value={resultados.total > 0 ? (resultados.aFavor / resultados.total) * 100 : 0}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-600">En Contra</span>
                      <span className="text-sm font-medium">{resultados.enContra}</span>
                    </div>
                    <Progress
                      value={resultados.total > 0 ? (resultados.enContra / resultados.total) * 100 : 0}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Abstenciones</span>
                      <span className="text-sm font-medium">{resultados.abstenciones}</span>
                    </div>
                    <Progress
                      value={resultados.total > 0 ? (resultados.abstenciones / resultados.total) * 100 : 0}
                      className="h-2"
                    />
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600">Total de votos: {resultados.total}</p>
                  </div>
                </div>
              )}

              {sessionStatus === "EN_CURSO" && !votacionCerrada && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm">
                    Cerrar Votación
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
