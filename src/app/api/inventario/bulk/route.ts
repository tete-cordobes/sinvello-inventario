import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Rol } from "@prisma/client"

interface BulkUpdateItem {
  inventarioId: string
  cantidadActual: number
  stockMinimo?: number
  stockMaximo?: number
  franquiciaId?: string
  productoId?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { actualizaciones } = body

    if (!Array.isArray(actualizaciones) || actualizaciones.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de actualizaciones" },
        { status: 400 }
      )
    }

    const updates = actualizaciones as BulkUpdateItem[]
    
    // Separar actualizaciones existentes de nuevas
    const updatesExistentes = updates.filter(u => !u.inventarioId.startsWith("nuevo_"))
    const updatesNuevos = updates.filter(u => u.inventarioId.startsWith("nuevo_"))

    // Procesar actualizaciones existentes
    const resultsExistentes = await prisma.$transaction(
      updatesExistentes.map((update) =>
        prisma.inventario.update({
          where: { id: update.inventarioId },
          data: {
            cantidadActual: update.cantidadActual,
            ...(update.stockMinimo !== undefined && { stockMinimo: update.stockMinimo }),
            ...(update.stockMaximo !== undefined && { stockMaximo: update.stockMaximo }),
          },
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                imagenUrl: true,
                categoria: true,
              },
            },
            franquicia: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
              },
            },
          },
        })
      )
    )

    // Crear nuevos registros de inventario
    const resultsNuevos = await Promise.all(
      updatesNuevos.map(async (update) => {
        if (!update.franquiciaId || !update.productoId) {
          throw new Error("franquiciaId y productoId son requeridos para nuevos inventarios")
        }
        
        return prisma.inventario.create({
          data: {
            franquiciaId: update.franquiciaId,
            productoId: update.productoId,
            cantidadActual: update.cantidadActual,
            stockMinimo: update.stockMinimo ?? 5,
            stockMaximo: update.stockMaximo ?? 100,
          },
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                imagenUrl: true,
                categoria: true,
              },
            },
            franquicia: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
              },
            },
          },
        })
      })
    )

    const results = [...resultsExistentes, ...resultsNuevos]

    // Crear movimientos para todas las actualizaciones
    const movimientos = await Promise.all([
      // Movimientos para actualizaciones existentes
      ...updatesExistentes.map((update, index) =>
        prisma.movimiento.create({
          data: {
            tipo: "AJUSTE",
            cantidad: Math.abs(update.cantidadActual - resultsExistentes[index].cantidadActual),
            cantidadAnterior: resultsExistentes[index].cantidadActual,
            cantidadNueva: update.cantidadActual,
            notas: "Actualización en bulk",
            origen: "MANUAL",
            inventarioId: update.inventarioId,
            usuarioId: session.user.id,
          },
        })
      ),
      // Movimientos para nuevos inventarios
      ...resultsNuevos.map((result, index) =>
        prisma.movimiento.create({
          data: {
            tipo: "AJUSTE",
            cantidad: updatesNuevos[index].cantidadActual,
            cantidadAnterior: 0,
            cantidadNueva: updatesNuevos[index].cantidadActual,
            notas: "Stock inicial (bulk)",
            origen: "MANUAL",
            inventarioId: result.id,
            usuarioId: session.user.id,
          },
        })
      ),
    ])

    return NextResponse.json({
      success: true,
      data: results,
      movimientos: movimientos.length,
    })
  } catch (error) {
    console.error("Error en POST /api/inventario/bulk:", error)
    return NextResponse.json(
      { error: "Error al actualizar inventario en bulk" },
      { status: 500 }
    )
  }
}
