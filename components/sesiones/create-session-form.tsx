"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getJuntaDirectivaMiembros } from "@/app/dashboard/junta-directiva/actions"

const sessionSchema = z.object({
  tipo: z.enum(["ORDINARIA", "EXTRAORDINARIA"]),
  fecha: z.string().min(1, "La fecha es requerida"),
  hora: z.string().min(1, "La hora es requerida"),
  modalidad: z.enum(["PRESENCIAL", "VIRTUAL"]),
  lugar: z.string().optional(),
  link: z.string().optional(),
  miembros: z.array(z.string()).min(2, "Debe seleccionar al menos 2 miembros"),
  incluirExternos: z.boolean(),
  correosExternos: z.string().optional(),
  nombresExternos: z.string().optional(),
})

// Explicitly define the type to ensure 'incluirExternos' is boolean
type SessionFormData = z.infer<typeof sessionSchema>

interface MiembroJuntaDirectiva {
  id: string;
  nombre_completo: string;
  correo: string;
  puesto: string;
}

export function CreateSessionForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [juntaDirectivaMiembros, setJuntaDirectivaMiembros] = useState<MiembroJuntaDirectiva[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const cargarMiembrosJuntaDirectiva = async () => {
      const { data, error } = await getJuntaDirectivaMiembros()

      if (error) {
        console.error("Error al cargar miembros de la junta directiva:", error)
        return
      }

      setJuntaDirectivaMiembros(data || [])
    }

    cargarMiembrosJuntaDirectiva()
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      tipo: 'ORDINARIA',
      modalidad: 'PRESENCIAL',
      miembros: [],
      incluirExternos: false,
      correosExternos: '',
      nombresExternos: '',
      lugar: '',
      link: ''
    }
  })

  const modalidad = watch("modalidad")
  const miembrosSeleccionados = watch("miembros") || []
  const incluirExternos = watch("incluirExternos")
  const correosExternos = watch("correosExternos")
  const nombresExternos = watch("nombresExternos")

  useEffect(() => {
    if (!incluirExternos) {
      setValue("correosExternos", "");
      setValue("nombresExternos", "");
    }
  }, [incluirExternos, setValue]);

  const generateUniqueSessionCode = async (supabase: any, tipo: string, fecha: string): Promise<string> => {
    const year = new Date(fecha).getFullYear();
    const month = String(new Date(fecha).getMonth() + 1).padStart(2, "0");
    const day = String(new Date(fecha).getDate()).padStart(2, "0");
    const tipoCode = tipo === "ORDINARIA" ? "ORD" : "EXT";
    
    let isUnique = false;
    let codigoSesion = "";
    let retries = 0;
    const MAX_RETRIES = 100; // Limit retries to prevent infinite loops

    while (!isUnique && retries < MAX_RETRIES) {
      const random = Math.floor(Math.random() * 10000) // Increase random range for better uniqueness
        .toString()
        .padStart(4, "0"); // Pad with 4 zeros for a 4-digit random number

      codigoSesion = `${tipoCode}-${year}${month}${day}-${random}`;
      
      // Check if code already exists
      const { data, error } = await supabase
        .from('sesiones')
        .select('id')
        .eq('codigo_sesion', codigoSesion);
      
      if (error) {
        console.error("Error checking session code uniqueness:", error);
        throw new Error("Error checking session code uniqueness.");
      }
      
      if (!data || data.length === 0) {
        isUnique = true; // Code is unique
      } else {
        retries++; // Code exists, retry
      }
    }

    if (!isUnique) {
      throw new Error(`Could not generate a unique session code after ${MAX_RETRIES} retries.`);
    }
    
    return codigoSesion;
  };

  const onSubmit = async (data: SessionFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Verificar solapamientos
      const { data: existingSessions } = await supabase
        .from("sesiones")
        .select("id")
        .eq("fecha", data.fecha)
        .eq("hora", data.hora)
        .neq("estado", "CANCELADA")

      if (existingSessions && existingSessions.length > 0) {
        setError("Ya existe una sesión programada para esa fecha y hora")
        return
      }

      // Generar código único
      const codigoSesion = await generateUniqueSessionCode(supabase, data.tipo, data.fecha);

      // Crear sesión
      const { data: newSession, error: sessionError } = await supabase
        .from("sesiones")
        .insert({
          codigo_sesion: codigoSesion,
          tipo: data.tipo,
          fecha: data.fecha,
          hora: data.hora,
          modalidad: data.modalidad,
          lugar: data.modalidad === 'VIRTUAL' ? data.link : data.lugar,
          estado: "PROGRAMADA",
        })
        .select()
        .single()

      if (sessionError) {
        throw new Error(`Error al crear la sesión: ${sessionError.message}`);
      }

      // Crear agenda vacía para la sesión
      const { error: agendaError } = await supabase.from("agendas").insert({
        sesion_id: newSession.id,
      })

      if (agendaError) {
        throw new Error(`Error al crear la agenda: ${agendaError.message}`);
      }

      // Asignar miembros a la sesión
      const miembrosSesion = data.miembros.map(miembroId => ({
        sesion_id: newSession.id,
        junta_directiva_miembro_id: miembroId,
      }))

      const { error: miembrosError } = await supabase
        .from("sesiones_participantes")
        .insert(miembrosSesion)

      if (miembrosError) {
        console.error("Detalle del error al asignar miembros:", JSON.stringify(miembrosError, null, 2));
        throw new Error(`Error al asignar miembros: ${miembrosError.message}`);
      }

      // Handle external participants emails and names
      if (incluirExternos) {
        const emails = (data.correosExternos || '').split(/[,\s]+/).map(email => email.trim()).filter(Boolean);
        const nombres = (data.nombresExternos || '').split(/[,\n]+/).map(nombre => nombre.trim()).filter(Boolean);
        
        console.log("Emails procesados:", emails, "Longitud:", emails.length);
        console.log("Nombres procesados:", nombres, "Longitud:", nombres.length);
        
        if (emails.length > 0) {
          if (nombres.length === 0) {
            throw new Error("Debe proporcionar nombres para los participantes externos.");
          }
          if (emails.length !== nombres.length) {
            throw new Error("El número de correos y nombres de participantes externos no coincide.");
          }

          const participantesExternosToInsert = emails.map((email, index) => ({
            sesion_id: newSession.id,
            email: email,
            nombre: nombres[index] || '' // Ensure a name is always present
          }));

          const { error: externalParticipantsError } = await supabase
            .from("sesion_participantes_externos")
            .insert(participantesExternosToInsert);

          if (externalParticipantsError) {
            console.error("Error inserting external participants:", externalParticipantsError);
            throw new Error(`Error al insertar participantes externos: ${externalParticipantsError.message}`);
          }
        }
      }

      console.log("New session created with ID:", newSession.id);
      router.push(`/dashboard/sesiones/${newSession.id}`)
    } catch (err: any) {
      setError(err.message || "Error desconocido al crear la sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo de Sesión</Label>
          <Select onValueChange={(value) => setValue("tipo", value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione el tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ORDINARIA">Ordinaria</SelectItem>
              <SelectItem value="EXTRAORDINARIA">Extraordinaria</SelectItem>
            </SelectContent>
          </Select>
          {errors.tipo && <p className="text-sm text-red-500">{errors.tipo.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="modalidad">Modalidad</Label>
          <Select onValueChange={(value) => setValue("modalidad", value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione la modalidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRESENCIAL">Presencial</SelectItem>
              <SelectItem value="VIRTUAL">Virtual</SelectItem>
            </SelectContent>
          </Select>
          {errors.modalidad && <p className="text-sm text-red-500">{errors.modalidad.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" type="date" {...register("fecha")} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]} />
          {errors.fecha && <p className="text-sm text-red-500">{errors.fecha.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hora">Hora</Label>
          <Input id="hora" type="time" {...register("hora")} />
          {errors.hora && <p className="text-sm text-red-500">{errors.hora.message}</p>}
        </div>
      </div>

      {modalidad === "VIRTUAL" && (
        <div className="space-y-2">
          <Label htmlFor="link">Link de la reunión virtual</Label>
          <Input 
            id="link" 
            placeholder="Ej: https://meet.google.com/xxx-yyyy-zzz" 
            {...register("link")} 
          />
          {errors.link && <p className="text-sm text-red-500">{errors.link.message}</p>}
        </div>
      )}

      {modalidad === "PRESENCIAL" && (
        <div className="space-y-2">
          <Label htmlFor="lugar">Lugar de la reunión</Label>
          <Input 
            id="lugar" 
            placeholder="Ej: Sala de Juntas Principal" 
            {...register("lugar")} 
          />
          {errors.lugar && <p className="text-sm text-red-500">{errors.lugar.message}</p>}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Miembros de la sesión</Label>
          <ScrollArea className="h-[200px] border rounded-md p-4">
            <div className="space-y-2">
              {juntaDirectivaMiembros.map((miembro) => (
                <div key={miembro.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`miembro-${miembro.id}`}
                    checked={miembrosSeleccionados.includes(miembro.id)}
                    onCheckedChange={(checked) => {
                      const nuevosMiembros = checked
                        ? [...miembrosSeleccionados, miembro.id]
                        : miembrosSeleccionados.filter(id => id !== miembro.id)
                      setValue("miembros", nuevosMiembros)
                    }}
                  />
                  <label
                    htmlFor={`miembro-${miembro.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {miembro.nombre_completo} ({miembro.correo})
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
          {errors.miembros && <p className="text-sm text-red-500">{errors.miembros.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="incluirExternos"
              checked={incluirExternos}
              onCheckedChange={(checked) => setValue("incluirExternos", !!checked)}
            />
            <Label htmlFor="incluirExternos">Incluir participantes externos</Label>
          </div>

          {incluirExternos && (
            <div className="space-y-2">
              <Label htmlFor="correosExternos">Correos electrónicos de participantes externos (separados por coma o salto de línea)</Label>
              <Textarea 
                id="correosExternos" 
                placeholder="Ej: invitado1@email.com, invitado2@email.com" 
                {...register("correosExternos")} 
              />
              {errors.correosExternos && <p className="text-sm text-red-500">{errors.correosExternos.message}</p>}

              <Label htmlFor="nombresExternos">Nombres de participantes externos (separados por coma o salto de línea)</Label>
              <Textarea 
                id="nombresExternos" 
                placeholder="Ej: Invitado Uno, Invitado Dos" 
                {...register("nombresExternos")} 
              />
              {errors.nombresExternos && <p className="text-sm text-red-500">{errors.nombresExternos.message}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Crear Sesión
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
