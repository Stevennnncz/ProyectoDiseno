import jsPDF from 'jspdf';

interface Punto {
  id: string;
  titulo: string;
  descripcion: string;
  propuesto_por: string;
  estado: string;
  resultado?: string;
  acuerdos?: string[];
}

interface ActaData {
  sesion: {
    id: string;
    fecha: string;
    tipo: string;
    estado: string;
    codigo_sesion?: string;
    hora?: string;
    modalidad?: string;
    lugar?: string;
  };
  puntos: Punto[];
  asistentes: Array<{
    usuario_id: string;
    usuario: {
      nombre: string;
      email: string;
    };
    presente: boolean;
  }>;
}

export function createActaPDF(actaData: ActaData): Buffer {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = 30;

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 12) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * fontSize * 0.35); // Return new Y position
    };

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ACTA DE SESIÓN', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Session info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  if (actaData.sesion.codigo_sesion) {
    yPosition = addWrappedText(`Código de Sesión: ${actaData.sesion.codigo_sesion}`, margin, yPosition, pageWidth - 2 * margin);
    yPosition += 5;
  }
  yPosition = addWrappedText(`Fecha: ${new Date(actaData.sesion.fecha).toLocaleDateString('es-ES')}`, margin, yPosition, pageWidth - 2 * margin);
  yPosition += 5;
  if (actaData.sesion.hora) {
    yPosition = addWrappedText(`Hora: ${actaData.sesion.hora}`, margin, yPosition, pageWidth - 2 * margin);
    yPosition += 5;
  }
  yPosition = addWrappedText(`Tipo: ${actaData.sesion.tipo}`, margin, yPosition, pageWidth - 2 * margin);
  yPosition += 5;
  if (actaData.sesion.modalidad) {
    yPosition = addWrappedText(`Modalidad: ${actaData.sesion.modalidad}`, margin, yPosition, pageWidth - 2 * margin);
    yPosition += 5;
  }
  if (actaData.sesion.lugar) {
    yPosition = addWrappedText(`Lugar: ${actaData.sesion.lugar}`, margin, yPosition, pageWidth - 2 * margin);
    yPosition += 5;
  }
  yPosition = addWrappedText(`Estado: ${actaData.sesion.estado}`, margin, yPosition, pageWidth - 2 * margin);
  yPosition += 15;

  // Asistentes section
  doc.setFont('helvetica', 'bold');
  yPosition = addWrappedText('ASISTENTES:', margin, yPosition, pageWidth - 2 * margin, 14);
  yPosition += 5;
  doc.setFont('helvetica', 'normal');

  actaData.asistentes.forEach((asistente) => {
    const status = asistente.presente ? '✓' : '✗';
    yPosition = addWrappedText(`${status} ${asistente.usuario.nombre} (${asistente.usuario.email})`, margin + 10, yPosition, pageWidth - 2 * margin - 10);
    yPosition += 3;
  });
  yPosition += 10;

  // Puntos section
  doc.setFont('helvetica', 'bold');
  yPosition = addWrappedText('PUNTOS TRATADOS:', margin, yPosition, pageWidth - 2 * margin, 14);
  yPosition += 10;

  actaData.puntos.forEach((punto, index) => {
    // Check if we need a new page
    if (yPosition > doc.internal.pageSize.height - 50) {
      doc.addPage();
      yPosition = 30;
    }

    doc.setFont('helvetica', 'bold');
    yPosition = addWrappedText(`${index + 1}. ${punto.titulo}`, margin, yPosition, pageWidth - 2 * margin, 12);
    yPosition += 5;

    doc.setFont('helvetica', 'normal');
    if (punto.descripcion) {
      yPosition = addWrappedText(`Descripción: ${punto.descripcion}`, margin + 10, yPosition, pageWidth - 2 * margin - 10);
      yPosition += 3;
    }

    yPosition = addWrappedText(`Propuesto por: ${punto.propuesto_por}`, margin + 10, yPosition, pageWidth - 2 * margin - 10);
    yPosition += 3;

    yPosition = addWrappedText(`Estado: ${punto.estado}`, margin + 10, yPosition, pageWidth - 2 * margin - 10);
    yPosition += 3;

    if (punto.resultado) {
      yPosition = addWrappedText(`Resultado: ${punto.resultado}`, margin + 10, yPosition, pageWidth - 2 * margin - 10);
      yPosition += 3;
    }

    if (punto.acuerdos && punto.acuerdos.length > 0) {
      yPosition = addWrappedText('Acuerdos:', margin + 10, yPosition, pageWidth - 2 * margin - 10);
      yPosition += 3;
      punto.acuerdos.forEach((acuerdo) => {
        yPosition = addWrappedText(`• ${acuerdo}`, margin + 20, yPosition, pageWidth - 2 * margin - 20);
        yPosition += 3;
      });
    }

    yPosition += 10;
  });

  // Footer
  if (yPosition > doc.internal.pageSize.height - 30) {
    doc.addPage();
    yPosition = 30;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  const footerText = `Acta generada el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`;
  doc.text(footerText, pageWidth / 2, doc.internal.pageSize.height - 20, { align: 'center' });

  // Convert to buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
  
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Return a minimal PDF with error message
    const errorDoc = new jsPDF();
    errorDoc.setFontSize(16);
    errorDoc.text('Error generando el acta de la sesión', 20, 30);
    errorDoc.setFontSize(12);
    errorDoc.text('Por favor, contacte al administrador del sistema.', 20, 50);
    const errorOutput = errorDoc.output('arraybuffer');
    return Buffer.from(errorOutput);
  }
}
