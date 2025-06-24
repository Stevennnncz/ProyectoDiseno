import { createClient } from "@/lib/supabase/server";
import { redirect } from 'next/navigation';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MapPin, Users, Clock, CalendarDays, CheckCircle, XCircle, Download } from "lucide-react";

function getLocalDateTime(fecha: string | null | undefined, hora: string | null | undefined): Date | null {
  if (!fecha || !hora) return null;
  const [year, month, day] = fecha.split('-').map(Number);
  const [h, m, s] = hora.split(':').map(Number);
  return new Date(year, month - 1, day, h, m, s, 0);
}

export default async function HistorialUsuarioPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: userData, error: userError } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    console.error("Error al obtener el rol del usuario:", userError);
    redirect('/login');
  }

  if (userData.rol === 'ADMINISTRADOR') {
    redirect('/dashboard');
  }

  const now = new Date();

  const { data: sesiones, error } = await supabase
    .from("sesiones")
    .select(`
      *,
      sesiones_usuarios!inner(
        usuario_id,
        estado_asistencia,
        usuarios!inner(id, nombre, email)
      ),
      actas (
        id,
        url,
        fecha_generacion
      )
    `)
    .eq('sesiones_usuarios.usuario_id', user.id)
    .order("fecha", { ascending: false }); // Ordenar por fecha descendente para historial

  if (error) {
    console.error("Error al obtener el historial de sesiones:", error);
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-white rounded-lg p-8 shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">Hubo un error al cargar el historial de sesiones.</p>
        </div>
      </div>
    );
  }

  const sesionesFinalizadas = sesiones?.filter(sesion => {
    const fechaHora = getLocalDateTime(sesion.fecha, sesion.hora);
    return sesion.estado === 'FINALIZADA' || (fechaHora && fechaHora < now && sesion.estado !== 'EN_CURSO');
  });

  const getModalidadIcon = (modalidad: string) => {
    switch (modalidad) {
      case "PRESENCIAL":
        return <MapPin className="h-4 w-4" />
      case "VIRTUAL":
        return <Users className="h-4 w-4" />
      case "HIBRIDA":
        return <CalendarDays className="h-4 w-4" />
      default:
        return <CalendarDays className="h-4 w-4" />
    }
  };

  const getAsistenciaIcon = (estadoAsistencia: string) => {
    switch (estadoAsistencia) {
      case "PRESENTE":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "AUSENTE":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Historial de Sesiones</h1>
        
        {sesionesFinalizadas && sesionesFinalizadas.length > 0 ? (
          <div className="space-y-6">
            {sesionesFinalizadas.map((sesion) => (
              <Card key={sesion.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" /> {sesion.codigo_sesion}
                  </CardTitle>
                  <CardDescription>
                    {sesion.tipo} • {format(new Date(sesion.fecha), "PPP", { locale: es })} • {sesion.hora}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 text-sm text-gray-700">
                    <span className="flex items-center gap-1">
                      {getModalidadIcon(sesion.modalidad)}
                      {sesion.modalidad}
                    </span>
                    {sesion.lugar && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {sesion.lugar}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      {getAsistenciaIcon(sesion.sesiones_usuarios[0]?.estado_asistencia || 'N/A')}
                      Asistencia: {sesion.sesiones_usuarios[0]?.estado_asistencia || 'N/A'}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button asChild>
                    <Link href={`/dashboard-usuario/sesiones/${sesion.id}`}>Ver Agenda</Link>
                  </Button>
                  {sesion.actas && sesion.actas.length > 0 && (
                    <Button variant="outline" asChild>
                      <a href={sesion.actas[0].url} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Ver Acta
                      </a>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">No tienes sesiones en tu historial.</p>
          </div>
        )}
      </div>
    </div>
  );
} 