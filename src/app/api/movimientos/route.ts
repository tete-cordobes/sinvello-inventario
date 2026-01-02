import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Rol, TipoMovimiento } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const tipo = searchParams.get("tipo")
    const productoId = searchParams.get("productoId")
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")
    const franquiciaId = searchParams.get("franquiciaId")

    const skip = (page - 1) * limit

    // Construir filtro base según rol
    type WhereClause = {
      inventario?: {
        franquiciaId?: string
        productoId?: string
      }
      tipo?: TipoMovimiento
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    }

    const whereClause: WhereClause = {}

    if (session.user.rol === Rol.CENTRAL) {
      if (franquiciaId) {
        whereClause.inventario = { franquiciaId }
      }
    } else {
      // Obtener franquicias actuales de la BD (no del JWT cacheado)
      const usuarioConFranquicias = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        include: {
          franquicias: {
            select: {
              franquiciaId: true,
            },
          },
        },
      })

      if (!usuarioConFranquicias || usuarioConFranquicias.franquicias.length === 0) {
        return NextResponse.json(
          { error: "Usuario sin franquicia asignada" },
          { status: 400 }
        )
      }

      const franquiciaIds = usuarioConFranquicias.franquicias.map(f => f.franquiciaId)
      
      if (franquiciaIds.length === 1) {
        whereClause.inventario = { franquiciaId: franquiciaIds[0] }
      } else {
        whereClause.inventario = { franquiciaId: { in: franquiciaIds } as unknown as string }
      }
    }

    // Filtros adicionales
    if (tipo && Object.values(TipoMovimiento).includes(tipo as TipoMovimiento)) {
      whereClause.tipo = tipo as TipoMovimiento
    }

    if (productoId) {
      whereClause.inventario = {
        ...whereClause.inventario,
        productoId,
      }
    }

    if (desde || hasta) {
      whereClause.createdAt = {}
      if (desde) {
        whereClause.createdAt.gte = new Date(desde)
      }
      if (hasta) {
        const hastaDate = new Date(hasta)
        hastaDate.setHours(23, 59, 59, 999)
        whereClause.createdAt.lte = hastaDate
      }
    }

    // Obtener movimientos con paginación
    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({
        where: whereClause,
        include: {
          inventario: {
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
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.movimiento.count({ where: whereClause }),
    ])

    return NextResponse.json({
      success: true,
      data: movimientos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error en GET /api/movimientos:", error)
    return NextResponse.json(
      { error: "Error al obtener movimientos" },
      { status: 500 }
    )
  }
}
