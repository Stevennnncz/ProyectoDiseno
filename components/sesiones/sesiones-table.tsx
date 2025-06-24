"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Edit, Calendar, MapPin, Users, Clock, Bell, XCircle } from "lucide-react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { enviarConvocatoria } from "@/app/dashboard/sesiones/[id]/actions"

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
}

interface SesionesTableProps {
  sesiones: Sesion[]
}

export function SesionesTable({ sesiones }: SesionesTableProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [busqueda, setBusqueda] = useState("")
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleConvocatoria = async (sesionId: string) => {
    setIsLoading(sesionId)
    try {
      const formData = new FormData();
      formData.append("sesion_id", sesionId);
      const result = await enviarConvocatoria(formData);

      if (result.success) {
        alert(result.message);
      } else {
        alert(`Error al enviar convocatoria: ${result.error}`);
      }
    } catch (error) {
      console.error("Error al generar convocatoria:", error)
      alert("Error desconocido al enviar convocatoria.");
    } finally {
      setIsLoading(null)
    }
  }

  const handleCancelarSesion = async (sesionId: string) => {
    setIsLoading(sesionId)
    try {
      const { error } = await supabase
        .from("sesiones")
        .update({ estado: "CANCELADA" })
        .eq("id", sesionId)

      if (error) throw error
      
      router.refresh()
    } catch (error) {
      console.error("Error al cancelar sesión:", error)
    } finally {
      setIsLoading(null)
    }
  }

  const sesiones_filtradas = sesiones.filter((sesion) => {
    const coincideBusqueda =
      sesion.codigo_sesion.toLowerCase().includes(busqueda.toLowerCase()) ||
      sesion.tipo.toLowerCase().includes(busqueda.toLowerCase())

    const coincideTipo = filtroTipo === "todos" || sesion.tipo === filtroTipo

    return coincideBusqueda && coincideTipo
  })

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
        {sesiones_filtradas.map((sesion) => (
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
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
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
                    {sesion.agendas?.[0]?.puntos_agenda?.length || 0} puntos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConvocatoria(sesion.id)}
                    disabled={isLoading === sesion.id}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Convocatoria
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isLoading === sesion.id}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro de cancelar esta sesión?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. La sesión será marcada como cancelada y no podrá ser iniciada.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>No, mantener sesión</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleCancelarSesion(sesion.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Sí, cancelar sesión
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Link href={`/dashboard/sesiones/${sesion.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalles
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sesiones_filtradas.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No se encontraron sesiones que coincidan con los filtros.</p>
        </div>
      )}
    </div>
  )
}
