"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Loader2, CalendarDays, BookOpen, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { markAcuerdoAsCompleted } from "../../app/dashboard-usuario/actions"; // Importar la acción de servidor

interface AcuerdoCardProps {
  acuerdo: {
    id: string;
    descripcion: string;
    estado: string;
    fecha_limite?: string | null;
    created_at: string;
    puntos_agenda?: {
      titulo: string;
      agendas?: {
        sesiones?: {
          codigo_sesion: string;
          fecha: string;
        };
      } | null;
    } | null;
  };
}

export function AcuerdoCard({ acuerdo }: AcuerdoCardProps) {
  const router = useRouter();
  const isCompleted = acuerdo.estado === "COMPLETADO";
  const isLoading = false; // Puedes añadir estado de carga si es necesario

  const handleMarkAsCompleted = async () => {
    if (isCompleted) return; // No hacer nada si ya está completado

    // Implementar la lógica para marcar como completado
    const result = await markAcuerdoAsCompleted(acuerdo.id);

    if (result.success) {
      toast.success(result.message);
      router.refresh(); // Recargar la página para actualizar el estado
    } else {
      toast.error(result.error || "Error al marcar como completado.");
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "PENDIENTE":
        return <Badge variant="destructive">Pendiente</Badge>;
      case "EN_PROGRESO":
        return <Badge variant="secondary">En Progreso</Badge>;
      case "COMPLETADO":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completado</Badge>;
      default:
        return <Badge>Desconocido</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold mb-1">
              <BookOpen className="inline-block h-5 w-5 mr-2 text-blue-600" />
              {acuerdo.descripcion}
            </CardTitle>
            <CardDescription className="text-gray-600 text-sm">
              De la sesión: {acuerdo.puntos_agenda?.agendas?.sesiones?.codigo_sesion || "N/A"} • Punto: {acuerdo.puntos_agenda?.titulo || "N/A"}
            </CardDescription>
          </div>
          {getEstadoBadge(acuerdo.estado)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-gray-700 text-sm">
        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-500" />
          Fecha de Creación: {format(new Date(acuerdo.created_at), "PPP", { locale: es })}
        </p>
        {acuerdo.fecha_limite && (
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            Fecha Límite: {format(new Date(acuerdo.fecha_limite), "PPP", { locale: es })}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        {!isCompleted && (
          <Button
            onClick={handleMarkAsCompleted}
            disabled={isLoading || isCompleted}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle className="h-4 w-4 mr-2" />
            Marcar como completado
          </Button>
        )}
        {isCompleted && (
            <Badge variant="default" className="bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> Completado
            </Badge>
          )}
      </CardFooter>
    </Card>
  );
} 