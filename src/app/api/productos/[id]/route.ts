import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Obtener un producto
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        inventario: {
          include: {
            franquicia: {
              select: { id: true, nombre: true, codigo: true },
            },
          },
        },
      },
    })

    if (!producto) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(producto)
  } catch (error) {
    console.error("Error al obtener producto:", error)
    return NextResponse.json(
      { error: "Error al obtener producto" },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar producto (solo CENTRAL)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.rol !== "CENTRAL") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { nombre, descripcion, precio, imagenUrl, categoria, sku, activo } = body

    // Verificar que el producto existe
    const existing = await prisma.producto.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      )
    }

    // Verificar SKU único si se cambia
    if (sku && sku !== existing.sku) {
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

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(descripcion !== undefined && { descripcion: descripcion || null }),
        ...(precio !== undefined && { precio: precio ? parseFloat(precio) : null }),
        ...(imagenUrl !== undefined && { imagenUrl: imagenUrl || null }),
        ...(categoria !== undefined && { categoria: categoria || "Sin categoría" }),
        ...(sku !== undefined && { sku: sku || null }),
        ...(activo !== undefined && { activo }),
      },
    })

    return NextResponse.json(producto)
  } catch (error) {
    console.error("Error al actualizar producto:", error)
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar producto (solo CENTRAL)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.rol !== "CENTRAL") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { id } = await params

    // Verificar que el producto existe
    const existing = await prisma.producto.findUnique({
      where: { id },
      include: {
        inventario: {
          include: {
            movimientos: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      )
    }

    // Verificar si tiene movimientos
    const tieneMovimientos = existing.inventario.some(
      (inv) => inv.movimientos.length > 0
    )

    if (tieneMovimientos) {
      // Si tiene movimientos, solo desactivar
      await prisma.producto.update({
        where: { id },
        data: { activo: false },
      })
      return NextResponse.json({ 
        message: "Producto desactivado (tiene historial de movimientos)" 
      })
    }

    // Si no tiene movimientos, eliminar completamente
    // Primero eliminar inventarios
    await prisma.inventario.deleteMany({
      where: { productoId: id },
    })

    // Luego eliminar producto
    await prisma.producto.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Producto eliminado" })
  } catch (error) {
    console.error("Error al eliminar producto:", error)
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    )
  }
}
