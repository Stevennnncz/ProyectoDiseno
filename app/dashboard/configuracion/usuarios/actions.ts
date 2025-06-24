"use server"

import { createClient } from "@/lib/supabase/server";

interface JuntaDirectivaMiembro {
  id: string;
  nombre_completo: string;
  correo: string;
  puesto: string;
}

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  junta_directiva_miembro_id: string | null;
}

export async function getUnassignedJuntaDirectivaMembers(): Promise<JuntaDirectivaMiembro[]> {
  const supabase = await createClient();

  const { data: miembrosJunta, error: miembrosError } = await supabase
    .from("junta_directiva_miembros")
    .select("id, nombre_completo, correo, puesto");

  if (miembrosError) {
    console.error("Error fetching junta_directiva_miembros:", miembrosError);
    return [];
  }

  const { data: usuarios, error: usuariosError } = await supabase
    .from("usuarios")
    .select("junta_directiva_miembro_id");

  if (usuariosError) {
    console.error("Error fetching users:", usuariosError);
    return [];
  }

  const assignedMemberIds = new Set(
    usuarios.map((u) => u.junta_directiva_miembro_id).filter(Boolean)
  );

  const unassignedMembers = miembrosJunta.filter(
    (miembro) => !assignedMemberIds.has(miembro.id)
  );

  return unassignedMembers;
}

export async function createJuntaDirectivaUser(
  junta_directiva_miembro_id: string,
  password: string
) {
  const supabase = await createClient();

  // 1. Get the junta_directiva_miembro details
  const { data: miembro, error: miembroError } = await supabase
    .from("junta_directiva_miembros")
    .select("id, nombre_completo, correo, puesto")
    .eq("id", junta_directiva_miembro_id)
    .single();

  if (miembroError || !miembro) {
    console.error("Error fetching junta_directiva_miembro:", miembroError);
    throw new Error("No se pudo encontrar el miembro de la junta directiva.");
  }

  // 2. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: miembro.correo,
    password: password,
    email_confirm: true, // Automatically confirm email for internal users
  });

  if (authError) {
    console.error("Error creating Supabase Auth user:", authError);
    throw new Error(authError.message || "Error al crear el usuario en autenticación.");
  }

  const authUserId = authData.user?.id;

  if (!authUserId) {
    throw new Error("ID de usuario de autenticación no generado.");
  }

  // 3. Insert into public.usuarios table
  const { data: userData, error: userInsertError } = await supabase
    .from("usuarios")
    .insert({
      id: authUserId, // Use the ID from Supabase Auth
      email: miembro.correo,
      nombre: miembro.nombre_completo,
      rol: miembro.puesto, // Usar el puesto del miembro de la junta como rol
      junta_directiva_miembro_id: miembro.id,
    })
    .select()
    .single();

  if (userInsertError) {
    console.error("Error inserting user into public.usuarios:", userInsertError);
    // If user insertion fails, try to delete the auth user to prevent orphaned accounts
    await supabase.auth.admin.deleteUser(authUserId);
    throw new Error(userInsertError.message || "Error al registrar el usuario en la base de datos.");
  }

  return userData;
} 