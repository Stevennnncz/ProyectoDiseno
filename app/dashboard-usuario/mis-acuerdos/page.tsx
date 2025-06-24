import { createClient } from "@/lib/supabase/server";
import { redirect } from 'next/navigation';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AcuerdoCard } from "@/components/user-dashboard/AcuerdoCard";

export default async function MisAcuerdosUsuarioPage() {
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

  const { data: acuerdos, error } = await supabase
    .from("acuerdos")
    .select(`
      *,
      created_at,
      punto_id,
      acuerdo_responsables!inner(
        usuario_id
      ),
      puntos_agenda(
        titulo,
        agendas(
          sesiones(
            codigo_sesion,
            fecha
          )
        )
      )
    `)
    .eq('acuerdo_responsables.usuario_id', user.id)
    .order('created_at', { ascending: false });

  console.log('Acuerdos fetched:', JSON.stringify(acuerdos, null, 2));

  if (error) {
    console.error("Error al obtener los acuerdos asignados:", error);
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-white rounded-lg p-8 shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">Hubo un error al cargar tus acuerdos asignados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mis Acuerdos Asignados</h1>
        
        {acuerdos && acuerdos.length > 0 ? (
          <div className="space-y-6">
            {acuerdos.map((acuerdo) => (
              <AcuerdoCard key={acuerdo.id} acuerdo={acuerdo} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">No tienes acuerdos asignados.</p>
          </div>
        )}
      </div>
    </div>
  );
} 