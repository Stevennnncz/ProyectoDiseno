"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitJustificacionAusencia(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.id) {
    return { success: false, error: "Usuario no autenticado o ID de usuario no disponible." };
  }

  const sesionId = formData.get("sesion_id") as string;
  const archivo = formData.get("archivo") as File;

  if (!sesionId) {
    return { success: false, error: "ID de sesión es requerido." };
  }

  let fileUrl = null;
  if (archivo && archivo.size > 0) {
    const filePath = `${user.id}/${sesionId}/${archivo.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("justificaciones-ausencia") // Asegúrate de que este bucket existe en Supabase
      .upload(filePath, archivo, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error al subir archivo a Supabase Storage:", uploadError);
      return { success: false, error: `Error al subir el archivo: ${uploadError.message}` };
    }
    
    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from("justificaciones-ausencia")
      .getPublicUrl(filePath);

    if (publicUrlData) {
      fileUrl = publicUrlData.publicUrl;
    } else {
      return { success: false, error: "No se pudo obtener la URL pública del archivo." };
    }
  }

  // Insertar la justificación en la tabla
  const { error: insertError } = await supabase
    .from("justificaciones_ausencia")
    .insert({
      usuario_id: user.id,
      sesion_id: sesionId,
      url_documento: fileUrl,
    });

  if (insertError) {
    console.error("Error al guardar justificación de ausencia en DB:", insertError);
    return { success: false, error: `Error al guardar la justificación: ${insertError.message}` };
  }

  return { success: true, message: "Justificación de ausencia enviada exitosamente." };
}

export async function updateAsistenciaSesion(sesionId: string, asistira: boolean) {
  try {
    const supabase = await createClient();
    // Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Usuario no autenticado" };
    }
    // Actualizar el estado de asistencia
    const { error } = await supabase
      .from('sesiones_usuarios')
      .update({ asistira: asistira })
      .match({ 
        sesion_id: sesionId,
        usuario_id: user.id
      });
    if (error) {
      console.error('Error al actualizar asistencia:', error);
      return { success: false, error: "Error al actualizar el estado de asistencia" };
    }
    return { success: true, message: "Estado de asistencia actualizado correctamente" };
  } catch (error) {
    console.error('Error en updateAsistenciaSesion:', error);
    return { success: false, error: "Error interno del servidor" };
  }
}

export async function markAcuerdoAsCompleted(acuerdoId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuario no autenticado" };
    }

    const { error } = await supabase
      .from('acuerdos')
      .update({ estado: 'COMPLETADO' })
      .eq('id', acuerdoId);

    if (error) {
      console.error('Error al marcar acuerdo como completado:', error);
      return { success: false, error: "Error al actualizar el estado del acuerdo" };
    }

    return { success: true, message: "Acuerdo marcado como completado correctamente" };
  } catch (error) {
    console.error('Error en markAcuerdoAsCompleted:', error);
    return { success: false, error: "Error interno del servidor" };
  }
} 