import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Header } from "@/components/layout/Header"
import {
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Building2,
} from "lucide-react"
import { Rol } from "@prisma/client"
import Link from "next/link"

async function getStats(userId: string, rol: Rol, franquiciaId?: string) {
  const whereClause = rol === Rol.CENTRAL ? {} : { franquiciaId: franquiciaId! }

  const [
    totalProductos,
    inventarioStats,
    movimientosHoy,
    franquiciasCount,
  ] = await Promise.all([
    prisma.producto.count({ where: { activo: true } }),
    prisma.inventario.aggregate({
      where: whereClause,
      _sum: { cantidadActual: true },
    }),
    prisma.movimiento.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        inventario: rol === Rol.CENTRAL ? {} : { franquiciaId },
      },
    }),
    rol === Rol.CENTRAL ? prisma.franquicia.count({ where: { activo: true } }) : 1,
  ])

  const stockBajo = await prisma.inventario.count({
    where: {
      ...whereClause,
      cantidadActual: {
        lte: prisma.inventario.fields.stockMinimo,
      },
    },
  })

  const ultimosMovimientos = await prisma.movimiento.findMany({
    where: {
      inventario: rol === Rol.CENTRAL ? {} : { franquiciaId },
    },
    include: {
      inventario: {
        include: {
          producto: true,
          franquicia: true,
        },
      },
      usuario: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return {
    totalProductos,
    stockTotal: inventarioStats._sum.cantidadActual || 0,
    movimientosHoy,
    stockBajo,
    franquiciasCount,
    ultimosMovimientos,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const { rol, franquiciaId, franquiciaNombre } = session.user

  if (rol === Rol.TECNICO) {
    redirect("/inventario")
  }

  const stats = await getStats(session.user.id, rol, franquiciaId)

  const statsCards = [
    {
      title: "Productos en catálogo",
      value: stats.totalProductos,
      icon: Package,
      color: "bg-blue-500",
    },
    {
      title: "Stock total",
      value: stats.stockTotal.toLocaleString("es-ES"),
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      title: "Movimientos hoy",
      value: stats.movimientosHoy,
      icon: TrendingDown,
      color: "bg-purple-500",
    },
    {
      title: "Stock bajo",
      value: stats.stockBajo,
      icon: AlertTriangle,
      color: "bg-red-500",
      alert: stats.stockBajo > 0,
    },
  ]

  if (rol === Rol.CENTRAL) {
    statsCards.push({
      title: "Franquicias activas",
      value: stats.franquiciasCount,
      icon: Building2,
      color: "bg-[var(--sinvello-primary)]",
    })
  }

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={
          rol === Rol.CENTRAL
            ? "Vista general de todas las franquicias"
            : `Franquicia: ${franquiciaNombre}`
        }
        user={session.user}
      />

       <div className="p-8 space-y-8 container-normal">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                className={`card p-6 bg-gradient-to-br from-[var(--card)] to-[var(--muted)]
                           hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300
                           ${stat.alert ? "animate-pulse ring-2 ring-red-500 ring-offset-2" : ""}
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--sinvello-text)]">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-[var(--sinvello-text-dark)] mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-xl ${stat.color} text-white`}
                  >
                    <Icon size={24} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

          {/* Últimos movimientos */}
          <div className="card p-6 bg-gradient-to-br from-[var(--card)] to-[var(--muted)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                Últimos movimientos
              </h2>
              <Link
                href="/movimientos"
                className="text-[var(--primary)] hover:underline text-sm transition-all hover:text-[var(--primary-hover)]"
              >
                Ver todos
              </Link>
          </div>

          {stats.ultimosMovimientos.length === 0 ? (
            <p className="text-[var(--muted-foreground)] text-center py-8">
              No hay movimientos registrados
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                      Producto
                    </th>
                    {rol === Rol.CENTRAL && (
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                        Franquicia
                      </th>
                    )}
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                      Tipo
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                      Cantidad
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted-foreground)]">
                      Usuario
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.ultimosMovimientos.map((mov) => (
                    <tr
                      key={mov.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-[var(--foreground)]">
                        {mov.inventario.producto.nombre}
                      </td>
                      {rol === Rol.CENTRAL && (
                        <td className="py-3 px-4 text-[var(--muted-foreground)]">
                          {mov.inventario.franquicia.nombre}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            mov.tipo === "REPOSICION"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : mov.tipo === "CONSUMO"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            mov.tipo === "REPOSICION"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {mov.tipo === "REPOSICION" ? "+" : "-"}
                          {mov.cantidad}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)]">
                        {mov.usuario?.nombre || "Sistema"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
