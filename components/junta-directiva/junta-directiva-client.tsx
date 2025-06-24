"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteJuntaDirectivaMiembro } from "@/app/dashboard/junta-directiva/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function JuntaDirectivaClient({
  initialMiembros,
}: { initialMiembros: any[] }) {
  const router = useRouter()
  const [miembros, setMiembros] = useState(initialMiembros)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [miembroToDelete, setMiembroToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (id: string) => {
    setMiembroToDelete(id)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (miembroToDelete) {
      setIsDeleting(true)
      const { success, error } = await deleteJuntaDirectivaMiembro(miembroToDelete)
      if (error) {
        toast.error("Error al eliminar miembro: " + error)
      } else if (success) {
        toast.success("Miembro eliminado exitosamente.")
        setMiembros(prev => prev.filter(m => m.id !== miembroToDelete))
      }
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setMiembroToDelete(null)
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Junta Directiva</h1>
        <Link href="/dashboard/junta-directiva/crear">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Miembro
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Miembros Actuales</CardTitle>
        </CardHeader>
        <CardContent>
          {miembros && miembros.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Completo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puesto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Creación</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {miembros.map((miembro: any) => (
                    <tr key={miembro.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{miembro.nombre_completo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{miembro.puesto}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{miembro.correo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {miembro.created_at ? format(new Date(miembro.created_at), "dd/MM/yyyy HH:mm", { locale: es }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/dashboard/junta-directiva/editar/${miembro.id}`}>
                          <Button variant="outline" size="sm" className="mr-2">Editar</Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(miembro.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No hay miembros de la junta directiva registrados.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar este miembro de la junta directiva? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 