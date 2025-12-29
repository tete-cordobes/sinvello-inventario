import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TipoMovimiento, OrigenMovimiento, Rol } from "@prisma/client"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { tipo, cantidad, notas } = body

    // Validar tipo
    if (!["REPOSICION", "CONSUMO", "AJUSTE"].includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo de movimiento inválido" },
        { status: 400 }
      )
    }

    // Validar cantidad
    if (!cantidad || cantidad < 1) {
      return NextResponse.json(
        { error: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      )
    }

    // Obtener inventario
    const inventario = await prisma.inventario.findUnique({
      where: { id },
      include: { franquicia: true },
    })

    if (!inventario) {
      return NextResponse.json(
        { error: "Inventario no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos
    if (
      session.user.rol !== Rol.CENTRAL &&
      inventario.franquiciaId !== session.user.franquiciaId
    ) {
      return NextResponse.json(
        { error: "No tienes permiso para esta franquicia" },
        { status: 403 }
      )
    }

    // Calcular nueva cantidad
    const cantidadAnterior = inventario.cantidadActual
    let cantidadNueva: number

    if (tipo === "REPOSICION") {
      cantidadNueva = cantidadAnterior + cantidad
    } else if (tipo === "CONSUMO") {
      if (cantidad > cantidadAnterior) {
        return NextResponse.json(
          { error: "No hay suficiente stock" },
          { status: 400 }
        )
      }
      cantidadNueva = cantidadAnterior - cantidad
    } else {
      // AJUSTE: la cantidad es el valor absoluto final
      cantidadNueva = cantidad
    }

    // Transacción: actualizar inventario + crear movimiento
    const [inventarioActualizado, movimiento] = await prisma.$transaction([
      prisma.inventario.update({
        where: { id },
        data: { cantidadActual: cantidadNueva },
      }),
      prisma.movimiento.create({
        data: {
          tipo: tipo as TipoMovimiento,
          cantidad,
          cantidadAnterior,
          cantidadNueva,
          notas,
          origen: OrigenMovimiento.MANUAL,
          inventarioId: id,
          usuarioId: session.user.id,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        inventario: inventarioActualizado,
        movimiento,
      },
    })
  } catch (error) {
    console.error("Error en POST /api/inventario/[id]/movimiento:", error)
    return NextResponse.json(
      { error: "Error al registrar movimiento" },
      { status: 500 }
    )
  }
}
