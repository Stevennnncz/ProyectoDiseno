import { createClient } from "@/lib/supabase/server";
import { UsuariosTable } from "@/components/configuracion/usuarios-table";
import { UsuariosClientPage } from "@/components/configuracion/usuarios-client-page";
import { getUnassignedJuntaDirectivaMembers } from "./actions";

export default async function UsuariosPage() {
  const supabase = await createClient();

  const { data: usuarios, error: usersError } = await supabase
        .from("usuarios")
    .select("id, email, nombre, junta_directiva_miembro_id");

  if (usersError) {
    console.error("Error al cargar usuarios:", usersError);
    return <p>Error al cargar usuarios.</p>;
  }

  const unassignedMembers = await getUnassignedJuntaDirectivaMembers();

  return (
    <UsuariosClientPage initialUsuarios={usuarios} initialUnassignedJuntaDirectivaMembers={unassignedMembers} />
  );
} 