import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
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
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      rol: usuario.rol,
      franquicias: usuario.franquicias.map((uf) => ({
        id: uf.franquicia.id,
        nombre: uf.franquicia.nombre,
        codigo: uf.franquicia.codigo,
      })),
    })
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 }
    )
  }
}
