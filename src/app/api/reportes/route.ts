import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Rol } from "@prisma/client"
import { subDays, subMonths, format, startOfDay, endOfDay } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo Central y Franquiciado pueden ver reportes
    if (session.user.rol === Rol.TECNICO) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get("periodo") || "semana" // semana, mes, trimestre
    const franquiciaId = searchParams.get("franquiciaId")

    // Determinar rango de fechas
    const now = new Date()
    let fechaInicio: Date
    let groupFormat: string

    switch (periodo) {
      case "mes":
        fechaInicio = subDays(now, 30)
        groupFormat = "yyyy-MM-dd"
        break
      case "trimestre":
        fechaInicio = subMonths(now, 3)
        groupFormat = "yyyy-MM-dd"
        break
      default: // semana
        fechaInicio = subDays(now, 7)
        groupFormat = "yyyy-MM-dd"
    }

    // Filtro base
    type WhereClause = {
      inventario?: {
        franquiciaId?: string
      }
      createdAt?: {
        gte: Date
        lte: Date
      }
    }

    const whereClause: WhereClause = {
      createdAt: {
        gte: startOfDay(fechaInicio),
        lte: endOfDay(now),
      },
    }

    if (session.user.rol === Rol.CENTRAL && franquiciaId) {
      whereClause.inventario = { franquiciaId }
    } else if (session.user.rol === Rol.FRANQUICIADO) {
      whereClause.inventario = { franquiciaId: session.user.franquiciaId! }
    }

    // Obtener movimientos del período
    const movimientos = await prisma.movimiento.findMany({
      where: whereClause,
      include: {
        inventario: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                categoria: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    // Agrupar por fecha
    const consumoPorDia: Record<string, { fecha: string; consumo: number; reposicion: number }> = {}
    const consumoPorProducto: Record<string, { nombre: string; consumo: number; reposicion: number }> = {}
    const consumoPorCategoria: Record<string, { categoria: string; consumo: number; reposicion: number }> = {}

    movimientos.forEach((mov) => {
      const fechaKey = format(new Date(mov.createdAt), groupFormat)
      const productoId = mov.inventario.producto.id
      const productoNombre = mov.inventario.producto.nombre
      const categoria = mov.inventario.producto.categoria

      // Por día
      if (!consumoPorDia[fechaKey]) {
        consumoPorDia[fechaKey] = { fecha: fechaKey, consumo: 0, reposicion: 0 }
      }

      // Por producto
      if (!consumoPorProducto[productoId]) {
        consumoPorProducto[productoId] = { nombre: productoNombre, consumo: 0, reposicion: 0 }
      }

      // Por categoría
      if (!consumoPorCategoria[categoria]) {
        consumoPorCategoria[categoria] = { categoria, consumo: 0, reposicion: 0 }
      }

      if (mov.tipo === "CONSUMO") {
        consumoPorDia[fechaKey].consumo += mov.cantidad
        consumoPorProducto[productoId].consumo += mov.cantidad
        consumoPorCategoria[categoria].consumo += mov.cantidad
      } else if (mov.tipo === "REPOSICION") {
        consumoPorDia[fechaKey].reposicion += mov.cantidad
        consumoPorProducto[productoId].reposicion += mov.cantidad
        consumoPorCategoria[categoria].reposicion += mov.cantidad
      }
    })

    // Ordenar y limitar
    const tendenciaDiaria = Object.values(consumoPorDia).sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
    )

    const topProductos = Object.values(consumoPorProducto)
      .sort((a, b) => b.consumo - a.consumo)
      .slice(0, 10)

    const distribucionCategorias = Object.values(consumoPorCategoria)
      .sort((a, b) => b.consumo - a.consumo)

    // Totales
    const totales = {
      totalConsumo: movimientos
        .filter((m) => m.tipo === "CONSUMO")
        .reduce((sum, m) => sum + m.cantidad, 0),
      totalReposicion: movimientos
        .filter((m) => m.tipo === "REPOSICION")
        .reduce((sum, m) => sum + m.cantidad, 0),
      totalMovimientos: movimientos.length,
    }

    // Franquicias (solo para Central)
    let franquicias: { id: string; nombre: string }[] = []
    if (session.user.rol === Rol.CENTRAL) {
      franquicias = await prisma.franquicia.findMany({
        where: { activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        tendenciaDiaria,
        topProductos,
        distribucionCategorias,
        totales,
        franquicias,
        periodo,
      },
    })
  } catch (error) {
    console.error("Error en GET /api/reportes:", error)
    return NextResponse.json(
      { error: "Error al obtener reportes" },
      { status: 500 }
    )
  }
}
