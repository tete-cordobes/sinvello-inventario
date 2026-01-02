import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

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

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        franquicias: {
          include: {
            franquicia: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
              },
            },
          },
        },
      },
    })

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(usuario)
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    return NextResponse.json(
      { error: "Error al obtener usuario" },
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
    const { nombre, apellidos, gmail, rol, franquiciasIds, activo, password } = body

    const updateData: Record<string, unknown> = {}

    if (nombre) updateData.nombre = nombre
    if (apellidos !== undefined) updateData.apellidos = apellidos
    if (gmail !== undefined) updateData.gmail = gmail || null
    if (rol) updateData.rol = rol
    if (activo !== undefined) updateData.activo = activo
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12)

    if (franquiciasIds !== undefined) {
      updateData.franquicias = {
        deleteMany: {},
        create: franquiciasIds.map((franquiciaId: string) => ({
          franquiciaId,
        })),
      }
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: updateData,
      include: {
        franquicias: {
          include: {
            franquicia: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(usuario)
  } catch (error) {
    console.error("Error al actualizar usuario:", error)
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
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
    const usuario = await prisma.usuario.update({
      where: { id },
      data: { activo: false },
    })

    return NextResponse.json({ success: true, id: usuario.id })
  } catch (error) {
    console.error("Error al eliminar usuario:", error)
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    )
  }
}
