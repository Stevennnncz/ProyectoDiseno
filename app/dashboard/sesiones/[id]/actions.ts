'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function upsertPuntoAgenda(formData: FormData) {
  const supabase = await createClient();
  const puntoId = formData.get('id') as string | null;
  const agendaId = formData.get('agenda_id') as string;
  const orden = parseInt(formData.get('orden') as string);
  const titulo = formData.get('titulo') as string;
  const descripcion = formData.get('descripcion') as string;
  const tiempo_estimado = parseInt(formData.get('tiempo_estimado') as string);
  const categoria = formData.get('categoria') as string;
  const requiere_votacion = formData.get('requiere_votacion') === 'true';
  const responsableId = formData.get('responsableId') as string | null;
  const responsibleType = formData.get('responsibleType') as 'USUARIO' | 'JUNTA_DIRECTIVA' | 'EXTERNO' | null;
  const sessionId = formData.get('session_id') as string;

  try {
    if (puntoId) {
      // Update existing point
      const { error: updateError } = await supabase
        .from('puntos_agenda')
        .update({
          titulo,
          descripcion: descripcion || null,
          tiempo_estimado: tiempo_estimado || null,
          categoria,
          requiere_votacion,
        })
        .eq('id', puntoId);

      if (updateError) {
        throw updateError;
      }

      // Handle document updates (re-upload if new files are provided, delete old ones if necessary)
      const existingDocuments = await supabase
        .from('documentos')
        .select('id, url')
        .eq('punto_id', puntoId);

      if (existingDocuments.data) {
        for (const doc of existingDocuments.data) {
          // You might want a more sophisticated way to determine if a document should be deleted,
          // e.g., if the client explicitly sent a list of documents to remove.
          // For now, let's assume we delete all old documents and re-upload.
          const fileName = doc.url.split('/').pop();
          if (fileName) {
            await supabase.storage.from('documentos').remove([fileName]);
          }
        }
        await supabase.from('documentos').delete().eq('punto_id', puntoId);
      }
      
      const files = formData.getAll('documentos') as File[];
      if (files && files.length > 0) {
        for (const file of files) {
          if (file.size === 0) continue; // Skip empty files

          const fileExtension = file.name.split('.').pop();
          const uniqueFileName = `${uuidv4()}.${fileExtension}`;
          const filePath = `puntos/${uniqueFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('documentos')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Error uploading document:', uploadError);
            throw new Error(`Error uploading document: ${uploadError.message}`);
          }

          const { data: publicUrlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(filePath);

          if (publicUrlData) {
            const { error: docInsertError } = await supabase.from('documentos').insert({
              punto_id: puntoId,
              nombre: file.name,
              url: publicUrlData.publicUrl,
              tipo: file.type,
            });

            if (docInsertError) {
              console.error('Error inserting document metadata:', docInsertError);
              throw new Error(`Error saving document metadata: ${docInsertError.message}`);
            }
          }
        }
      }

      // Handle responsable update (delete existing, insert new if provided)
      const { error: deleteResponsablesError } = await supabase
        .from('punto_responsables')
        .delete()
        .eq('punto_id', puntoId);

      if (deleteResponsablesError) {
        console.error('Error deleting old responsables:', deleteResponsablesError);
      }

      if (responsableId) {
        const insertData: { punto_id: string; usuario_id?: string; junta_directiva_miembro_id?: string; external_participant_id?: string } = { punto_id: puntoId };
        
        switch (responsibleType) {
          case 'USUARIO':
            insertData.usuario_id = responsableId;
            break;
          case 'JUNTA_DIRECTIVA':
            insertData.junta_directiva_miembro_id = responsableId;
            break;
          case 'EXTERNO':
            insertData.external_participant_id = responsableId;
            break;
          default:
            console.warn("Unknown responsibleType or type not provided for update:", responsibleType);
            insertData.usuario_id = responsableId;
        }

        const { error: insertResponsableError } = await supabase
          .from('punto_responsables')
          .insert(insertData);

        if (insertResponsableError) {
          console.error('Error inserting new responsable:', insertResponsableError);
          throw new Error(`Error al insertar el responsable: ${insertResponsableError.message}`);
        }
      }

    } else {
      // Add new point
      const { data: newPuntoResult, error: insertError } = await supabase.from('puntos_agenda').insert({
        agenda_id: agendaId,
        orden,
        titulo,
        descripcion: descripcion || null,
        tiempo_estimado: tiempo_estimado || null,
        categoria,
        requiere_votacion,
      })
      .select()
      .single();

      if (insertError) {
        throw insertError;
      }

      const newPuntoId = newPuntoResult.id;

      // Handle document uploads for new point
      const files = formData.getAll('documentos') as File[];
      if (files && files.length > 0) {
        for (const file of files) {
          if (file.size === 0) continue; // Skip empty files

          const fileExtension = file.name.split('.').pop();
          const uniqueFileName = `${uuidv4()}.${fileExtension}`;
          const filePath = `puntos/${uniqueFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('documentos')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Error uploading document:', uploadError);
            throw new Error(`Error uploading document: ${uploadError.message}`);
          }

          const { data: publicUrlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(filePath);

          if (publicUrlData) {
            const { error: docInsertError } = await supabase.from('documentos').insert({
              punto_id: newPuntoId,
              nombre: file.name,
              url: publicUrlData.publicUrl,
              tipo: file.type,
            });

            if (docInsertError) {
              console.error('Error inserting document metadata:', docInsertError);
              throw new Error(`Error saving document metadata: ${docInsertError.message}`);
            }
          }
        }
      }

      if (responsableId) {
        const insertData: { punto_id: string; usuario_id?: string; junta_directiva_miembro_id?: string; external_participant_id?: string } = { punto_id: newPuntoResult.id };
        
        switch (responsibleType) {
          case 'USUARIO':
            insertData.usuario_id = responsableId;
            break;
          case 'JUNTA_DIRECTIVA':
            insertData.junta_directiva_miembro_id = responsableId;
            break;
          case 'EXTERNO':
            insertData.external_participant_id = responsableId;
            break;
          default:
            console.warn("Unknown responsibleType or type not provided for new point:", responsibleType);
            insertData.usuario_id = responsableId;
        }

        const { error: responsablesError } = await supabase
          .from('punto_responsables')
          .insert(insertData);

        if (responsablesError) {
          console.error('Error inserting responsible user:', responsablesError);
          throw new Error(`Error al insertar el responsable: ${responsablesError.message}`);
        }
      }
    }

    // Revalidate the path to ensure fresh data on next fetch
    revalidatePath(`/dashboard/sesiones/${sessionId}`);
    return { success: true };

  } catch (error: any) {
    console.error('Error in upsertPuntoAgenda:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePuntoEstado(formData: FormData) {
  const supabase = await createClient();
  const puntoId = formData.get('id') as string;
  const nuevoEstado = formData.get('estado') as string;
  const sesionId = formData.get('sesion_id') as string; // Para revalidar la ruta

  try {
    const { error } = await supabase
      .from('puntos_agenda')
      .update({ estado_punto: nuevoEstado })
      .eq('id', puntoId);

    if (error) {
      throw error;
    }

    revalidatePath(`/dashboard/sesiones/${sesionId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating punto estado:', error);
    return { success: false, error: error.message };
  }
}

export async function enviarConvocatoria(formData: FormData) {
  const supabase = await createClient();
  const sesionId = formData.get('sesion_id') as string;

  try {
    // 1. Obtener todos los detalles de la sesión, agenda y participantes
    const { data: sesion, error: sesionError } = await supabase
      .from("sesiones")
      .select(`
        *,
        agendas (
          id,
          puntos_agenda (
            id,
            orden,
            titulo,
            descripcion,
            punto_responsables (
              usuario_id,
              junta_directiva_miembro_id,
              external_participant_id
            )
          )
        ),
        sesiones_participantes (
          usuario_id,
          junta_directiva_miembro_id,
          usuarios (id, nombre, email),
          junta_directiva_miembros (id, nombre_completo, correo)
        ),
        sesion_participantes_externos (
          id,
          email,
          nombre
        )
      `)
      .eq("id", sesionId)
      .single();

    if (sesionError || !sesion) {
      throw new Error(`Error al obtener los detalles de la sesión: ${sesionError?.message || "Sesión no encontrada"}`);
    }

    // 2. Obtener la URL pública del documento de justificación
    const { data: justificacionData } = supabase
      .storage
      .from('justificacion-ejemplo')
      .getPublicUrl('EJEMPLO JUSTIFICACION DE AUSENCIAS.doc');
    const urlJustificacion = justificacionData?.publicUrl;

    // Ajustar la fecha para evitar problemas de zona horaria
    const [year, month, day] = sesion.fecha.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // month - 1 porque los meses son 0-indexed
    const formattedFecha = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 3. Preparar el contenido del correo electrónico para participantes INTERNOS (HTML)
    let puntosAgendaHtmlCompleta = '';
    sesion.agendas?.[0]?.puntos_agenda?.forEach((punto: any, index: number) => {
      puntosAgendaHtmlCompleta += `<li><strong>${index + 1}. ${punto.titulo}</strong>: ${punto.descripcion || 'Sin descripción' || ''}</li>`;
    });

    const emailHtmlContentGeneral = `
      <h1>Convocatoria de Sesión: ${sesion.codigo_sesion}</h1>
      <p>Estimado(a) participante,</p>
      <p>Ha sido convocado(a) a la siguiente sesión de junta directiva:</p>
      <ul>
        <li><strong>Tipo de Sesión:</strong> ${sesion.tipo}</li>
        <li><strong>Fecha:</strong> ${formattedFecha}</li>
        <li><strong>Hora:</strong> ${sesion.hora}</li>
        <li><strong>Modalidad:</strong> ${sesion.modalidad}</li>
        ${sesion.modalidad === 'PRESENCIAL' && sesion.lugar ? `<li><strong>Lugar:</strong> ${sesion.lugar}</li>` : ''}
        ${sesion.modalidad === 'VIRTUAL' && sesion.lugar ? `<li><strong>Enlace:</strong> <a href="${sesion.lugar}">${sesion.lugar}</a></li>` : ''}
      </ul>
      <h2>Puntos de la Agenda:</h2>
      <ul>
        ${puntosAgendaHtmlCompleta || '<li>No hay puntos de agenda definidos.</li>'}
      </ul>
      <p>
        <strong>Justificación de ausencias:</strong>
        <a href="${urlJustificacion}" target="_blank" rel="noopener noreferrer">Descargar ejemplo de justificación</a>
      </p>
      <p>Por favor, prepárese para la sesión.</p>
      <p>Atentamente,<br/>El Equipo de Gestión de Juntas</p>
    `;

    // 4. Recopilar correos y enviar para usuarios internos y miembros de la junta directiva
    const internalDestinatarios: string[] = [];
    const usuariosInternosNotificacion: { id: string, email: string }[] = [];

    sesion.sesiones_participantes?.forEach((participante: any) => {
      let email = '';
      let userId = '';
      
      if (participante.junta_directiva_miembros?.correo) {
        email = participante.junta_directiva_miembros.correo;
        userId = participante.junta_directiva_miembro_id;
      }

      if (email) {
        internalDestinatarios.push(email);
        usuariosInternosNotificacion.push({ id: userId, email });
      }
    });

    if (internalDestinatarios.length > 0) {
      // Construir URL base de forma más robusta
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      
      const resInternal = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: internalDestinatarios,
          subject: `Convocatoria de Sesión: ${sesion.codigo_sesion}`,
          html: emailHtmlContentGeneral,
        }),
      });

      if (!resInternal.ok) {
        const errorData = await resInternal.json().catch(() => ({ error: 'Error al parsear respuesta' }));
        throw new Error(`Error al enviar correos: ${errorData.error || resInternal.statusText}`);
      }
    }

    // 5. Guardar notificaciones para usuarios internos (actualmente solo se procesan usuarios con `usuario_id`)
    // Si el usuario ya no quiere que se incluyan 'usuarios' regulares en la convocatoria, esta parte podría ser innecesaria.
    // Dada la restricción de no modificar la tabla `notificaciones` para `junta_directiva_miembros`,
    // se omite la inserción de notificaciones para ellos en esta tabla.
    /*
    for (const usuario of usuariosInternosNotificacion) {
      const { error: notificacionError } = await supabase
        .from('notificaciones')
        .insert({
          usuario_id: usuario.id,
          sesion_id: sesionId,
          mensaje: emailHtmlContentGeneral
        });

      if (notificacionError) {
        console.error(`Error al guardar notificación para usuario ${usuario.email}:`, notificacionError);
      }
    }
    */

    // 6. Enviar correos personalizados para participantes EXTERNOS
    for (const participanteExterno of sesion.sesion_participantes_externos || []) {
      if (!participanteExterno.email) continue;

      const puntosResponsableHtml = sesion.agendas?.[0]?.puntos_agenda
        ?.filter((punto: any) =>
          punto.punto_responsables?.some(
            (resp: any) => resp.external_participant_id === participanteExterno.id
          )
        )
        .map((punto: any, index: number) => `<li><strong>${index + 1}. ${punto.titulo}</strong>: ${punto.descripcion || 'Sin descripción' || ''}</li>`)
        .join('');

      const emailHtmlContentExterno = `
        <h1>Convocatoria de Sesión: ${sesion.codigo_sesion}</h1>
        <p>Estimado(a) ${participanteExterno.nombre || 'participante'},</p>
        <p>Ha sido convocado(a) a la siguiente sesión de junta directiva:</p>
        <ul>
          <li><strong>Tipo de Sesión:</strong> ${sesion.tipo}</li>
          <li><strong>Fecha:</strong> ${formattedFecha}</li>
          <li><strong>Hora:</strong> ${sesion.hora}</li>
          <li><strong>Modalidad:</strong> ${sesion.modalidad}</li>
          ${sesion.modalidad === 'PRESENCIAL' && sesion.lugar ? `<li><strong>Lugar:</strong> ${sesion.lugar}</li>` : ''}
          ${sesion.modalidad === 'VIRTUAL' && sesion.lugar ? `<li><strong>Enlace:</strong> <a href="${sesion.lugar}">${sesion.lugar}</a></li>` : ''}
        </ul>
        <h2>Puntos de la Agenda donde usted es responsable:</h2>
        <ul>
          ${puntosResponsableHtml || '<li>No hay puntos de agenda donde usted sea responsable.</li>'}
        </ul>
        <p>
          <strong>Justificación de ausencias:</strong>
          <a href="${urlJustificacion}" target="_blank" rel="noopener noreferrer">Descargar ejemplo de justificación</a>
        </p>
        <p>Por favor, prepárese para la sesión.</p>
        <p>Atentamente,<br/>El Equipo de Gestión de Juntas</p>
      `;

      // Construir URL base de forma más robusta
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

      const resExternal = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [participanteExterno.email], // Enviar solo a este participante externo
          subject: `Convocatoria de Sesión: ${sesion.codigo_sesion}`,
          html: emailHtmlContentExterno,
        }),
      });

      if (!resExternal.ok) {
        const errorData = await resExternal.json().catch(() => ({ error: 'Error al parsear respuesta' }));
        console.error(`Error al enviar correo a participante externo ${participanteExterno.email}:`, errorData.error || resExternal.statusText);
      }
    }

    revalidatePath(`/dashboard/sesiones/${sesionId}`);
    return { success: true, message: "Convocatoria enviada exitosamente." };

  } catch (error: any) {
    console.error('Error al enviar convocatoria:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSessionStatus(sessionId: string, newStatus: string) {
  const supabase = await createClient();

  try {
    const updateData: any = { estado: newStatus };
    
    if (newStatus === 'FINALIZADA') {
      const now = new Date();
      const horaFin = now.toTimeString().split(' ')[0];
      updateData.hora_fin = horaFin;

      const { data: sesionData, error: sesionError } = await supabase
        .from('sesiones')
        .select(`
          *,
          agendas (
            puntos_agenda (
              *,
              documentos (*),
              votaciones (*),
              acuerdos (
                *,
                acuerdo_responsables (
                  *,
                  usuarios (id, nombre),
                  junta_directiva_miembros (id, nombre_completo),
                  sesion_participantes_externos (id, nombre)
                )
              )
            )
          ),
          sesiones_participantes (
            *,
            usuarios (id, nombre, email),
            junta_directiva_miembros (id, nombre_completo, puesto)
          ),
          sesion_participantes_externos (
            id,
            nombre,
            email,
            estado_asistencia
          )
        `)
        .eq('id', sessionId)
        .single();

      if (sesionError) {
        throw sesionError;
      }

      // Generar el acta PDF usando la API route (compatible con Vercel)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      
      const response = await fetch(`${baseUrl}/api/generate-acta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error al generar el acta' }));
        throw new Error(`Error al generar el acta: ${errorData.error || response.statusText}`);
      }

      const actaResult = await response.json();
      
      if (!actaResult.success) {
        throw new Error(`Error al generar el acta: ${actaResult.error}`);
      }
    }

    const { error } = await supabase
      .from('sesiones')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      throw error;
    }

    revalidatePath(`/dashboard/sesiones/${sessionId}`);
    revalidatePath('/dashboard/sesiones');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating session status and generating acta:', error);
    return { success: false, error: error.message };
  }
}

export async function deletePuntoAgenda(formData: FormData) {
  const supabase = await createClient();
  const puntoId = formData.get('id') as string;
  const sesionId = formData.get('sesion_id') as string;

  try {
    const { error } = await supabase
      .from('puntos_agenda')
      .delete()
      .eq('id', puntoId);

    if (error) {
      throw error;
    }

    revalidatePath(`/dashboard/sesiones/${sesionId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error in deletePuntoAgenda:', error);
    return { success: false, error: error.message };
  }
}