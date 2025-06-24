import { CreateSessionForm } from "@/components/sesiones/create-session-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CrearSesionPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nueva Sesión</h1>
        <p className="text-gray-600">Crear una nueva sesión de junta directiva</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Sesión</CardTitle>
          <CardDescription>Complete los datos para programar una nueva sesión</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateSessionForm />
        </CardContent>
      </Card>
    </div>
  )
} 