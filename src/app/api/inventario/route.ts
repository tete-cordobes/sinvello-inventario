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
    let franquiciaIds: string[] = []

    if (session.user.rol === Rol.CENTRAL) {
      // Central puede ver todas, pero puede filtrar por franquicia
      if (franquiciaId) {
        franquiciaIds = [franquiciaId]
      } else {
        // Obtener todas las franquicias
        const todasFranquicias = await prisma.franquicia.findMany({
          where: { activo: true },
          select: { id: true }
        })
        franquiciaIds = todasFranquicias.map(f => f.id)
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

      franquiciaIds = usuarioConFranquicias.franquicias.map(f => f.franquiciaId)
    }

    // Obtener las franquicias
    const franquicias = await prisma.franquicia.findMany({
      where: { id: { in: franquiciaIds }, activo: true },
      select: { id: true, nombre: true, codigo: true }
    })

    // Construir filtro de productos
    const productoWhere: Record<string, unknown> = { activo: true }
    
    if (categoria) {
      productoWhere.categoria = categoria
    }
    
    if (busqueda) {
      productoWhere.nombre = {
        contains: busqueda,
        mode: "insensitive",
      }
    }

    // Obtener todos los productos activos
    const productos = await prisma.producto.findMany({
      where: productoWhere,
      orderBy: { nombre: "asc" }
    })

    // Obtener inventario existente para las franquicias
    const inventarioExistente = await prisma.inventario.findMany({
      where: {
        franquiciaId: { in: franquiciaIds },
        producto: { activo: true }
      },
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
    })

    // Crear un mapa de inventario existente: franquiciaId_productoId -> inventario
    const inventarioMap = new Map<string, typeof inventarioExistente[0]>()
    inventarioExistente.forEach(inv => {
      inventarioMap.set(`${inv.franquiciaId}_${inv.productoId}`, inv)
    })

    // Generar lista completa: para cada producto y cada franquicia
    const resultado: Array<{
      id: string
      cantidadActual: number
      stockMinimo: number
      stockMaximo: number
      ubicacion: string | null
      createdAt: Date
      updatedAt: Date
      franquiciaId: string
      productoId: string
      producto: typeof productos[0]
      franquicia: typeof franquicias[0]
      esNuevo?: boolean
    }> = []

    for (const franquicia of franquicias) {
      for (const producto of productos) {
        const key = `${franquicia.id}_${producto.id}`
        const inventario = inventarioMap.get(key)

        if (inventario) {
          resultado.push(inventario)
        } else {
          // Crear registro virtual para productos sin inventario
          resultado.push({
            id: `nuevo_${franquicia.id}_${producto.id}`,
            cantidadActual: 0,
            stockMinimo: 5,
            stockMaximo: 100,
            ubicacion: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            franquiciaId: franquicia.id,
            productoId: producto.id,
            producto: producto,
            franquicia: franquicia,
            esNuevo: true
          })
        }
      }
    }

    // Filtrar por stock bajo si es necesario
    let resultadoFinal = resultado
    if (stockBajo) {
      resultadoFinal = resultado.filter(
        (item) => item.cantidadActual <= item.stockMinimo
      )
    }

    // Ordenar: primero por cantidad (menor primero), luego por nombre de producto
    resultadoFinal.sort((a, b) => {
      if (a.cantidadActual !== b.cantidadActual) {
        return a.cantidadActual - b.cantidadActual
      }
      return a.producto.nombre.localeCompare(b.producto.nombre)
    })

    // Obtener categorías únicas
    const categorias = await prisma.producto.groupBy({
      by: ["categoria"],
      where: { activo: true },
      _count: true,
    })

    return NextResponse.json({
      success: true,
      data: resultadoFinal,
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
