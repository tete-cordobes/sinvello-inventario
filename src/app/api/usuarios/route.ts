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

    // CENTRAL puede ver todos los usuarios
    if (session.user.rol === "CENTRAL") {
      const usuarios = await prisma.usuario.findMany({
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
            orderBy: {
              franquicia: {
                nombre: "asc",
              },
            },
          },
        },
        orderBy: { nombre: "asc" },
      })

      const formattedUsuarios = usuarios.map((usuario) => ({
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        rol: usuario.rol,
        activo: usuario.activo,
        createdAt: usuario.createdAt,
        franquicias: usuario.franquicias.map((uf) => ({
          id: uf.franquicia.id,
          nombre: uf.franquicia.nombre,
          codigo: uf.franquicia.codigo,
        })),
      }))

      return NextResponse.json(formattedUsuarios)
    }

    // FRANQUICIADO solo puede ver usuarios de sus franquicias
    if (session.user.rol === "FRANQUICIADO") {
      const usuarioConFranquicias = await prisma.usuario.findUnique({
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

      if (!usuarioConFranquicias) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
      }

      const miFranquiciaIds = usuarioConFranquicias.franquicias.map((uf) => uf.franquiciaId)

      const usuarios = await prisma.usuario.findMany({
        where: {
          franquicias: {
            some: {
              franquiciaId: {
                in: miFranquiciaIds,
              },
            },
          },
        },
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
            orderBy: {
              franquicia: {
                nombre: "asc",
              },
            },
          },
        },
        orderBy: { nombre: "asc" },
      })

      const formattedUsuarios = usuarios.map((usuario) => ({
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        rol: usuario.rol,
        activo: usuario.activo,
        createdAt: usuario.createdAt,
        franquicias: usuario.franquicias.map((uf) => ({
          id: uf.franquicia.id,
          nombre: uf.franquicia.nombre,
          codigo: uf.franquicia.codigo,
        })),
      }))

      return NextResponse.json(formattedUsuarios)
    }

    // TECNICO no puede ver usuarios
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
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

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { email, password, nombre, apellidos, rol, franquiciasIds } = body

    if (!email || !password || !nombre || !rol) {
      return NextResponse.json(
        { error: "Email, contraseña, nombre y rol son requeridos" },
        { status: 400 }
      )
    }

    // CENTRAL puede crear cualquier usuario
    if (session.user.rol === "CENTRAL") {
      // Si no es CENTRAL, debe tener al menos una franquicia asignada
      if (rol !== "CENTRAL" && (!franquiciasIds || franquiciasIds.length === 0)) {
        return NextResponse.json(
          { error: "Los usuarios no centrales deben tener al menos una franquicia asignada" },
          { status: 400 }
        )
      }
    }
    // FRANQUICIADO solo puede crear TECNICOS para sus franquicias
    else if (session.user.rol === "FRANQUICIADO") {
      if (rol !== "TECNICO") {
        return NextResponse.json(
          { error: "Solo puedes crear técnicos" },
          { status: 403 }
        )
      }

      // Verificar que las franquicias asignadas son del franquiciado
      const usuarioConFranquicias = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        include: {
          franquicias: true,
        },
      })

      if (!usuarioConFranquicias) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
      }

      const miFranquiciaIds = usuarioConFranquicias.franquicias.map((uf) => uf.franquiciaId)

      if (!franquiciasIds || franquiciasIds.length === 0) {
        return NextResponse.json(
          { error: "Debes asignar al menos una franquicia" },
          { status: 400 }
        )
      }

      const invalidFranquicias = franquiciasIds.filter((id: string) => !miFranquiciaIds.includes(id))
      if (invalidFranquicias.length > 0) {
        return NextResponse.json(
          { error: "Solo puedes asignar tus franquicias" },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
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

    const passwordHash = await bcrypt.hash(password, 12)

    const usuario = await prisma.usuario.create({
      data: {
        email,
        passwordHash,
        nombre,
        apellidos,
        rol,
        ...(rol !== "CENTRAL" && franquiciasIds && {
          franquicias: {
            create: franquiciasIds.map((franquiciaId: string) => ({
              franquiciaId,
            })),
          },
        }),
      },
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

    const formattedUsuario = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      rol: usuario.rol,
      activo: usuario.activo,
      createdAt: usuario.createdAt,
      franquicias: usuario.franquicias.map((uf) => ({
        id: uf.franquicia.id,
        nombre: uf.franquicia.nombre,
        codigo: uf.franquicia.codigo,
      })),
    }

    return NextResponse.json(formattedUsuario, { status: 201 })
  } catch (error) {
    console.error("Error al crear usuario:", error)
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    )
  }
}
