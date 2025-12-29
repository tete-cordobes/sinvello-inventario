import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo CENTRAL puede ver todas las franquicias
    if (session.user.rol !== "CENTRAL") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const franquicias = await prisma.franquicia.findMany({
      include: {
        _count: {
          select: {
            usuarios: true,
            inventario: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(franquicias)
  } catch (error) {
    console.error("Error al obtener franquicias:", error)
    return NextResponse.json(
      { error: "Error al obtener franquicias" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user || session.user.rol !== "CENTRAL") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { codigo, nombre, direccion, telefono, email } = body

    if (!codigo || !nombre) {
      return NextResponse.json(
        { error: "Código y nombre son requeridos" },
        { status: 400 }
      )
    }

    // Verificar que el código no exista
    const existing = await prisma.franquicia.findUnique({
      where: { codigo },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una franquicia con ese código" },
        { status: 400 }
      )
    }

    const franquicia = await prisma.franquicia.create({
      data: {
        codigo,
        nombre,
        direccion,
        telefono,
        email,
      },
    })

    // Crear inventario inicial para todos los productos
    const productos = await prisma.producto.findMany({
      where: { activo: true },
    })

    await prisma.inventario.createMany({
      data: productos.map((producto) => ({
        franquiciaId: franquicia.id,
        productoId: producto.id,
        cantidadActual: 0,
        stockMinimo: 5,
        stockMaximo: 100,
      })),
    })

    return NextResponse.json(franquicia, { status: 201 })
  } catch (error) {
    console.error("Error al crear franquicia:", error)
    return NextResponse.json(
      { error: "Error al crear franquicia" },
      { status: 500 }
    )
  }
}
