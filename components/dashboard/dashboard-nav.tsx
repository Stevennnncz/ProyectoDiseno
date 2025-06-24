"use client"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Home, PlusCircle, CalendarDays, History, LogOut, Settings, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface DashboardNavProps {
  user: any
}

export function DashboardNav({ user }: DashboardNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const navigation = [
    { name: "Principal", href: "/dashboard", icon: Home },
    { name: "Próximas sesiones", href: "/dashboard/sesiones", icon: CalendarDays },
    { name: "Historial", href: "/dashboard/historial", icon: History },
  ]

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-blue-50 border-r flex flex-col justify-between z-40">
      <div>
        <div className="h-20 flex items-center justify-center border-b">
          <span className="text-2xl font-bold text-gray-900">Panel Principal</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${pathname === item.href ? "bg-white text-blue-700 font-semibold" : "text-gray-700 hover:bg-blue-100"}`}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          ))}
          <Link
            href="/dashboard/sesiones/crear"
            className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${pathname === "/dashboard/sesiones/crear" ? "bg-white text-blue-700 font-semibold" : "text-gray-700 hover:bg-blue-100"}`}
          >
            <PlusCircle className="h-5 w-5 mr-3" />
            Nueva Sesión
          </Link>

          <div className="pt-4 mt-4 border-t">
            <div className="px-4 mb-2">
              <span className="text-sm font-semibold text-gray-500">Configuración</span>
            </div>
            {
            <Link
              href="/dashboard/configuracion/usuarios"
              className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${pathname === "/dashboard/configuracion/usuarios" ? "bg-white text-blue-700 font-semibold" : "text-gray-700 hover:bg-blue-100"}`}
            >
              <Users className="h-5 w-5 mr-3" />
              Gestionar Usuarios
            </Link>
            }
            
            <Link
              href="/dashboard/junta-directiva"
              className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${pathname === "/dashboard/junta-directiva" ? "bg-white text-blue-700 font-semibold" : "text-gray-700 hover:bg-blue-100"}`}
            >
              <Users className="h-5 w-5 mr-3" />
              Junta Directiva
            </Link>
          </div>
        </nav>
      </div>
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 rounded-lg text-base font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

