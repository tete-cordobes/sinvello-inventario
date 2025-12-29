import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.rol !== "CENTRAL") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const franquicia = await prisma.franquicia.findUnique({
      where: { id },
      include: {
        usuarios: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
            activo: true,
          },
        },
        _count: {
          select: {
            inventario: true,
          },
        },
      },
    })

    if (!franquicia) {
      return NextResponse.json(
        { error: "Franquicia no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(franquicia)
  } catch (error) {
    console.error("Error al obtener franquicia:", error)
    return NextResponse.json(
      { error: "Error al obtener franquicia" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || session.user.rol !== "CENTRAL") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, direccion, telefono, email, activo } = body

    const franquicia = await prisma.franquicia.update({
      where: { id },
      data: {
        ...(nombre && { nombre }),
        ...(direccion !== undefined && { direccion }),
        ...(telefono !== undefined && { telefono }),
        ...(email !== undefined && { email }),
        ...(activo !== undefined && { activo }),
      },
    })

    return NextResponse.json(franquicia)
  } catch (error) {
    console.error("Error al actualizar franquicia:", error)
    return NextResponse.json(
      { error: "Error al actualizar franquicia" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || session.user.rol !== "CENTRAL") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // En lugar de eliminar, desactivamos
    const franquicia = await prisma.franquicia.update({
      where: { id },
      data: { activo: false },
    })

    return NextResponse.json(franquicia)
  } catch (error) {
    console.error("Error al eliminar franquicia:", error)
    return NextResponse.json(
      { error: "Error al eliminar franquicia" },
      { status: 500 }
    )
  }
}
