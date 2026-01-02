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
    const { tipo, cantidad, notas, franquiciaId, productoId } = body

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

    // Verificar si es un inventario nuevo (sin registro en BD)
    const esNuevo = id.startsWith("nuevo_")
    
    let inventario
    let inventarioId = id

    if (esNuevo) {
      // Validar que se proporcionen franquiciaId y productoId
      if (!franquiciaId || !productoId) {
        return NextResponse.json(
          { error: "Se requiere franquiciaId y productoId para crear inventario" },
          { status: 400 }
        )
      }

      // Verificar permisos para la franquicia
      if (session.user.rol !== Rol.CENTRAL) {
        const usuarioFranquicias = await prisma.usuarioFranquicia.findMany({
          where: { usuarioId: session.user.id },
          select: { franquiciaId: true }
        })
        const tieneAcceso = usuarioFranquicias.some(uf => uf.franquiciaId === franquiciaId)
        if (!tieneAcceso) {
          return NextResponse.json(
            { error: "No tienes permiso para esta franquicia" },
            { status: 403 }
          )
        }
      }

      // Crear el registro de inventario
      inventario = await prisma.inventario.create({
        data: {
          franquiciaId,
          productoId,
          cantidadActual: 0,
          stockMinimo: 5,
          stockMaximo: 100
        },
        include: { franquicia: true }
      })
      inventarioId = inventario.id
    } else {
      // Obtener inventario existente
      inventario = await prisma.inventario.findUnique({
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
      if (session.user.rol !== Rol.CENTRAL) {
        const usuarioFranquicias = await prisma.usuarioFranquicia.findMany({
          where: { usuarioId: session.user.id },
          select: { franquiciaId: true }
        })
        const tieneAcceso = usuarioFranquicias.some(uf => uf.franquiciaId === inventario!.franquiciaId)
        if (!tieneAcceso) {
          return NextResponse.json(
            { error: "No tienes permiso para esta franquicia" },
            { status: 403 }
          )
        }
      }
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
        where: { id: inventarioId },
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
          inventarioId: inventarioId,
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
