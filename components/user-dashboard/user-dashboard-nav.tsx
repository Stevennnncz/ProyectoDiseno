"use client"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Home, CalendarDays, History, LogOut, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface UserDashboardNavProps {
  user: any
}

export function UserDashboardNav({ user }: UserDashboardNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const navigation = [
    { name: "Principal", href: "/dashboard-usuario", icon: Home },
    { name: "Próximas sesiones", href: "/dashboard-usuario/proximas-sesiones", icon: CalendarDays },
    { name: "Historial", href: "/dashboard-usuario/historial", icon: History },
    { name: "Mis Acuerdos", href: "/dashboard-usuario/mis-acuerdos", icon: FileText },
  ]

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-blue-50 border-r flex flex-col justify-between z-40">
      <div>
        <div className="h-20 flex items-center justify-center border-b">
          <span className="text-2xl font-bold text-gray-900">Mi Panel</span>
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