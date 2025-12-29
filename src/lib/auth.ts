import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"
import { Rol } from "@prisma/client"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales requeridas")
        }

        const user = await prisma.usuario.findUnique({
          where: { email: credentials.email as string },
          include: {
            franquicia: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        })

        if (!user) {
          throw new Error("Usuario no encontrado")
        }

        if (!user.activo) {
          throw new Error("Usuario desactivado")
        }

        const isValidPassword = await compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValidPassword) {
          throw new Error("Contraseña incorrecta")
        }

        return {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellidos: user.apellidos ?? undefined,
          rol: user.rol,
          franquiciaId: user.franquiciaId ?? undefined,
          franquiciaNombre: user.franquicia?.nombre ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email!
        token.nombre = user.nombre
        token.apellidos = user.apellidos
        token.rol = user.rol
        token.franquiciaId = user.franquiciaId
        token.franquiciaNombre = user.franquiciaNombre
      }
      return token
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any) = {
        id: token.id as string,
        email: token.email as string,
        nombre: token.nombre as string,
        apellidos: token.apellidos as string | undefined,
        rol: token.rol as Rol,
        franquiciaId: token.franquiciaId as string | undefined,
        franquiciaNombre: token.franquiciaNombre as string | undefined,
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },
  secret: process.env.NEXTAUTH_SECRET,
})

// Funciones de utilidad para verificar roles
export function canAccessAllFranquicias(rol: Rol): boolean {
  return rol === Rol.CENTRAL
}

export function canAccessReports(rol: Rol): boolean {
  return rol === Rol.CENTRAL || rol === Rol.FRANQUICIADO
}

export function canManageUsers(rol: Rol): boolean {
  return rol === Rol.CENTRAL
}

export function canManageFranquicias(rol: Rol): boolean {
  return rol === Rol.CENTRAL
}

export function canRegisterMovimientos(rol: Rol): boolean {
  return true // Todos los roles pueden registrar movimientos
}

export function getMenuItemsByRole(rol: Rol): string[] {
  const baseItems = ["dashboard", "inventario"]

  switch (rol) {
    case Rol.CENTRAL:
      return [...baseItems, "movimientos", "reportes", "franquicias", "usuarios"]
    case Rol.FRANQUICIADO:
      return [...baseItems, "movimientos", "reportes"]
    case Rol.TECNICO:
      return [...baseItems, "movimientos"]
    default:
      return baseItems
  }
}
