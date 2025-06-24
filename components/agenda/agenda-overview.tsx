"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, FileText, Vote, Plus, Edit } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

interface AgendaOverviewProps {
  sesiones: any[]
}

export function AgendaOverview({ sesiones }: AgendaOverviewProps) {
  const [selectedSession, setSelectedSession] = useState<string | null>(sesiones.length > 0 ? sesiones[0].id : null)

  const sesionActual = sesiones.find((s) => s.id === selectedSession)
  const agenda = sesionActual?.agendas?.[0]
  const puntos = agenda?.puntos_agenda || []

  const getCategoriaColor = (categoria: string) => {
    const colors = {
      INFORMATIVO: "bg-blue-100 text-blue-800",
      APROBACION: "bg-green-100 text-green-800",
      DISCUSION: "bg-yellow-100 text-yellow-800",
    }
    return colors[categoria as keyof typeof colors] || colors.INFORMATIVO
  }

  const getTiempoTotal = (puntos: any[]) => {
    return puntos.reduce((total, punto) => total + (punto.tiempo_estimado || 0), 0)
  }

  if (sesiones.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No hay sesiones programadas</p>
          <Link href="/sesiones/crear">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Crear Nueva Sesión
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selector de sesión */}
      <Card>
        <CardHeader>
          <CardTitle>Sesiones Activas</CardTitle>
          <CardDescription>Selecciona una sesión para gestionar su agenda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sesiones.map((sesion) => (
              <Card
                key={sesion.id}
                className={`cursor-pointer transition-colors ${
                  selectedSession === sesion.id ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setSelectedSession(sesion.id)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{sesion.codigo_sesion}</h4>
                    <Badge variant={sesion.estado === "EN_CURSO" ? "default" : "secondary"}>
                      {sesion.estado.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{format(new Date(sesion.fecha), "PPP", { locale: es })}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{sesion.agendas?.[0]?.puntos_agenda?.length || 0} puntos</span>
                    <span>•</span>
                    <span>{getTiempoTotal(sesion.agendas?.[0]?.puntos_agenda || [])} min</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gestión de agenda */}
      {sesionActual && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Agenda: {sesionActual.codigo_sesion}</CardTitle>
                <CardDescription>
                  {format(new Date(sesionActual.fecha), "PPP", { locale: es })} • {sesionActual.hora}
                </CardDescription>
              </div>
              <Link href={`/sesiones/${sesionActual.id}`}>
                <Button>
                  <Edit className="mr-2 h-4 w-4" />
                  Gestionar Sesión
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="puntos">
              <TabsList>
                <TabsTrigger value="puntos">Puntos de Agenda</TabsTrigger>
                <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
              </TabsList>

              <TabsContent value="puntos" className="space-y-4">
                {puntos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No hay puntos en la agenda</p>
                    <Link href={`/sesiones/${sesionActual.id}`}>
                      <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Puntos
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {puntos
                      .sort((a: any, b: any) => a.orden - b.orden)
                      .map((punto: any, index: number) => (
                        <Card key={punto.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                                  <h4 className="font-medium">{punto.titulo}</h4>
                                  <Badge className={getCategoriaColor(punto.categoria)}>{punto.categoria}</Badge>
                                </div>
                                {punto.descripcion && <p className="text-sm text-gray-600 mb-2">{punto.descripcion}</p>}
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  {punto.tiempo_estimado && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {punto.tiempo_estimado} min
                                    </span>
                                  )}
                                  {punto.documentos?.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <FileText className="h-4 w-4" />
                                      {punto.documentos.length} docs
                                    </span>
                                  )}
                                  {punto.requiere_votacion && (
                                    <span className="flex items-center gap-1">
                                      <Vote className="h-4 w-4" />
                                      Votación
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="estadisticas">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{puntos.length}</p>
                      <p className="text-sm text-gray-600">Total Puntos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{getTiempoTotal(puntos)}</p>
                      <p className="text-sm text-gray-600">Minutos Estimados</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {puntos.filter((p: any) => p.requiere_votacion).length}
                      </p>
                      <p className="text-sm text-gray-600">Requieren Votación</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {puntos.reduce((acc: number, p: any) => acc + (p.documentos?.length || 0), 0)}
                      </p>
                      <p className="text-sm text-gray-600">Documentos</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
