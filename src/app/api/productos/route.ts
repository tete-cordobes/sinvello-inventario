import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Obtener todos los productos
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const productos = await prisma.producto.findMany({
      orderBy: { nombre: "asc" },
      include: {
        _count: {
          select: { inventario: true },
        },
      },
    })

    return NextResponse.json(productos)
  } catch (error) {
    console.error("Error al obtener productos:", error)
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    )
  }
}

// POST - Crear producto (solo CENTRAL)
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.rol !== "CENTRAL") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, descripcion, precio, imagenUrl, categoria, sku } = body

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      )
    }

    // Verificar SKU único si se proporciona
    if (sku) {
      const existingSku = await prisma.producto.findUnique({
        where: { sku },
      })
      if (existingSku) {
        return NextResponse.json(
          { error: "Ya existe un producto con ese SKU" },
          { status: 400 }
        )
      }
    }

    const producto = await prisma.producto.create({
      data: {
        nombre,
        descripcion: descripcion || null,
        precio: precio ? parseFloat(precio) : null,
        imagenUrl: imagenUrl || null,
        categoria: categoria || "Sin categoría",
        sku: sku || null,
      },
    })

    // Crear inventario inicial en todas las franquicias activas
    const franquicias = await prisma.franquicia.findMany({
      where: { activo: true },
    })

    await prisma.inventario.createMany({
      data: franquicias.map((f) => ({
        franquiciaId: f.id,
        productoId: producto.id,
        cantidadActual: 0,
        stockMinimo: 5,
        stockMaximo: 100,
      })),
    })

    return NextResponse.json(producto, { status: 201 })
  } catch (error) {
    console.error("Error al crear producto:", error)
    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    )
  }
}
