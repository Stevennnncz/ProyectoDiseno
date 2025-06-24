"use client"
import { useEffect, useState, useRef } from "react"
import { parseISO } from "date-fns"

function pad(n: number) {
  return n < 10 ? `0${n}` : n
}

export default function TemporizadorPunto({ inicio, tiempoEstimado, estado, isPaused, onTimerEnd }: { inicio?: string, tiempoEstimado: number, estado: string, isPaused: boolean, onTimerEnd?: () => void }) {
  const [restante, setRestante] = useState(tiempoEstimado * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to manage the timer countdown
  useEffect(() => {
    if (estado === "EN_CURSO" && !isPaused) {
      // Clear any existing interval before setting a new one
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        setRestante(prevRestante => {
          const newRestante = Math.max(0, prevRestante - 1);
          if (newRestante === 0) {
            alert("¡El tiempo para este punto ha terminado!")
            if (intervalRef.current) clearInterval(intervalRef.current);
            onTimerEnd?.();
          }
          return newRestante;
        });
      }, 1000);
    } else {
      // Clear interval if paused or not in EN_CURSO state
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    // Cleanup function for the effect
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [estado, isPaused, onTimerEnd]);

  // Effect to reset the timer when the 'tiempoEstimado' prop changes (e.g., new point starts)
  useEffect(() => {
    setRestante(tiempoEstimado * 60);
  }, [tiempoEstimado, inicio]);

  // Format remaining seconds into MM:SS
  const min = Math.floor(restante / 60);
  const seg = restante % 60;

  return <span>{pad(min)}:{pad(seg)}</span>
} 