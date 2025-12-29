"use client"

import { Bell, Search } from "lucide-react"
import { Rol } from "@prisma/client"

interface HeaderProps {
  title: string
  subtitle?: string
  user: {
    nombre: string
    rol: Rol
    franquiciaNombre?: string
  }
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-white border-b border-[var(--border)] px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--sinvello-text-dark)]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[var(--sinvello-text)] mt-1">{subtitle}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sinvello-text)]"
            />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="pl-10 pr-4 py-2 w-64 rounded-lg border border-[var(--border)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                         focus:border-[var(--sinvello-primary)] transition-all"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
            <Bell size={20} className="text-[var(--sinvello-text-dark)]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--sinvello-primary)] rounded-full" />
          </button>
        </div>
      </div>
    </header>
  )
}
