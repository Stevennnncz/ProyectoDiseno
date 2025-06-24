"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface VotingInputPanelProps {
  puntoId: string;
  onVoteProcessed: (newStatus: string, aFavorCount: number, enContraCount: number, abstencionesCount: number) => void;
  initialAFavor?: number | null;
  initialEnContra?: number | null;
  initialAbstenciones?: number | null;
}

export function VotingInputPanel({
  puntoId,
  onVoteProcessed,
  initialAFavor,
  initialEnContra,
  initialAbstenciones,
}: VotingInputPanelProps) {
  const [aFavor, setAFavor] = useState<number | "">("");
  const [enContra, setEnContra] = useState<number | "">("");
  const [abstenciones, setAbstenciones] = useState<number | "">("");

  useEffect(() => {
    // Initialize state with initial values if provided
    setAFavor(initialAFavor !== undefined && initialAFavor !== null ? initialAFavor : "");
    setEnContra(initialEnContra !== undefined && initialEnContra !== null ? initialEnContra : "");
    setAbstenciones(initialAbstenciones !== undefined && initialAbstenciones !== null ? initialAbstenciones : "");
  }, [initialAFavor, initialEnContra, initialAbstenciones]);

  const handleProcessVote = () => {
    const totalAFavor = typeof aFavor === 'number' ? aFavor : 0;
    const totalEnContra = typeof enContra === 'number' ? enContra : 0;
    const totalAbstenciones = typeof abstenciones === 'number' ? abstenciones : 0;

    let newStatus: string;
    if (totalAFavor > totalEnContra && totalAFavor > totalAbstenciones) {
      newStatus = "APROBADO";
    } else if (totalEnContra > totalAFavor && totalEnContra > totalAbstenciones) {
      newStatus = "DENEGADO";
    } else if (totalAbstenciones > totalAFavor && totalAbstenciones > totalEnContra) {
      newStatus = "ABSTENIDO";
    } else {
      newStatus = "PENDIENTE"; // Or a more specific status like 'EMPATE'
    }

    // Pass the individual counts along with the new status
    console.log(`Punto ${puntoId}: Votación - A Favor: ${totalAFavor}, En Contra: ${totalEnContra}, Abstenciones: ${totalAbstenciones}. Resultado: ${newStatus}`);
    onVoteProcessed(newStatus, totalAFavor, totalEnContra, totalAbstenciones);

    // Do NOT reset inputs after processing, as we want to show the saved values.
    // The parent component should handle closing the panel if desired.
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Registro de Votación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="aFavor" className="block text-sm font-medium text-gray-700">Votos a favor</label>
          <Input
            id="aFavor"
            type="number"
            value={aFavor}
            onChange={(e) => setAFavor(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="enContra" className="block text-sm font-medium text-gray-700">Votos en contra</label>
          <Input
            id="enContra"
            type="number"
            value={enContra}
            onChange={(e) => setEnContra(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="abstenciones" className="block text-sm font-medium text-gray-700">Abstenciones</label>
          <Input
            id="abstenciones"
            type="number"
            value={abstenciones}
            onChange={(e) => setAbstenciones(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            min="0"
          />
        </div>
        <Button onClick={handleProcessVote} className="w-full">
          Procesar Votación
        </Button>
      </CardContent>
    </Card>
  );
} 