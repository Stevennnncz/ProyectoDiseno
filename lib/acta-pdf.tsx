import { jsPDF } from 'jspdf';

export const createActaPDF = (sesionData: any): Buffer => {
  const doc = new jsPDF();
  
  // Configurar fuente
  doc.setFont('helvetica');
  
  let yPosition = 20;
  const lineHeight = 6;
  const marginLeft = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Helper function para añadir texto con wrap
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const fontSize = options.fontSize || 11;
    const fontStyle = options.fontStyle || 'normal';
    
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    
    const maxWidth = pageWidth - x - 20;
    const lines = doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string, index: number) => {
      doc.text(line, x, y + (index * lineHeight));
    });
    
    return y + (lines.length * lineHeight);
  };
  
  // Helper function para formatear fechas
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatTime = (timeString: string) => {
    return timeString?.slice(0, 5) || '';
  };
  
  // Título
  yPosition = addText('ACTA DE SESIÓN', marginLeft, yPosition, { fontSize: 18, fontStyle: 'bold' });
  yPosition += 5;
  yPosition = addText(sesionData.codigo_sesion, marginLeft, yPosition, { fontSize: 14, fontStyle: 'bold' });
  yPosition += 5;
  yPosition = addText(sesionData.tipo, marginLeft, yPosition, { fontSize: 12 });
  yPosition += 10;
  
  // Información general
  yPosition = addText('INFORMACIÓN GENERAL', marginLeft, yPosition, { fontSize: 14, fontStyle: 'bold' });
  yPosition += 5;
  
  yPosition = addText(`Fecha: ${formatDate(sesionData.fecha)}`, marginLeft, yPosition);
  yPosition += lineHeight;
  yPosition = addText(`Hora de inicio: ${formatTime(sesionData.hora)}`, marginLeft, yPosition);
  yPosition += lineHeight;
  yPosition = addText(`Hora de finalización: ${formatTime(sesionData.hora_fin)}`, marginLeft, yPosition);
  yPosition += lineHeight;
  yPosition = addText(`Modalidad: ${sesionData.modalidad}`, marginLeft, yPosition);
  yPosition += lineHeight;
  
  if (sesionData.lugar) {
    yPosition = addText(`Lugar: ${sesionData.lugar}`, marginLeft, yPosition);
    yPosition += lineHeight;
  }
  yPosition += 5;
  
  // Participantes presentes
  yPosition = addText('PARTICIPANTES PRESENTES', marginLeft, yPosition, { fontSize: 14, fontStyle: 'bold' });
  yPosition += 5;
  
  const participantesPresentes = sesionData.sesiones_participantes?.filter(
    (p: any) => p.estado_asistencia === 'PRESENTE'
  ) || [];
  
  const participantesExternosPresentes = sesionData.sesion_participantes_externos?.filter(
    (p: any) => p.estado_asistencia === 'PRESENTE'
  ) || [];
  
  participantesPresentes.forEach((participante: any) => {
    const nombre = participante.junta_directiva_miembros?.nombre_completo || 
                   participante.usuarios?.nombre || 'Sin nombre';
    const puesto = participante.junta_directiva_miembros?.puesto || 'Miembro';
    yPosition = addText(`• ${nombre} - ${puesto}`, marginLeft + 10, yPosition);
    yPosition += lineHeight;
  });
  
  participantesExternosPresentes.forEach((participante: any) => {
    yPosition = addText(`• ${participante.nombre} (Externo)`, marginLeft + 10, yPosition);
    yPosition += lineHeight;
  });
  yPosition += 5;
  
  // Verificar si necesitamos nueva página
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }
  
  // Orden del día
  yPosition = addText('ORDEN DEL DÍA', marginLeft, yPosition, { fontSize: 14, fontStyle: 'bold' });
  yPosition += 5;
  
  const puntosAgenda = sesionData.agendas?.[0]?.puntos_agenda || [];
  
  puntosAgenda.forEach((punto: any, index: number) => {
    yPosition = addText(`${index + 1}. ${punto.titulo}`, marginLeft + 10, yPosition, { fontStyle: 'bold' });
    yPosition += lineHeight;
    
    if (punto.descripcion) {
      yPosition = addText(`   ${punto.descripcion}`, marginLeft + 10, yPosition, { fontSize: 10 });
      yPosition += lineHeight;
    }
    
    if (punto.estado_punto) {
      yPosition = addText(`   Estado: ${punto.estado_punto}`, marginLeft + 10, yPosition, { fontSize: 9 });
      yPosition += lineHeight;
    }
    
    // Verificar si necesitamos nueva página
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
  });
  yPosition += 5;
  
  // Acuerdos tomados
  yPosition = addText('ACUERDOS TOMADOS', marginLeft, yPosition, { fontSize: 14, fontStyle: 'bold' });
  yPosition += 5;
  
  const hayAcuerdos = puntosAgenda.some((punto: any) => punto.acuerdos?.length > 0);
  
  if (hayAcuerdos) {
    puntosAgenda.forEach((punto: any) => {
      punto.acuerdos?.forEach((acuerdo: any) => {
        yPosition = addText(`• Punto ${punto.orden}: ${acuerdo.descripcion}`, marginLeft + 10, yPosition);
        yPosition += lineHeight;
        
        const fechaLimite = acuerdo.fecha_limite ? formatDate(acuerdo.fecha_limite) : 'No definida';
        yPosition = addText(`  Fecha límite: ${fechaLimite}`, marginLeft + 15, yPosition, { fontSize: 10 });
        yPosition += lineHeight;
        
        if (acuerdo.acuerdo_responsables?.length > 0) {
          const responsables = acuerdo.acuerdo_responsables.map((resp: any) => 
            resp.usuarios?.nombre || 
            resp.junta_directiva_miembros?.nombre_completo ||
            resp.sesion_participantes_externos?.nombre || 'Sin nombre'
          ).join(', ');
          yPosition = addText(`  Responsables: ${responsables}`, marginLeft + 15, yPosition, { fontSize: 10 });
          yPosition += lineHeight;
        }
        
        // Verificar si necesitamos nueva página
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
      });
    });
  } else {
    yPosition = addText('No se registraron acuerdos en esta sesión.', marginLeft, yPosition);
    yPosition += lineHeight;
  }
  yPosition += 5;
  
  // Votaciones (si las hay)
  const hayVotaciones = puntosAgenda.some((punto: any) => punto.votaciones?.length > 0);
  
  if (hayVotaciones) {
    yPosition = addText('VOTACIONES', marginLeft, yPosition, { fontSize: 14, fontStyle: 'bold' });
    yPosition += 5;
    
    puntosAgenda.forEach((punto: any) => {
      punto.votaciones?.forEach((votacion: any) => {
        yPosition = addText(`• Punto ${punto.orden}: ${votacion.descripcion}`, marginLeft + 10, yPosition);
        yPosition += lineHeight;
        yPosition = addText(`  Resultado: ${votacion.resultado || 'Pendiente'}`, marginLeft + 15, yPosition, { fontSize: 10 });
        yPosition += lineHeight;
        
        // Verificar si necesitamos nueva página
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
      });
    });
  }
  
  // Footer
  yPosition = Math.max(yPosition + 20, 270);
  const fechaGeneracion = new Date().toLocaleDateString('es-ES');
  const horaGeneracion = new Date().toLocaleTimeString('es-ES');
  yPosition = addText(
    `Acta generada automáticamente el ${fechaGeneracion} a las ${horaGeneracion}`,
    marginLeft,
    yPosition,
    { fontSize: 10 }
  );
  
  // Convertir a Buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
};
