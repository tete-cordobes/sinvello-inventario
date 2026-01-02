"use client"

import { Bell, Search, Sun, Moon } from "lucide-react"
import { Rol } from "@prisma/client"
import { useTheme } from "@/app/providers"

interface HeaderProps {
  title: string
  subtitle?: string
  user?: {
    nombre: string
    rol: Rol
    franquiciaNombre?: string
  }
}

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className="glass bg-[var(--card)]/90 backdrop-blur-lg border-b border-[var(--border)] px-6 py-5 lg:px-8">
      <div className="flex items-center justify-between gap-6">
        {/* Title - with left margin on mobile to avoid hamburger menu overlap */}
        <div className="ml-12 lg:ml-0 flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-gradient tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[var(--muted-foreground)] mt-2 text-sm">{subtitle}</p>
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
                         bg-[var(--input)] text-[var(--foreground)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                         focus:border-[var(--sinvello-primary)] transition-all"
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors
                       border border-[var(--border)]"
            title={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-[var(--muted)] transition-colors border border-[var(--border)]">
            <Bell size={20} className="text-[var(--sinvello-text-dark)]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--sinvello-primary)] rounded-full" />
          </button>
        </div>
      </div>
    </header>
  )
}
