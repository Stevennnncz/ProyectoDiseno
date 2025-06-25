"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { createJuntaDirectivaUser } from "@/app/dashboard/configuracion/usuarios/actions"

const usuarioSchema = z.object({
  juntaDirectivaMiembroId: z.string().min(1, "Debe seleccionar un miembro de la junta directiva"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  nombre: z.string(),
  email: z.string()
})

type UsuarioFormValues = z.infer<typeof usuarioSchema>

interface UsuarioFormProps {
  usuario?: {
    id: string
    nombre: string
    email: string
    rol?: string
    junta_directiva_miembro_id?: string | null
  }
  unassignedJuntaDirectivaMembers: {
    id: string;
    nombre_completo: string;
    correo: string;
    puesto: string;
  }[];
  onSuccess?: () => void
  onCancel?: () => void
}

export function UsuarioForm({ usuario, unassignedJuntaDirectivaMembers, onSuccess, onCancel }: UsuarioFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: usuario ? {
      nombre: usuario.nombre,
      email: usuario.email,
    } : {
      juntaDirectivaMiembroId: "",
      password: "",
      nombre: "",
      email: "",
    },
  })

  const selectedJuntaDirectivaMiembroId = watch("juntaDirectivaMiembroId");
  const selectedMember = unassignedJuntaDirectivaMembers.find(
    (member) => member.id === selectedJuntaDirectivaMiembroId
  );  const onSubmit = async (data: UsuarioFormValues) => {
    try {
      setIsLoading(true)

      if (usuario) {
        // Modo editar
        const { error } = await supabase
          .from("usuarios")
          .update({
            ...(usuario.junta_directiva_miembro_id ? {} : {
            nombre: data.nombre,
            email: data.email,
            }),
          })
          .eq("id", usuario.id)

        if (error) {
          toast.error(`Error al actualizar usuario: ${error.message}`)
          throw error        }
        toast.success("Usuario actualizado exitosamente.")
      } else {
        // Modo crear - Validación manual        
        if (!data.juntaDirectivaMiembroId || data.juntaDirectivaMiembroId.trim() === "") {
            toast.error("Debe seleccionar un miembro de la junta directiva.")
            return;
        }
        if (!data.password || data.password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres.")
            return;
        }

        const miembroId = data.juntaDirectivaMiembroId;
        const password = data.password;

        const nuevoUsuario = await createJuntaDirectivaUser(miembroId, password);
        
        if (nuevoUsuario) {
          toast.success("Usuario creado exitosamente y vinculado a miembro de la Junta Directiva.")
        } else {
          throw new Error("No se pudo crear el usuario.");
        }
      }      onSuccess?.()
    } catch (error: any) {
      console.error("Error al guardar usuario:", error)
      
      if (error.message) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error("Ha ocurrido un error inesperado al guardar el usuario.");
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{usuario ? "Editar Usuario" : "Nuevo Usuario"}</CardTitle>
        <CardDescription>
          {usuario
            ? "Actualiza la información del usuario"
            : "Agrega un nuevo usuario vinculado a un miembro de la Junta Directiva"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {usuario ? (
            <>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              {...register("nombre")}
                  readOnly={!!usuario.junta_directiva_miembro_id}
                  disabled={!!usuario.junta_directiva_miembro_id}
              placeholder="Nombre completo"
            />
            {errors.nombre && (
              <p className="text-sm text-red-500">
                {errors.nombre.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
                  readOnly={!!usuario.junta_directiva_miembro_id}
                  disabled={!!usuario.junta_directiva_miembro_id}
              placeholder="correo@ejemplo.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

              <div className="space-y-2">
                <Label htmlFor="password">Nueva Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="juntaDirectivaMiembroId">Miembro de la Junta Directiva</Label>
                <Select
                  onValueChange={(value) => setValue("juntaDirectivaMiembroId", value)}
                  value={selectedJuntaDirectivaMiembroId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar miembro" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedJuntaDirectivaMembers.length > 0 ? (
                      unassignedJuntaDirectivaMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.nombre_completo} ({member.correo})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        No hay miembros de la junta directiva no asignados
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.juntaDirectivaMiembroId && (
                  <p className="text-sm text-red-500">
                    {errors.juntaDirectivaMiembroId.message}
                  </p>
                )}
              </div>
              {selectedMember && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="emailDisplay">Email del Miembro</Label>
                    <Input
                      id="emailDisplay"
                      type="email"
                      value={selectedMember.correo}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombreDisplay">Nombre del Miembro</Label>
                    <Input
                      id="nombreDisplay"
                      type="text"
                      value={selectedMember.nombre_completo}
                      readOnly
                      disabled
                    />
                  </div>
                </>
              )}
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} type="button">
            Cancelar
          </Button>          <Button 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {usuario ? "Guardar Cambios" : "Crear Usuario"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
} 