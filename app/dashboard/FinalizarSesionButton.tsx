"use client"
import { useTransition } from "react"
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateSessionStatus } from "@/app/dashboard/sesiones/[id]/actions";

export default function FinalizarSesionButton({ sesionId }: { sesionId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter();

  async function handleFinalizar() {
    if (!window.confirm('¿Está seguro de finalizar la sesión?')) {
      console.log("Cliente (FinalizarSesionButton): Confirmación de finalizar sesión CANCELADA.");
      return;
    }

    console.log("Cliente (FinalizarSesionButton): Confirmación de finalizar sesión ACEPTADA. Iniciando proceso...");
    startTransition(async () => {
      try {
        console.log("Cliente (FinalizarSesionButton): Actualizando el estado de la sesión a FINALIZADA.");
        const result = await updateSessionStatus(sesionId, "FINALIZADA");

        if (!result.success) {
          console.error("Cliente (FinalizarSesionButton): Error al actualizar el estado de la sesión:", result.error);
          throw new Error(result.error || "Error al finalizar la sesión.");
        }

        toast.success("Sesión finalizada exitosamente.");
        router.refresh();
        console.log("Cliente (FinalizarSesionButton): Proceso de finalización de sesión completado.");

      } catch (error: any) {
        console.error("Cliente (FinalizarSesionButton): Error fatal durante el proceso de finalización de sesión:", error);
        toast.error(`Error al finalizar la sesión: ${error.message}`);
      }
    })
  }

  return (
    <button
      onClick={handleFinalizar}
      disabled={isPending}
      className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded transition-colors border shadow-sm"
    >
      {isPending ? "Finalizando..." : "Finalizar sesión"}
    </button>
  )
} 