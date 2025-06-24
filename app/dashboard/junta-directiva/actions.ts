"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Obtener todos los miembros de la junta directiva
export async function getJuntaDirectivaMiembros() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("junta_directiva_miembros").select("*").order("created_at", { ascending: true })

  if (error) {
    console.error("Error al obtener miembros de la junta directiva:", error)
    return { error: error.message }
  }
  return { data }
}

// Obtener un solo miembro de la junta directiva por ID
export async function getJuntaDirectivaMiembroById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("junta_directiva_miembros").select("*").eq("id", id).single()

  if (error) {
    console.error(`Error al obtener miembro ${id} de la junta directiva:`, error)
    return { error: error.message }
  }
  return { data }
}

// Crear un nuevo miembro de la junta directiva
export async function createJuntaDirectivaMiembro({
  nombre_completo,
  puesto,
  correo,
}: {
  nombre_completo: string
  puesto: string
  correo: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("junta_directiva_miembros").insert({ nombre_completo, puesto, correo }).select().single()

  if (error) {
    console.error("Error al crear miembro de la junta directiva:", error)
    return { error: error.message }
  }
  revalidatePath("/dashboard/junta-directiva")
  return { data }
}

// Actualizar un miembro de la junta directiva existente
export async function updateJuntaDirectivaMiembro(
  id: string,
  {
    nombre_completo,
    puesto,
    correo,
  }: {
    nombre_completo: string
    puesto: string
    correo: string
  },
) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("junta_directiva_miembros").update({ nombre_completo, puesto, correo }).eq("id", id).select().single()

  if (error) {
    console.error("Error al actualizar miembro de la junta directiva:", error)
    return { error: error.message }
  }
  revalidatePath("/dashboard/junta-directiva")
  return { data }
}

// Eliminar un miembro de la junta directiva
export async function deleteJuntaDirectivaMiembro(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("junta_directiva_miembros").delete().eq("id", id)

  if (error) {
    console.error("Error al eliminar miembro de la junta directiva:", error)
    return { error: error.message }
  }
  revalidatePath("/dashboard/junta-directiva")
  return { success: true }
} 