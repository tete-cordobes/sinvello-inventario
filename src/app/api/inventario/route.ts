import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Rol } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get("categoria")
    const stockBajo = searchParams.get("stockBajo") === "true"
    const busqueda = searchParams.get("busqueda")
    const franquiciaId = searchParams.get("franquiciaId")

    // Determinar qué franquicia(s) puede ver el usuario
    const whereClause: Record<string, unknown> = {}

    if (session.user.rol === Rol.CENTRAL) {
      // Central puede ver todas, pero puede filtrar por franquicia
      if (franquiciaId) {
        whereClause.franquiciaId = franquiciaId
      }
    } else {
      // Franquiciado y Técnico: obtener franquicias actuales de la BD (no del JWT cacheado)
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
      
      // Si tiene múltiples franquicias, mostrar todas
      if (franquiciaIds.length === 1) {
        whereClause.franquiciaId = franquiciaIds[0]
      } else {
        whereClause.franquiciaId = { in: franquiciaIds }
      }
    }

    // Filtro por categoría
    if (categoria) {
      whereClause.producto = {
        categoria,
        activo: true,
      }
    } else {
      whereClause.producto = { activo: true }
    }

    // Filtro por búsqueda
    if (busqueda) {
      whereClause.producto = {
        ...whereClause.producto as object,
        nombre: {
          contains: busqueda,
          mode: "insensitive",
        },
      }
    }

    const inventario = await prisma.inventario.findMany({
      where: whereClause,
      include: {
        producto: true,
        franquicia: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
          },
        },
      },
      orderBy: [
        { cantidadActual: "asc" },
        { producto: { nombre: "asc" } },
      ],
    })

    // Filtrar por stock bajo si es necesario
    let resultado = inventario
    if (stockBajo) {
      resultado = inventario.filter(
        (item) => item.cantidadActual <= item.stockMinimo
      )
    }

    // Obtener categorías únicas
    const categorias = await prisma.producto.groupBy({
      by: ["categoria"],
      where: { activo: true },
      _count: true,
    })

    return NextResponse.json({
      success: true,
      data: resultado,
      categorias: categorias.map((c) => ({
        nombre: c.categoria,
        count: c._count,
      })),
    })
  } catch (error) {
    console.error("Error en GET /api/inventario:", error)
    return NextResponse.json(
      { error: "Error al obtener inventario" },
      { status: 500 }
    )
  }
}
