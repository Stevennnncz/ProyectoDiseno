"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, FileText, Download, Search, Filter } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

interface HistorialTableProps {
  sesiones: any[]
}

export function HistorialTable({ sesiones }: HistorialTableProps) {
  const [busqueda, setBusqueda] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [filtroFecha, setFiltroFecha] = useState("todos")

  // Function to get badge based on session status
  const getEstadoBadge = (estado: string) => {
    const variants = {
      FINALIZADA: { variant: "outline" as const, text: "Finalizada" },
      CANCELADA: { variant: "destructive" as const, text: "Cancelada" },
    };

    const config = variants[estado as keyof typeof variants] || variants.FINALIZADA;

    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const sesiones_filtradas = sesiones.filter((sesion) => {
    const coincideBusqueda =
      sesion.codigo_sesion.toLowerCase().includes(busqueda.toLowerCase()) ||
      sesion.agendas?.[0]?.puntos_agenda?.some((punto: any) =>
        punto.titulo.toLowerCase().includes(busqueda.toLowerCase()),
      )

    const coincideTipo = filtroTipo === "todos" || sesion.tipo === filtroTipo

    let coincideFecha = true
    if (filtroFecha !== "todos") {
      const fechaSesion = new Date(sesion.fecha)
      const ahora = new Date()

      switch (filtroFecha) {
        case "ultimo_mes":
          coincideFecha = fechaSesion >= new Date(ahora.getFullYear(), ahora.getMonth() - 1, ahora.getDate())
          break
        case "ultimo_trimestre":
          coincideFecha = fechaSesion >= new Date(ahora.getFullYear(), ahora.getMonth() - 3, ahora.getDate())
          break
        case "ultimo_año":
          coincideFecha = fechaSesion >= new Date(ahora.getFullYear() - 1, ahora.getMonth(), ahora.getDate())
          break
      }
    }

    return coincideBusqueda && coincideTipo && coincideFecha
  })

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Código, título de punto..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Sesión</label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="ORDINARIA">Ordinaria</SelectItem>
                  <SelectItem value="EXTRAORDINARIA">Extraordinaria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={filtroFecha} onValueChange={setFiltroFecha}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los períodos</SelectItem>
                  <SelectItem value="ultimo_mes">Último mes</SelectItem>
                  <SelectItem value="ultimo_trimestre">Último trimestre</SelectItem>
                  <SelectItem value="ultimo_año">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="space-y-4">
        {sesiones_filtradas.map((sesion) => (
          <Card key={sesion.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {sesion.codigo_sesion}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {sesion.tipo} • {format(parseISO(sesion.fecha), "PPP", { locale: es })} • {sesion.hora}
                  </p>
                </div>
                {/* Display dynamic status badge */}
                {getEstadoBadge(sesion.estado)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {sesion.agendas?.[0]?.puntos_agenda?.length || 0}
                    </p>
                    <p className="text-sm text-blue-600">Puntos tratados</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {sesion.agendas?.[0]?.puntos_agenda?.reduce(
                        (acc: number, punto: any) => acc + (punto.acuerdos?.length || 0),
                        0,
                      ) || 0}
                    </p>
                    <p className="text-sm text-green-600">Acuerdos tomados</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{sesion.actas?.length || 0}</p>
                    <p className="text-sm text-purple-600">Actas generadas</p>
                  </div>
                </div>

                {/* Separator */}
                <hr className="border-gray-200" />

                {/* Acciones */}
                <div className="flex gap-2 pt-4">
                  <Link href={`/dashboard/sesiones/${sesion.id}`}>
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-4 w-4" />
                      Ver Detalles
                    </Button>
                  </Link>
                  {sesion.actas && sesion.actas.length > 0 && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={sesion.actas[0].url} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Ver Acta
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sesiones_filtradas.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No se encontraron sesiones que coincidan con los filtros.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
