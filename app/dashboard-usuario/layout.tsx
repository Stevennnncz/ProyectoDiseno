import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
// Asume que esta navegación puede ser reutilizada o se adaptará más tarde
import { UserDashboardNav } from "@/components/user-dashboard/user-dashboard-nav"

export default async function DashboardUsuarioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: userData, error: userError } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    console.error("Error al obtener el rol del usuario en layout:", userError)
    redirect('/login')
  }

  // Si es administrador, redirigir al dashboard principal
  if (userData.rol === 'ADMINISTRADOR') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <UserDashboardNav user={user} /> 
      <main className="flex-1 ml-64 py-6 px-8">{children}</main>
    </div>
  )
} 