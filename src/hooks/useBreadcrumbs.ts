"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Home } from "lucide-react"
import { Breadcrumb } from "@/components/layout/Breadcrumb"

interface BreadcrumbItem {
  label: string
  href: string
}

export function useBreadcrumbs() {
  const pathname = usePathname()

  const getBreadcrumbs = useCallback(() => {
    const items: BreadcrumbItem[] = []

    if (pathname === "/dashboard") {
      items.push({ label: "Dashboard", href: "/dashboard" })
    } else if (pathname === "/inventario") {
      items.push({ label: "Inventario", href: "/inventario" })
    } else if (pathname === "/movimientos") {
      items.push({ label: "Movimientos", href: "/movimientos" })
    } else if (pathname === "/reportes") {
      items.push({ label: "Reportes", href: "/reportes" })
    } else if (pathname === "/franquicias") {
      items.push({ label: "Franquicias", href: "/franquicias" })
    } else if (pathname === "/usuarios") {
      items.push({ label: "Usuarios", href: "/usuarios" })
    }

    return items
  }, [pathname])

  return { breadcrumbs: getBreadcrumbs() }
}
