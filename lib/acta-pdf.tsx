import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Registrar fuentes (opcional)
Font.register({
  family: 'Open Sans',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf',
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf',
      fontWeight: 600,
    },
  ],
});

// Estilos para el PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Open Sans',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 5,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 8,
    color: '#2563eb',
  },
  text: {
    fontSize: 11,
    lineHeight: 1.4,
    marginBottom: 5,
  },
  bold: {
    fontWeight: 600,
  },
  list: {
    marginLeft: 15,
  },
  listItem: {
    fontSize: 11,
    marginBottom: 3,
    flexDirection: 'row',
  },
  bullet: {
    width: 10,
  },
  table: {
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 600,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 5,
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

interface ActaPDFProps {
  sesionData: any;
}

export const createActaPDF = (sesionData: any) => {
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

  const participantesPresentes = sesionData.sesiones_participantes?.filter(
    (p: any) => p.estado_asistencia === 'PRESENTE'
  ) || [];

  const participantesExternosPresentes = sesionData.sesion_participantes_externos?.filter(
    (p: any) => p.estado_asistencia === 'PRESENTE'
  ) || [];

  const puntosAgenda = sesionData.agendas?.[0]?.puntos_agenda || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ACTA DE SESIÓN</Text>
          <Text style={styles.subtitle}>{sesionData.codigo_sesion}</Text>
          <Text style={styles.subtitle}>{sesionData.tipo}</Text>
        </View>

        {/* Información básica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMACIÓN GENERAL</Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Fecha:</Text> {formatDate(sesionData.fecha)}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Hora de inicio:</Text> {formatTime(sesionData.hora)}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Hora de finalización:</Text> {formatTime(sesionData.hora_fin)}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Modalidad:</Text> {sesionData.modalidad}
          </Text>
          {sesionData.lugar && (
            <Text style={styles.text}>
              <Text style={styles.bold}>Lugar:</Text> {sesionData.lugar}
            </Text>
          )}
        </View>

        {/* Participantes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARTICIPANTES PRESENTES</Text>
          <View style={styles.list}>
            {participantesPresentes.map((participante: any, index: number) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.bullet}>• </Text>
                <Text style={styles.text}>
                  {participante.junta_directiva_miembros?.nombre_completo || 
                   participante.usuarios?.nombre || 'Sin nombre'} - 
                  {participante.junta_directiva_miembros?.puesto || 'Miembro'}
                </Text>
              </View>
            ))}
            {participantesExternosPresentes.map((participante: any, index: number) => (
              <View key={`ext-${index}`} style={styles.listItem}>
                <Text style={styles.bullet}>• </Text>
                <Text style={styles.text}>{participante.nombre} (Externo)</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Agenda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ORDEN DEL DÍA</Text>
          <View style={styles.list}>
            {puntosAgenda.map((punto: any, index: number) => (
              <View key={punto.id} style={styles.listItem}>
                <Text style={styles.bullet}>{index + 1}. </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.text}>
                    <Text style={styles.bold}>{punto.titulo}</Text>
                  </Text>
                  {punto.descripcion && (
                    <Text style={[styles.text, { marginLeft: 15, fontSize: 10 }]}>
                      {punto.descripcion}
                    </Text>
                  )}
                  {punto.estado_punto && (
                    <Text style={[styles.text, { marginLeft: 15, fontSize: 9 }]}>
                      Estado: {punto.estado_punto}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Acuerdos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACUERDOS TOMADOS</Text>
          {puntosAgenda.some((punto: any) => punto.acuerdos?.length > 0) ? (
            <View style={styles.list}>
              {puntosAgenda.map((punto: any) => 
                punto.acuerdos?.map((acuerdo: any, index: number) => (
                  <View key={`${punto.id}-${index}`} style={styles.listItem}>
                    <Text style={styles.bullet}>• </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.text}>
                        <Text style={styles.bold}>Punto {punto.orden}:</Text> {acuerdo.descripcion}
                      </Text>
                      <Text style={[styles.text, { fontSize: 10 }]}>
                        Fecha límite: {acuerdo.fecha_limite ? formatDate(acuerdo.fecha_limite) : 'No definida'}
                      </Text>
                      {acuerdo.acuerdo_responsables?.length > 0 && (
                        <Text style={[styles.text, { fontSize: 10 }]}>
                          Responsables: {acuerdo.acuerdo_responsables.map((resp: any) => 
                            resp.usuarios?.nombre || 
                            resp.junta_directiva_miembros?.nombre_completo ||
                            resp.sesion_participantes_externos?.nombre || 'Sin nombre'
                          ).join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            <Text style={styles.text}>No se registraron acuerdos en esta sesión.</Text>
          )}
        </View>

        {/* Votaciones */}
        {puntosAgenda.some((punto: any) => punto.votaciones?.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VOTACIONES</Text>
            <View style={styles.list}>
              {puntosAgenda.map((punto: any) =>
                punto.votaciones?.map((votacion: any, index: number) => (
                  <View key={`${punto.id}-${index}`} style={styles.listItem}>
                    <Text style={styles.bullet}>• </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.text}>
                        <Text style={styles.bold}>Punto {punto.orden}:</Text> {votacion.descripcion}
                      </Text>
                      <Text style={[styles.text, { fontSize: 10 }]}>
                        Resultado: {votacion.resultado || 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.text, { textAlign: 'center' }]}>
            Acta generada automáticamente el {new Date().toLocaleDateString('es-ES')} a las {new Date().toLocaleTimeString('es-ES')}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
