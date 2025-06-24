"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Calendar, User, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { format } from "date-fns"

interface AcuerdosPanelProps {
  puntos: any[]
  sessionId: string
  sessionStatus: string
}

export function AcuerdosPanel({ puntos, sessionId, sessionStatus }: AcuerdosPanelProps) {
  const [showAddForm, setShowAddForm] = useState<string | null>(null)
  const [newAcuerdo, setNewAcuerdo] = useState({
    descripcion: "",
    fecha_limite: "",
    responsable: "",
  })

  const todosLosAcuerdos = puntos.flatMap(
    (punto) =>
      punto.acuerdos?.map((acuerdo: any) => ({
        ...acuerdo,
        punto_titulo: punto.titulo,
      })) || [],
  )

  const getEstadoBadge = (estado: string) => {
    const variants = {
      PENDIENTE: { variant: "secondary" as const, icon: Clock, color: "text-yellow-600" },
      EN_PROGRESO: { variant: "default" as const, icon: AlertCircle, color: "text-blue-600" },
      COMPLETADO: { variant: "outline" as const, icon: CheckCircle, color: "text-green-600" },
    }

    const config = variants[estado as keyof typeof variants] || variants.PENDIENTE
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {estado.replace("_", " ")}
      </Badge>
    )
  }

  const handleAddAcuerdo = (puntoId: string) => {
    // Aquí implementarías la lógica para agregar el acuerdo
    console.log("Agregando acuerdo para punto:", puntoId, newAcuerdo)
    setShowAddForm(null)
    setNewAcuerdo({ descripcion: "", fecha_limite: "", responsable: "" })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Gestión de Acuerdos</h3>
        <p className="text-sm text-gray-600">{todosLosAcuerdos.length} acuerdos registrados</p>
      </div>

      {/* Resumen de acuerdos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <Clock className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{todosLosAcuerdos.filter((a) => a.estado === "PENDIENTE").length}</p>
              <p className="text-sm text-gray-600">Pendientes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{todosLosAcuerdos.filter((a) => a.estado === "COMPLETADO").length}</p>
              <p className="text-sm text-gray-600">Completados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de acuerdos por punto */}
      <div className="space-y-4">
        {puntos.map((punto) => (
          <Card key={punto.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{punto.titulo}</CardTitle>
                  <CardDescription>{punto.acuerdos?.length || 0} acuerdos asociados</CardDescription>
                </div>
                {sessionStatus !== 'FINALIZADA' && sessionStatus !== 'CANCELADA' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(showAddForm === punto.id ? null : punto.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Acuerdo
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionStatus !== 'FINALIZADA' && sessionStatus !== 'CANCELADA' && showAddForm === punto.id && (
                <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                  <h4 className="font-medium">Nuevo Acuerdo</h4>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción del Acuerdo</Label>
                    <Textarea
                      id="descripcion"
                      placeholder="Descripción detallada del acuerdo..."
                      value={newAcuerdo.descripcion}
                      onChange={(e) => setNewAcuerdo((prev) => ({ ...prev, descripcion: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fecha_limite">Fecha Límite</Label>
                      <Input
                        id="fecha_limite"
                        type="date"
                        value={newAcuerdo.fecha_limite}
                        onChange={(e) => setNewAcuerdo((prev) => ({ ...prev, fecha_limite: e.target.value }))}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="responsable">Responsable</Label>
                      <Select
                        value={newAcuerdo.responsable}
                        onValueChange={(value) => setNewAcuerdo((prev) => ({ ...prev, responsable: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar responsable" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="juan.perez">Juan Pérez</SelectItem>
                          <SelectItem value="maria.garcia">María García</SelectItem>
                          <SelectItem value="carlos.lopez">Carlos López</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAddAcuerdo(punto.id)} disabled={!newAcuerdo.descripcion}>
                      Guardar Acuerdo
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowAddForm(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de acuerdos existentes */}
              {punto.acuerdos?.length > 0 ? (
                <div className="space-y-3">
                  {punto.acuerdos.map((acuerdo: any) => (
                    <div key={acuerdo.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium">{acuerdo.descripcion}</p>
                        {getEstadoBadge(acuerdo.estado)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {acuerdo.fecha_limite && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(acuerdo.fecha_limite), "dd/MM/yyyy")}
                          </span>
                        )}
                        {acuerdo.acuerdo_responsables?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {acuerdo.acuerdo_responsables.map((resp: any) => {
                              let responsableNombre = 'N/A';
                              if (resp.usuarios?.nombre) {
                                responsableNombre = resp.usuarios.nombre;
                              } else if (resp.junta_directiva_miembros?.nombre_completo) {
                                responsableNombre = resp.junta_directiva_miembros.nombre_completo;
                              } else if (resp.sesion_participantes_externos?.nombre) {
                                responsableNombre = resp.sesion_participantes_externos.nombre;
                              }
                              return responsableNombre;
                            }).filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No hay acuerdos registrados para este punto</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {puntos.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No hay puntos de agenda disponibles</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
