import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import BackButton from "@/components/ui/BackButton";

interface UserSessionDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserSessionDetailsPage({ params }: UserSessionDetailsPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Control de acceso por rol
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
    redirect('/dashboard/sesiones/' + id); // Redirigir al dashboard de admin si es admin
  }

  // Obtener detalles de la sesión y su agenda
  const { data: sesion, error } = await supabase
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
          tiempo_estimado,
          categoria,
          requiere_votacion,
          estado_votacion,
          documentos (
            id,
            nombre,
            url
          ),
          punto_responsables (
            usuario_id,
            usuarios (nombre)
          )
        )
      )
    `)
    .eq("id", id)
    .order('orden', { foreignTable: 'agendas.puntos_agenda' })
    .single();

  if (error || !sesion) {
    notFound();
  }

  const agenda = sesion.agendas?.[0];
  const puntosAgenda = agenda?.puntos_agenda || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Agenda de la Sesión: {sesion.codigo_sesion || sesion.titulo}</h1>
        
        {puntosAgenda.length > 0 ? (
          <div className="space-y-4">
            {puntosAgenda.map((punto) => {
              console.log(`Punto ${punto.orden} (${punto.titulo}): requiere_votacion = ${punto.requiere_votacion}, typeof requiere_votacion = ${typeof punto.requiere_votacion}`);
              return (
                <Card key={punto.id}>
                  <CardHeader>
                    <CardTitle>{punto.orden}. {punto.titulo}</CardTitle>
                    <CardDescription>
                      Categoría: {punto.categoria} | Tiempo Estimado: {punto.tiempo_estimado || 'N/A'} min
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{punto.descripcion || 'Sin descripción.'}</p>
                    {punto.punto_responsables && punto.punto_responsables.length > 0 && (
                      <p className="text-gray-700 mt-2">
                        <span className="font-semibold">Expositor:</span> {punto.punto_responsables.map((pr: any) => pr.usuarios?.nombre).join(', ')}
                      </p>
                    )}
                    {punto.documentos && punto.documentos.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Documentos:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {punto.documentos.map((doc: any) => (
                            <li key={doc.id}>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {doc.nombre}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">Esta sesión no tiene puntos en la agenda.</p>
          </div>
        )}
      </div>
    </div>
  );
} 