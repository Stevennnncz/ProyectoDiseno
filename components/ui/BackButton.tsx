"use client";
import { Button } from "./button";

export default function BackButton() {
  return (
    <Button variant="outline" onClick={() => window.history.back()}>
      ← Volver
    </Button>
  );
} 