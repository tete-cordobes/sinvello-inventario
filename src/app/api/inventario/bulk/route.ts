import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Rol } from "@prisma/client"

interface BulkUpdateItem {
  inventarioId: string
  cantidadActual: number
  stockMinimo?: number
  stockMaximo?: number
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

    const results = await prisma.$transaction(
      updates.map((update) =>
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

    const movimientos = await Promise.all(
      updates.map((update, index) =>
        prisma.movimiento.create({
          data: {
            tipo: "AJUSTE",
            cantidad: Math.abs(update.cantidadActual - results[index].cantidadActual),
            cantidadAnterior: results[index].cantidadActual,
            cantidadNueva: update.cantidadActual,
            notas: "Actualización en bulk",
            origen: "MANUAL",
            inventarioId: update.inventarioId,
            usuarioId: session.user.id,
          },
        })
      )
    )

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
