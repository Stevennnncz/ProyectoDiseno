import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Obtener los datos de la sesión
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

    if (sesionError || !sesionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Generar contenido del acta en HTML
    const actaHTML = generateActaHTML(sesionData);

    // Convertir HTML a PDF usando PDFKit (compatible con Vercel)
    const pdfBuffer = await htmlToPdf(actaHTML, sesionData);

    // Subir el PDF a Supabase Storage
    const fileName = `acta_${sesionData.codigo_sesion.replace(/[^a-zA-Z0-9]/g, '_')}_${uuidv4()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('actas')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Obtener la URL pública del PDF
    const { data: publicUrlData } = supabase.storage
      .from('actas')
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData.publicUrl;

    // Guardar la URL del acta en la tabla 'actas' de la base de datos
    const { error: actaInsertError } = await supabase
      .from('actas')
      .insert({
        sesion_id: sessionId,
        url: publicUrl,
        fecha_generacion: new Date().toISOString()
      });

    if (actaInsertError) {
      throw actaInsertError;
    }

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName: fileName 
    });

  } catch (error: any) {
    console.error('Error generating acta:', error);
    return NextResponse.json({ 
      error: error.message || 'Error generating acta' 
    }, { status: 500 });
  }
}

function generateActaHTML(sesionData: any): string {
  const fecha = new Date(sesionData.fecha).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Construir lista de asistentes
  let asistentesHTML = '';
  
  // Participantes usuarios regulares
  if (sesionData.sesiones_participantes) {
    sesionData.sesiones_participantes.forEach((participante: any) => {
      if (participante.usuarios) {
        const status = participante.estado_asistencia === 'PRESENTE' ? '✓ Presente' : '✗ Ausente';
        asistentesHTML += `<li>${status}: ${participante.usuarios.nombre} (${participante.usuarios.email})</li>`;
      }
      if (participante.junta_directiva_miembros) {
        const status = participante.estado_asistencia === 'PRESENTE' ? '✓ Presente' : '✗ Ausente';
        asistentesHTML += `<li>${status}: ${participante.junta_directiva_miembros.nombre_completo} - ${participante.junta_directiva_miembros.puesto || 'Miembro'}</li>`;
      }
    });
  }

  // Participantes externos
  if (sesionData.sesion_participantes_externos) {
    sesionData.sesion_participantes_externos.forEach((participante: any) => {
      const status = participante.estado_asistencia === 'PRESENTE' ? '✓ Presente' : '✗ Ausente';
      asistentesHTML += `<li>${status}: ${participante.nombre} (${participante.email}) - Participante Externo</li>`;
    });
  }

  // Construir lista de puntos de agenda
  let puntosHTML = '';
  if (sesionData.agendas && sesionData.agendas[0] && sesionData.agendas[0].puntos_agenda) {
    sesionData.agendas[0].puntos_agenda.forEach((punto: any, index: number) => {
      puntosHTML += `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <h3>${index + 1}. ${punto.titulo}</h3>
          <p><strong>Descripción:</strong> ${punto.descripcion || 'Sin descripción'}</p>
          <p><strong>Estado:</strong> ${punto.estado_punto || 'PENDIENTE'}</p>
          <p><strong>Categoría:</strong> ${punto.categoria || 'General'}</p>
          ${punto.tiempo_estimado ? `<p><strong>Tiempo estimado:</strong> ${punto.tiempo_estimado} minutos</p>` : ''}
          ${punto.requiere_votacion ? '<p><strong>Requiere votación:</strong> Sí</p>' : ''}
          
          ${punto.acuerdos && punto.acuerdos.length > 0 ? `
            <div style="margin-left: 20px;">
              <h4>Acuerdos:</h4>
              <ul>
                ${punto.acuerdos.map((acuerdo: any) => `
                  <li>
                    <strong>${acuerdo.titulo || acuerdo.descripcion}</strong>
                    ${acuerdo.descripcion && acuerdo.titulo ? `<br/>${acuerdo.descripcion}` : ''}
                    ${acuerdo.fecha_limite ? `<br/><em>Fecha límite: ${new Date(acuerdo.fecha_limite).toLocaleDateString('es-ES')}</em>` : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${punto.votaciones && punto.votaciones.length > 0 ? `
            <div style="margin-left: 20px;">
              <h4>Votaciones:</h4>
              <ul>
                ${punto.votaciones.map((votacion: any) => `
                  <li>
                    <strong>${votacion.descripcion || 'Votación'}</strong><br/>
                    A favor: ${votacion.votos_a_favor || 0} | 
                    En contra: ${votacion.votos_en_contra || 0} | 
                    Abstenciones: ${votacion.abstenciones || 0}<br/>
                    <em>Resultado: ${votacion.resultado || 'Pendiente'}</em>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    });
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Acta de Sesión - ${sesionData.codigo_sesion}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 40px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #333;
        }
        .session-info {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin-bottom: 30px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          color: #2c3e50;
          border-bottom: 1px solid #bdc3c7;
          padding-bottom: 10px;
        }
        .attendees ul, .points ul {
          list-style-type: none;
          padding-left: 0;
        }
        .attendees li, .points li {
          padding: 5px 0;
          border-bottom: 1px solid #ecf0f1;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #7f8c8d;
          border-top: 1px solid #bdc3c7;
          padding-top: 20px;
        }
        @media print {
          body { margin: 20px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ACTA DE SESIÓN</h1>
        <h2>${sesionData.codigo_sesion}</h2>
      </div>

      <div class="session-info">
        <h2>Información de la Sesión</h2>
        <p><strong>Tipo de Sesión:</strong> ${sesionData.tipo}</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Hora de Inicio:</strong> ${sesionData.hora}</p>
        ${sesionData.hora_fin ? `<p><strong>Hora de Finalización:</strong> ${sesionData.hora_fin}</p>` : ''}
        <p><strong>Modalidad:</strong> ${sesionData.modalidad}</p>
        ${sesionData.lugar ? `<p><strong>Lugar/Enlace:</strong> ${sesionData.lugar}</p>` : ''}
        <p><strong>Estado:</strong> ${sesionData.estado}</p>
      </div>

      <div class="section attendees">
        <h2>Lista de Asistencia</h2>
        <ul>
          ${asistentesHTML || '<li>No hay participantes registrados</li>'}
        </ul>
      </div>

      <div class="section points">
        <h2>Desarrollo de la Sesión</h2>
        ${puntosHTML || '<p>No hay puntos de agenda definidos</p>'}
      </div>

      <div class="footer">
        <p>Acta generada automáticamente el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}</p>
        <p>Sistema de Gestión de Juntas Directivas</p>
      </div>
    </body>
    </html>
  `;
}

async function htmlToPdf(html: string, sesionData: any): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument();
  
  const buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));

  // Header
  doc.fontSize(18).text('ACTA DE SESIÓN', { align: 'center' });
  doc.fontSize(14).text(sesionData.codigo_sesion, { align: 'center' });
  doc.moveDown(2);

  // Session Information
  doc.fontSize(12);
  doc.text(`Tipo de Sesión: ${sesionData.tipo}`);
  doc.text(`Fecha: ${new Date(sesionData.fecha).toLocaleDateString('es-ES')}`);
  doc.text(`Hora: ${sesionData.hora}`);
  doc.text(`Modalidad: ${sesionData.modalidad}`);
  if (sesionData.lugar) {
    doc.text(`Lugar/Enlace: ${sesionData.lugar}`);
  }
  doc.text(`Estado: ${sesionData.estado}`);
  doc.moveDown();

  // Attendees
  doc.fontSize(14).text('LISTA DE ASISTENCIA:', { underline: true });
  doc.fontSize(10);
  
  if (sesionData.sesiones_participantes) {
    sesionData.sesiones_participantes.forEach((participante: any) => {
      if (participante.usuarios) {
        const status = participante.estado_asistencia === 'PRESENTE' ? '✓' : '✗';
        doc.text(`${status} ${participante.usuarios.nombre} (${participante.usuarios.email})`);
      }
      if (participante.junta_directiva_miembros) {
        const status = participante.estado_asistencia === 'PRESENTE' ? '✓' : '✗';
        doc.text(`${status} ${participante.junta_directiva_miembros.nombre_completo} - ${participante.junta_directiva_miembros.puesto || 'Miembro'}`);
      }
    });
  }

  if (sesionData.sesion_participantes_externos) {
    sesionData.sesion_participantes_externos.forEach((participante: any) => {
      const status = participante.estado_asistencia === 'PRESENTE' ? '✓' : '✗';
      doc.text(`${status} ${participante.nombre} (${participante.email}) - Externo`);
    });
  }

  doc.moveDown();

  // Agenda Points
  doc.fontSize(14).text('DESARROLLO DE LA SESIÓN:', { underline: true });
  doc.fontSize(10);

  if (sesionData.agendas && sesionData.agendas[0] && sesionData.agendas[0].puntos_agenda) {
    sesionData.agendas[0].puntos_agenda.forEach((punto: any, index: number) => {
      doc.moveDown();
      doc.fontSize(12).text(`${index + 1}. ${punto.titulo}`, { underline: true });
      doc.fontSize(10);
      
      if (punto.descripcion) {
        doc.text(`Descripción: ${punto.descripcion}`);
      }
      
      doc.text(`Estado: ${punto.estado_punto || 'PENDIENTE'}`);
      doc.text(`Categoría: ${punto.categoria || 'General'}`);
      
      if (punto.tiempo_estimado) {
        doc.text(`Tiempo estimado: ${punto.tiempo_estimado} minutos`);
      }
      
      if (punto.requiere_votacion) {
        doc.text('Requiere votación: Sí');
      }

      // Acuerdos
      if (punto.acuerdos && punto.acuerdos.length > 0) {
        doc.text('Acuerdos:');
        punto.acuerdos.forEach((acuerdo: any) => {
          doc.text(`• ${acuerdo.titulo || acuerdo.descripcion}`);
          if (acuerdo.fecha_limite) {
            doc.text(`  Fecha límite: ${new Date(acuerdo.fecha_limite).toLocaleDateString('es-ES')}`);
          }
        });
      }

      // Votaciones
      if (punto.votaciones && punto.votaciones.length > 0) {
        doc.text('Votaciones:');
        punto.votaciones.forEach((votacion: any) => {
          doc.text(`• ${votacion.descripcion || 'Votación'}`);
          doc.text(`  A favor: ${votacion.votos_a_favor || 0}, En contra: ${votacion.votos_en_contra || 0}, Abstenciones: ${votacion.abstenciones || 0}`);
          doc.text(`  Resultado: ${votacion.resultado || 'Pendiente'}`);
        });
      }
    });
  }

  // Footer
  doc.moveDown(2);
  doc.fontSize(8);
  const now = new Date();
  doc.text(`Acta generada automáticamente el ${now.toLocaleDateString('es-ES')} a las ${now.toLocaleTimeString('es-ES')}`, { align: 'center' });
  doc.text('Sistema de Gestión de Juntas Directivas', { align: 'center' });

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
    doc.end();
  });
}
