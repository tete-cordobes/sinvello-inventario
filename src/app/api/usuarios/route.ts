import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo CENTRAL puede ver todos los usuarios
    if (session.user.rol !== "CENTRAL") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        apellidos: true,
        rol: true,
        activo: true,
        createdAt: true,
        franquicia: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(usuarios)
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
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
    const { email, password, nombre, apellidos, rol, franquiciaId } = body

    if (!email || !password || !nombre || !rol) {
      return NextResponse.json(
        { error: "Email, contraseña, nombre y rol son requeridos" },
        { status: 400 }
      )
    }

    // Verificar que el email no exista
    const existing = await prisma.usuario.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 400 }
      )
    }

    // Si no es CENTRAL, debe tener franquicia asignada
    if (rol !== "CENTRAL" && !franquiciaId) {
      return NextResponse.json(
        { error: "Los usuarios no centrales deben tener una franquicia asignada" },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const usuario = await prisma.usuario.create({
      data: {
        email,
        passwordHash,
        nombre,
        apellidos,
        rol,
        franquiciaId: rol === "CENTRAL" ? null : franquiciaId,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellidos: true,
        rol: true,
        activo: true,
        franquicia: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    })

    return NextResponse.json(usuario, { status: 201 })
  } catch (error) {
    console.error("Error al crear usuario:", error)
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    )
  }
}
