import { createClient } from "@/lib/supabase/server";
import { redirect } from 'next/navigation';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UserSesionesTable } from "@/components/user-dashboard/user-sesiones-table";

function getLocalDateTime(fecha: string | null | undefined, hora: string | null | undefined): Date | null {
  if (!fecha || !hora) return null;
  const [year, month, day] = fecha.split('-').map(Number);
  const [h, m, s] = hora.split(':').map(Number);
  return new Date(year, month - 1, day, h, m, s, 0);
}

export default async function ProximasSesionesUsuarioPage() {
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
      agendas(
        id,
        puntos_agenda(id)
      ),
      sesiones_usuarios!inner(
        usuario_id,
        estado_asistencia,
        asistira,
        usuarios!inner(id, nombre, email)
      )
    `)
    .eq('sesiones_usuarios.usuario_id', user.id)
    .order("fecha", { ascending: true });

  if (error) {
    console.error("Error al obtener las próximas sesiones:", error);
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-white rounded-lg p-8 shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">Hubo un error al cargar las próximas sesiones.</p>
        </div>
      </div>
    );
  }

  const proximasSesiones = sesiones?.filter(sesion => {
    const fechaHora = getLocalDateTime(sesion.fecha, sesion.hora);
    // Considerar sesiones PROGRAMADAS que aún no han comenzado
    return (fechaHora && fechaHora > now && sesion.estado === 'PROGRAMADA');
  });

  console.log('user.id:', user.id);
  console.log('proximasSesiones:', proximasSesiones?.map(s => s.id));
  const sesionIds = proximasSesiones?.map(s => String(s.id)) || [];
  let justificaciones = [];
  if (sesionIds.length > 0) {
    const { data: justData, error: justError } = await supabase
      .from('justificaciones_ausencia')
      .select('sesion_id, usuario_id')
      .eq('usuario_id', user.id)
      .in('sesion_id', sesionIds);
    console.log('justificaciones_ausencia query result:', justData, 'error:', justError);
    if (!justError && justData) {
      justificaciones = justData.map(j => j.sesion_id);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Próximas Sesiones</h1>
        <p className="text-gray-600">Aquí puedes ver tus sesiones de junta directiva programadas.</p>
      </div>

      <UserSesionesTable sesiones={proximasSesiones || []} justificaciones={justificaciones} />
    </div>
  );
} 