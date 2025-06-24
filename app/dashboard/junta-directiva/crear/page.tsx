"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { createJuntaDirectivaMiembro } from "../actions"
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

export default function CreateJuntaDirectivaMiembroPage() {
  const router = useRouter()
  const [nombreCompleto, setNombreCompleto] = useState("")
  const [puesto, setPuesto] = useState("")
  const [correo, setCorreo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (!nombreCompleto || !puesto || !correo) {
      setError("Todos los campos son obligatorios.")
      setIsLoading(false)
      return
    }

    const { data, error: createError } = await createJuntaDirectivaMiembro({
      nombre_completo: nombreCompleto,
      puesto,
      correo,
    })

    if (createError) {
      setError(createError)
      toast.error("Error al añadir miembro: " + createError)
    } else {
      toast.success("Miembro de la junta directiva añadido exitosamente.")
      router.push("/dashboard/junta-directiva") // Redirigir a la lista
    }
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col space-y-6">
      <h1 className="text-3xl font-bold">Añadir Nuevo Miembro de la Junta Directiva</h1>

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
                "Añadir Miembro"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 