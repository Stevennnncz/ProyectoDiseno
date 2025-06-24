"use client"
import { useTransition } from "react"

export default function IniciarSesionButton({ sesionId, isDisabledExternally }: { sesionId: string, isDisabledExternally?: boolean }) {
  const [isPending, startTransition] = useTransition()

  async function handleIniciar() {
    await fetch(`/api/iniciar-sesion?id=${sesionId}`, { method: "POST" })
    window.location.reload()
  }

  return (
    <button
      onClick={() => startTransition(handleIniciar)}
      disabled={isPending || isDisabledExternally}
      className="mb-6 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2 rounded transition-colors border shadow-sm"
    >
      {isPending ? "Empezando..." : "Empezar sesión"}
    </button>
  )
} 