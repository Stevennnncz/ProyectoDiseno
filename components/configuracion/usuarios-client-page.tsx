"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UsuariosTable } from "@/components/configuracion/usuarios-table"
import { UsuarioForm } from "@/components/configuracion/usuario-form"
import { Plus } from "lucide-react"

interface UsuariosClientPageProps {
  initialUsuarios: any[];
  initialUnassignedJuntaDirectivaMembers: any[];
}

export function UsuariosClientPage({ initialUsuarios, initialUnassignedJuntaDirectivaMembers }: UsuariosClientPageProps) {
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [unassignedJuntaDirectivaMembers, setUnassignedJuntaDirectivaMembers] = useState(initialUnassignedJuntaDirectivaMembers);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const supabase = createClient();

  // Función para recargar usuarios y miembros de la junta no asignados
  const cargarDatos = async () => {
    try {
      // Cargar usuarios
      const { data: usersData, error: usersError } = await supabase
        .from("usuarios")
        .select("id, email, nombre, junta_directiva_miembro_id")
        .order("nombre");

      if (usersError) throw usersError;
      setUsuarios(usersData);

      // Cargar miembros de la junta no asignados (usando la acción del servidor)
      const { getUnassignedJuntaDirectivaMembers } = await import("@/app/dashboard/configuracion/usuarios/actions");
      const unassigned = await getUnassignedJuntaDirectivaMembers();
      setUnassignedJuntaDirectivaMembers(unassigned);

    } catch (error) {
      console.error("Error al cargar datos:", error);
    }
  };

  // useEffect para cargar datos iniciales o cuando sea necesario
  useEffect(() => {
    cargarDatos();
  }, []);

  const handleEditarUsuario = (usuario: any) => {
    setUsuarioSeleccionado(usuario);
    setMostrarFormulario(true);
  };

  const handleEliminarUsuario = async (id: string) => {
    try {
      const { error } = await supabase
        .from("usuarios")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await cargarDatos(); // Recargar todos los datos
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
    }
  };

  const handleFormularioSuccess = async () => {
    setMostrarFormulario(false);
    setUsuarioSeleccionado(null);
    await cargarDatos(); // Recargar todos los datos
  };

  const handleFormularioCancel = () => {
    setMostrarFormulario(false);
    setUsuarioSeleccionado(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <p className="text-gray-500">
          Administra los usuarios que tienen acceso al sistema
        </p>
      </div>

      {mostrarFormulario ? (
        <UsuarioForm
          usuario={usuarioSeleccionado}
          unassignedJuntaDirectivaMembers={unassignedJuntaDirectivaMembers} // Pass unassigned members
          onSuccess={handleFormularioSuccess}
          onCancel={handleFormularioCancel}
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Usuarios</CardTitle>
                <CardDescription>
                  Lista de usuarios registrados en el sistema
                </CardDescription>
              </div>
              <Button onClick={() => setMostrarFormulario(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Usuario
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <UsuariosTable
              usuarios={usuarios}
              onEditar={handleEditarUsuario}
              onEliminar={handleEliminarUsuario}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}