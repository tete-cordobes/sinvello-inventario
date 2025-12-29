"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/Header"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Loader2, TrendingUp, TrendingDown, Package, Activity } from "lucide-react"
import { Rol } from "@prisma/client"

interface ReportData {
  tendenciaDiaria: { fecha: string; consumo: number; reposicion: number }[]
  topProductos: { nombre: string; consumo: number; reposicion: number }[]
  distribucionCategorias: { categoria: string; consumo: number; reposicion: number }[]
  totales: {
    totalConsumo: number
    totalReposicion: number
    totalMovimientos: number
  }
  franquicias: { id: string; nombre: string }[]
  periodo: string
}

const COLORS = ["#E6336E", "#1E1E1E", "#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"]

export default function ReportesPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [periodo, setPeriodo] = useState("semana")
  const [franquiciaId, setFranquiciaId] = useState("")

  const fetchReportes = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.set("periodo", periodo)
      if (franquiciaId) params.set("franquiciaId", franquiciaId)

      const response = await fetch(`/api/reportes?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reportes")
    } finally {
      setIsLoading(false)
    }
  }, [periodo, franquiciaId])

  useEffect(() => {
    fetchReportes()
  }, [fetchReportes])

  if (!session) return null

  const periodos = [
    { value: "semana", label: "Última semana" },
    { value: "mes", label: "Último mes" },
    { value: "trimestre", label: "Último trimestre" },
  ]

  return (
    <div>
      <Header
        title="Reportes"
        subtitle="Análisis de consumo y reposición de inventario"
        user={session.user}
      />

      <div className="p-6">
        {/* Filtros */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Período */}
            <div>
              <label className="block text-sm font-medium text-[var(--sinvello-text-dark)] mb-1">
                Período
              </label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-[var(--border)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                           focus:border-[var(--sinvello-primary)] transition-all"
              >
                {periodos.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Franquicia (solo Central) */}
            {session.user.rol === Rol.CENTRAL && data?.franquicias && (
              <div>
                <label className="block text-sm font-medium text-[var(--sinvello-text-dark)] mb-1">
                  Franquicia
                </label>
                <select
                  value={franquiciaId}
                  onChange={(e) => setFranquiciaId(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border border-[var(--border)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                             focus:border-[var(--sinvello-primary)] transition-all min-w-[200px]"
                >
                  <option value="">Todas las franquicias</option>
                  {data.franquicias.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 mb-6 rounded-lg bg-red-50 border border-red-200 text-red-600">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[var(--sinvello-primary)]" size={40} />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-red-100 text-red-600">
                    <TrendingDown size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--sinvello-text)]">
                      Total consumo
                    </p>
                    <p className="text-2xl font-bold text-[var(--sinvello-text-dark)]">
                      {data.totales.totalConsumo.toLocaleString("es-ES")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-100 text-green-600">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--sinvello-text)]">
                      Total reposición
                    </p>
                    <p className="text-2xl font-bold text-[var(--sinvello-text-dark)]">
                      {data.totales.totalReposicion.toLocaleString("es-ES")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                    <Activity size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--sinvello-text)]">
                      Movimientos totales
                    </p>
                    <p className="text-2xl font-bold text-[var(--sinvello-text-dark)]">
                      {data.totales.totalMovimientos.toLocaleString("es-ES")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico de tendencia */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-[var(--sinvello-text-dark)] mb-4">
                Tendencia diaria
              </h3>
              {data.tendenciaDiaria.length === 0 ? (
                <div className="text-center py-10 text-[var(--sinvello-text)]">
                  No hay datos para el período seleccionado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.tendenciaDiaria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return `${date.getDate()}/${date.getMonth() + 1}`
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E5E5E5",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="consumo"
                      name="Consumo"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={{ fill: "#EF4444" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="reposicion"
                      name="Reposición"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={{ fill: "#22C55E" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top productos */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-[var(--sinvello-text-dark)] mb-4">
                  Top 10 productos más consumidos
                </h3>
                {data.topProductos.length === 0 ? (
                  <div className="text-center py-10 text-[var(--sinvello-text)]">
                    No hay datos
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={data.topProductos}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="nombre"
                        tick={{ fontSize: 10 }}
                        width={120}
                        tickFormatter={(value) =>
                          value.length > 15 ? value.slice(0, 15) + "..." : value
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #E5E5E5",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="consumo" name="Consumo" fill="#E6336E" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Distribución por categorías */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-[var(--sinvello-text-dark)] mb-4">
                  Consumo por categoría
                </h3>
                {data.distribucionCategorias.length === 0 ? (
                  <div className="text-center py-10 text-[var(--sinvello-text)]">
                    No hay datos
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.distribucionCategorias}
                        dataKey="consumo"
                        nameKey="categoria"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {data.distribucionCategorias.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #E5E5E5",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Tabla resumen por categoría */}
            <div className="card overflow-hidden">
              <div className="p-6 border-b border-[var(--border)]">
                <h3 className="text-lg font-semibold text-[var(--sinvello-text-dark)]">
                  Resumen por categoría
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--muted)]">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-medium text-[var(--sinvello-text)]">
                        Categoría
                      </th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-[var(--sinvello-text)]">
                        Consumo
                      </th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-[var(--sinvello-text)]">
                        Reposición
                      </th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-[var(--sinvello-text)]">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.distribucionCategorias.map((cat, index) => (
                      <tr
                        key={cat.categoria}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium text-[var(--sinvello-text-dark)]">
                              {cat.categoria}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right text-red-600">
                          -{cat.consumo}
                        </td>
                        <td className="py-4 px-6 text-right text-green-600">
                          +{cat.reposicion}
                        </td>
                        <td
                          className={`py-4 px-6 text-right font-medium ${
                            cat.reposicion - cat.consumo >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {cat.reposicion - cat.consumo > 0 ? "+" : ""}
                          {cat.reposicion - cat.consumo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
