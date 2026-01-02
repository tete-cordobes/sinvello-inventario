"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import Image from "next/image"
import {
  LayoutDashboard,
  Package,
  History,
  BarChart3,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Rol } from "@prisma/client"

interface SidebarProps {
  user: {
    nombre: string
    apellidos?: string
    email: string
    rol: Rol
    franquiciaNombre?: string
  }
}

const menuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["CENTRAL", "FRANQUICIADO"],
  },
  {
    name: "Inventario",
    href: "/inventario",
    icon: Package,
    roles: ["CENTRAL", "FRANQUICIADO", "TECNICO"],
  },
  {
    name: "Movimientos",
    href: "/movimientos",
    icon: History,
    roles: ["CENTRAL", "FRANQUICIADO", "TECNICO"],
  },
  {
    name: "Reportes",
    href: "/reportes",
    icon: BarChart3,
    roles: ["CENTRAL", "FRANQUICIADO"],
  },
  {
    name: "Franquicias",
    href: "/franquicias",
    icon: Building2,
    roles: ["CENTRAL"],
  },
  {
    name: "Usuarios",
    href: "/usuarios",
    icon: Users,
    roles: ["CENTRAL"],
  },
]

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user.rol)
  )

  const getRolLabel = (rol: Rol) => {
    switch (rol) {
      case "CENTRAL":
        return "Administrador Central"
      case "FRANQUICIADO":
        return "Franquiciado"
      case "TECNICO":
        return "Técnico"
      default:
        return rol
    }
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg lg:hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-72 bg-[var(--card)]/80 backdrop-blur-xl border-r border-[var(--border)]",
          "transform transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-[var(--border)]">
            <div className="relative w-36 h-12">
              <Image
                src="https://pedidos.sinvelloporlaser.es/wp-content/uploads/2025/03/logo.avif"
                alt="SinVello"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-sm text-[var(--sinvello-text)] mt-2">
              Sistema de Inventario
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {filteredMenuItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg",
                        "transition-all duration-200",
                        isActive
                          ? "bg-[var(--sinvello-primary)] text-white shadow-md shadow-[var(--sinvello-primary)]/30"
                          : "text-[var(--sinvello-text-dark)] hover:bg-[var(--accent)]"
                      )}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{item.name}</span>
                      {isActive && (
                        <ChevronRight size={16} className="ml-auto" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-[var(--border)]">
            <div className="p-4 rounded-lg bg-[var(--muted)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[var(--sinvello-primary)] flex items-center justify-center text-white font-bold">
                  {user.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--sinvello-text-dark)] truncate">
                    {user.nombre} {user.apellidos}
                  </p>
                  <p className="text-xs text-[var(--sinvello-text)] truncate">
                    {getRolLabel(user.rol)}
                  </p>
                </div>
              </div>

              {user.franquiciaNombre && (
                <div className="flex items-center gap-2 text-sm text-[var(--sinvello-text)] mb-3">
                  <Building2 size={14} />
                  <span className="truncate">{user.franquiciaNombre}</span>
                </div>
              )}

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg
                           border border-[var(--border)] text-[var(--foreground)]
                           bg-[var(--input)] hover:bg-[var(--muted)]
                           hover:border-[var(--sinvello-primary)] hover:text-[var(--sinvello-primary)]
                           transition-all duration-200 active:scale-95"
              >
                <LogOut size={16} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
