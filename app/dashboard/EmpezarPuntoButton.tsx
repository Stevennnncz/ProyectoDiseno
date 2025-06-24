"use client"
import { useTransition } from "react"

export default function EmpezarPuntoButton({ puntoId, sessionStatus, onPuntoStarted }: { puntoId: string, sessionStatus: string, onPuntoStarted: (puntoId: string) => void }) {
  const [isPending, startTransition] = useTransition()

  async function handleEmpezar() {
    const res = await fetch(`/api/empezar-punto?id=${puntoId}`, { method: "POST" })
    const data = await res.json()
    if (!data.success) {
      alert(`Error: ${data.error || 'Error desconocido'}\nID: ${data.id}`)
      return
    }
    onPuntoStarted(puntoId);
  }

  return (
    <button
      onClick={() => startTransition(handleEmpezar)}
      disabled={isPending || sessionStatus !== 'EN_CURSO'}
      className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded transition-colors border shadow-sm"
    >
      {isPending ? "Empezando..." : "Empezar punto"}
    </button>
  )
} 