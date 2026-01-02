import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"
import { Rol } from "@prisma/client"

declare module "next-auth" {
  interface User {
    nombre?: string
    apellidos?: string
    rol?: string
    franquiciaId?: string
    franquiciaNombre?: string
    franquicias?: Array<{
      id: string
      nombre: string
    }>
  }

  interface Session {
    user: {
      id: string
      email: string
      nombre: string
      apellidos?: string
      rol: string
      franquiciaId?: string
      franquiciaNombre?: string
      franquicias?: Array<{
        id: string
        nombre: string
      }>
    }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Credenciales requeridas")
          }

          const user = await prisma.usuario.findUnique({
            where: { email: credentials.email as string },
            include: {
              franquicias: {
                include: {
                  franquicia: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
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

          if (!user.passwordHash) {
            throw new Error("Contraseña no configurada")
          }

          const isValidPassword = await compare(
            credentials.password as string,
            user.passwordHash
          )

          if (!isValidPassword) {
            throw new Error("Contraseña incorrecta")
          }

          const primeraFranquicia = user.franquicias[0]?.franquicia

          return {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            apellidos: user.apellidos ?? undefined,
            rol: user.rol,
            franquiciaId: primeraFranquicia?.id ?? undefined,
            franquiciaNombre: primeraFranquicia?.nombre ?? undefined,
            franquicias: user.franquicias.map((uf) => ({
              id: uf.franquicia.id,
              nombre: uf.franquicia.nombre,
            })),
          }
        } catch (error) {
          console.error("Error en authorize:", error)
          throw error
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
        token.franquicias = user.franquicias
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
        franquicias: token.franquicias as Array<{ id: string; nombre: string }> | undefined,
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
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
})

// Funciones de utilidad para verificar roles
export function canAccessAllFranquicias(rol: Rol): boolean {
  return rol === Rol.CENTRAL
}

export function canAccessReports(rol: Rol): boolean {
  return rol === Rol.CENTRAL || rol === Rol.FRANQUICIADO
}

export function canManageUsers(rol: Rol): boolean {
  return rol === Rol.CENTRAL || rol === Rol.FRANQUICIADO
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
      return [...baseItems, "movimientos", "reportes", "usuarios"]
    case Rol.TECNICO:
      return [...baseItems, "movimientos"]
    default:
      return baseItems
  }
}
