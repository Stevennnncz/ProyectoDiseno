"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { getJuntaDirectivaMiembroById, updateJuntaDirectivaMiembro } from "../../actions"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const puestosJuntaDirectiva = [
  "Presidente",
  "Vicepresidente",
  "Secretario",
  "Tesorero",
  "Vocal",
  "Fiscal",
  "Miembro Honorario",
]

interface EditJuntaDirectivaMiembroPageProps {
  params: { id: string }
}

export default function EditJuntaDirectivaMiembroPage({ params }: EditJuntaDirectivaMiembroPageProps) {
  const router = useRouter()
  const { id } = params
  const [nombreCompleto, setNombreCompleto] = useState("")
  const [puesto, setPuesto] = useState("")
  const [correo, setCorreo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)

  useEffect(() => {
    async function loadMiembro() {
      setIsPageLoading(true)
      const { data, error: fetchError } = await getJuntaDirectivaMiembroById(id)
      if (fetchError) {
        setError("Error al cargar el miembro: " + fetchError)
        toast.error("Error al cargar el miembro: " + fetchError)
      } else if (data) {
        setNombreCompleto(data.nombre_completo)
        setPuesto(data.puesto)
        setCorreo(data.correo)
      }
      setIsPageLoading(false)
    }
    loadMiembro()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (!nombreCompleto || !puesto || !correo) {
      setError("Todos los campos son obligatorios.")
      setIsLoading(false)
      return
    }

    const { data, error: updateError } = await updateJuntaDirectivaMiembro(
      id,
      {
        nombre_completo: nombreCompleto,
        puesto,
        correo,
      },
    )

    if (updateError) {
      setError(updateError)
      toast.error("Error al actualizar miembro: " + updateError)
    } else {
      toast.success("Miembro de la junta directiva actualizado exitosamente.")
      router.push("/dashboard/junta-directiva") // Redirigir a la lista
    }
    setIsLoading(false)
  }

  if (isPageLoading) {
    return <div className="flex justify-center items-center h-screen text-lg">Cargando miembro...</div>
  }

  return (
    <div className="flex flex-col space-y-6">
      <h1 className="text-3xl font-bold">Editar Miembro de la Junta Directiva</h1>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Miembro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombreCompleto">Nombre Completo</Label>
              <Input
                id="nombreCompleto"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>
            <div>
              <Label htmlFor="puesto">Puesto</Label>
              <Select value={puesto} onValueChange={setPuesto} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el puesto" />
                </SelectTrigger>
                <SelectContent>
                  {puestosJuntaDirectiva.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="correo">Correo Electrónico</Label>
              <Input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Ej: juan.perez@example.com"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Actualizar Miembro"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 