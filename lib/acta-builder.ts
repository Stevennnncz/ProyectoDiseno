import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

interface JuntaDirectivaMiembro {
  id: string;
  nombre_completo: string;
  puesto: string;
  correo: string;
}

interface SesionParticipanteExterno {
  id: string;
  nombre: string;
  email: string;
  estado_asistencia: string;
}

interface Documento {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
}

interface Acuerdo {
  id: string;
  descripcion: string;
  fecha_limite: string | null;
  estado: string;
  acuerdo_responsables?: {
    usuario_id?: string;
    junta_directiva_miembro_id?: string;
    external_participant_id?: string;
    usuarios?: Usuario;
    junta_directiva_miembros?: JuntaDirectivaMiembro;
    sesion_participantes_externos?: SesionParticipanteExterno;
  }[];
}

interface PuntoAgenda {
  id: string;
  orden: number;
  titulo: string;
  descripcion: string | null;
  tiempo_estimado: number | null;
  categoria: string;
  requiere_votacion: boolean;
  estado: string;
  estado_votacion: string;
  anotaciones: string | null;
  votos_a_favor: number;
  votos_en_contra: number;
  votos_abstenciones: number;
  inicio: string | null;
  documentos: Documento[];
  acuerdos: Acuerdo[];
  punto_responsables: {
    usuario_id?: string;
    junta_directiva_miembro_id?: string;
    external_participant_id?: string;
    usuarios?: Usuario;
    junta_directiva_miembros?: JuntaDirectivaMiembro;
    sesion_participantes_externos?: SesionParticipanteExterno;
  }[];
}

interface SesionParticipante {
  usuario_id?: string;
  junta_directiva_miembro_id?: string;
  usuarios?: Usuario;
  junta_directiva_miembros?: JuntaDirectivaMiembro;
  estado_asistencia: string;
}

interface Agenda {
  id: string;
  puntos_agenda: PuntoAgenda[];
}

interface SesionData {
  id: string;
  codigo_sesion: string;
  fecha: string;
  hora: string;
  modalidad: string;
  lugar: string;
  estado: string;
  tipo: string;
  agendas: Agenda[];
  sesiones_participantes: SesionParticipante[];
  sesion_participantes_externos: SesionParticipanteExterno[];
  hora_fin: string | null;
}

export class ActaBuilder {
  private sesion: SesionData;
  private htmlContent: string;

  constructor(sesionData: SesionData) {
    this.sesion = sesionData;
    this.htmlContent = "";
  }

  private formatDateTime(dateString: string, timeString: string): string {
    try {
      const date = parseISO(dateString);
      const [hours, minutes, seconds] = timeString.split(':').map(Number);
      date.setHours(hours, minutes, seconds || 0);
      return format(date, "EEEE dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });
    } catch (error) {
      console.error("Error formatting date/time:", error);
      return `Fecha: ${dateString}, Hora: ${timeString}`;
    }
  }

  private buildHeader(): ActaBuilder {
    const { codigo_sesion, fecha, hora, modalidad, lugar, tipo, hora_fin } = this.sesion;
    const formattedDateTime = this.formatDateTime(fecha, hora);
    const formattedEndTime = hora_fin ? ` - ${hora_fin}` : '';

    this.htmlContent += `
      <div style="font-family: Arial, sans-serif; margin: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0056b3; margin-bottom: 10px;">ACTA DE SESIÓN</h1>
          <h2 style="color: #0056b3; margin-bottom: 10px;">${tipo} ${codigo_sesion}</h2>
          <p style="font-size: 16px; margin-bottom: 5px;">
            Celebrada el ${formattedDateTime}${formattedEndTime}
        </p>
          <p style="font-size: 16px;">
          Modalidad: <strong>${modalidad}</strong> en <strong>${lugar}</strong>
        </p>
        </div>
        <hr style="border: 2px solid #0056b3; margin: 20px 0;">
    `;
    return this;
  }

  private buildGeneralInfo(): ActaBuilder {
    const { codigo_sesion, fecha, hora, modalidad, lugar, tipo, hora_fin } = this.sesion;
    const formattedFecha = format(parseISO(fecha), "dd/MM/yyyy", { locale: es });
    const formattedEndTime = hora_fin ? ` - ${hora_fin}` : '';

    this.htmlContent += `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #0056b3; border-bottom: 1px solid #0056b3; padding-bottom: 5px;">INFORMACIÓN GENERAL</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; width: 30%;"><strong>Código de Sesión:</strong></td>
            <td style="padding: 8px;">${codigo_sesion}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Fecha:</strong></td>
            <td style="padding: 8px;">${formattedFecha}</td>
          </tr>
          <tr>
            <td style="padding: 8px; width: 30%;"><strong>Hora:</strong></td>
            <td style="padding: 8px;">${hora}</td>
          </tr>
          ${hora_fin ? `
          <tr>
            <td style="padding: 8px; width: 30%;"><strong>Hora de Finalización:</strong></td>
            <td style="padding: 8px;">${hora_fin}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px;"><strong>Modalidad:</strong></td>
            <td style="padding: 8px;">${modalidad}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Lugar:</strong></td>
            <td style="padding: 8px;">${lugar}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Tipo de Sesión:</strong></td>
            <td style="padding: 8px;">${tipo}</td>
          </tr>
        </table>
      </div>
    `;
    return this;
  }

  private buildParticipantes(): ActaBuilder {
    const miembrosPresentes: string[] = [];
    const externosPresentes: string[] = [];

    // Recopilar miembros de la junta directiva presentes
    this.sesion.sesiones_participantes.forEach(sp => {
      if (sp.estado_asistencia === 'PRESENTE') {
        if (sp.junta_directiva_miembros?.nombre_completo) {
          miembrosPresentes.push(`${sp.junta_directiva_miembros.nombre_completo} (${sp.junta_directiva_miembros.puesto})`);
        } else if (sp.usuarios?.nombre) {
          miembrosPresentes.push(`${sp.usuarios.nombre} (${sp.usuarios.rol})`);
        }
      }
    });

    // Recopilar participantes externos presentes
    this.sesion.sesion_participantes_externos.forEach(ep => {
      if (ep.estado_asistencia === 'PRESENTE') {
        externosPresentes.push(`${ep.nombre} (${ep.email})`);
      }
    });

    this.htmlContent += `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #0056b3; border-bottom: 1px solid #0056b3; padding-bottom: 5px;">PARTICIPANTES</h3>
        
        <h4 style="color: #0056b3; margin-top: 15px;">Miembros de la Junta Directiva Presentes:</h4>
        ${miembrosPresentes.length > 0 ? `
          <ul style="list-style: none; padding: 0; margin-left: 20px;">
            ${miembrosPresentes.map(m => `<li style="margin-bottom: 5px;">${m}</li>`).join("")}
        </ul>
        ` : `<p style="margin-left: 20px;">No hay miembros de la junta directiva presentes registrados.</p>`}

        <h4 style="color: #0056b3; margin-top: 15px;">Participantes Externos Presentes:</h4>
        ${externosPresentes.length > 0 ? `
          <ul style="list-style: none; padding: 0; margin-left: 20px;">
            ${externosPresentes.map(e => `<li style="margin-bottom: 5px;">${e}</li>`).join("")}
        </ul>
        ` : `<p style="margin-left: 20px;">No hay participantes externos presentes registrados.</p>`}
      </div>
    `;
    return this;
  }

  private buildAgenda(): ActaBuilder {
    const puntos = this.sesion.agendas?.[0]?.puntos_agenda || [];
    
    this.htmlContent += `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #0056b3; border-bottom: 1px solid #0056b3; padding-bottom: 5px;">AGENDA</h3>
        ${puntos.map((punto, index) => {
          const responsablesHtml = punto.punto_responsables?.length > 0
            ? `<p><strong>Responsable(s):</strong> ${punto.punto_responsables.map((r: any) => {
                if (r.usuarios) return r.usuarios.nombre;
                if (r.junta_directiva_miembros) return r.junta_directiva_miembros.nombre_completo;
                if (r.sesion_participantes_externos) return r.sesion_participantes_externos.nombre;
                return '';
              }).join(', ')}</p>`
            : '';

          return `
            <div style="margin-bottom: 50px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background-color: #f9f9f9;">
              <h4 style="color: #0056b3; margin-bottom: 10px;">${index + 1}. ${punto.titulo}</h4>
              
              <div style="margin-left: 20px;">
                ${punto.descripcion ? `<p><strong>Descripción:</strong> ${punto.descripcion}</p>` : ""}
                ${punto.tiempo_estimado ? `<p><strong>Tiempo Estimado:</strong> ${punto.tiempo_estimado} minutos</p>` : ""}
                <p><strong>Categoría:</strong> ${punto.categoria}</p>
                ${punto.anotaciones ? `<p><strong>Anotaciones:</strong> ${punto.anotaciones}</p>` : ""}

                ${punto.requiere_votacion ? `
                  <div style="margin-top: 10px;">
                    <p><strong>Votación:</strong> ${punto.estado_votacion}</p>
                    <ul style="list-style: none; padding: 0; margin-left: 20px; margin-bottom: 8px;">
                      <li style="margin-bottom: 6px;">Votos a favor: ${punto.votos_a_favor}</li>
                      <li style="margin-bottom: 6px;">Votos en contra: ${punto.votos_en_contra}</li>
                      <li style="margin-bottom: 6px;">Votos abstención: ${punto.votos_abstenciones}</li>
                    </ul>
                  </div>
                ` : ""}

                ${responsablesHtml}

                ${punto.documentos && punto.documentos.length > 0 ? `
                  <div style="margin-top: 10px;">
                    <p><strong>Documentos Adjuntos:</strong></p>
                    <ul style="list-style: none; padding: 0; margin-left: 20px;">
                      ${punto.documentos.map(doc => `<li><a href="${doc.url}" target="_blank">${doc.nombre} (${doc.tipo})</a></li>`).join("")}
                    </ul>
                  </div>
                ` : ""}

                ${punto.acuerdos && punto.acuerdos.length > 0 ? `
                  <div style="margin-top: 10px;">
                    <p><strong>Acuerdos:</strong></p>
                    <ul style="list-style: none; padding: 0; margin-left: 20px; margin-bottom: 20px;">
                      ${punto.acuerdos.map(acuerdo => {
                        const responsables = acuerdo.acuerdo_responsables?.map((r: any) => {
                          if (r.usuarios) return r.usuarios.nombre;
                          if (r.junta_directiva_miembros) return r.junta_directiva_miembros.nombre_completo;
                          if (r.sesion_participantes_externos) return r.sesion_participantes_externos.nombre;
                          return '';
                        }).join(', ');
                      return `
                        <li style="margin-bottom: 60px;">
                          <p>${acuerdo.descripcion}</p>
                          ${acuerdo.fecha_limite ? `<div style="height: 30px;"></div><p><strong>Fecha Límite:</strong> ${format(parseISO(acuerdo.fecha_limite), "dd/MM/yyyy", { locale: es })}</p>` : ''}
                          ${responsables ? `<div style="height: 30px;"></div><p><strong>Responsable(s):</strong> ${responsables}</p>` : ''}
                        </li>
                      `;
                      }).join("")}
                    </ul>
                  </div>
                ` : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
    return this;
  }

  private buildSecretarySignature(): ActaBuilder {
    this.htmlContent += `
      <div style="margin-top: 50px; text-align: center;">
        <p style="margin-bottom: 40px;">___________________________</p>
        <p style="font-weight: bold;">Firma del Secretario/a</p>
        <p>[Nombre del Secretario/a]</p>
        <p>[Rol del Secretario/a]</p>
      </div>
    `;
    return this;
  }

  private buildFooter(): ActaBuilder {
    this.htmlContent += `
      <div style="text-align: center; font-size: 12px; color: #777; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
        <p>Acta generada automáticamente por el sistema de gestión de reuniones.</p>
        <p>Fecha de generación: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
      </div>
    </div>
    `;
    return this;
  }

  public build(): string {
    this.htmlContent = ""; // Reset content before building
    this.buildHeader();
    this.buildGeneralInfo();
    this.buildParticipantes();
    this.buildAgenda();
    this.buildSecretarySignature();
    this.buildFooter();
    return this.htmlContent;
  }
} 