"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/Header"
import {
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings,
  FileSpreadsheet,
} from "lucide-react"
import { showToast } from "@/components/ui/Toast"
import { formatDate } from "@/lib/utils"
import { Rol } from "@prisma/client"

interface Movimiento {
  id: string
  tipo: "REPOSICION" | "CONSUMO" | "AJUSTE"
  cantidad: number
  cantidadAnterior: number
  cantidadNueva: number
  notas: string | null
  origen: "MANUAL" | "WEBHOOK" | "SISTEMA"
  createdAt: string
  inventario: {
    producto: {
      id: string
      nombre: string
      categoria: string
    }
    franquicia: {
      id: string
      nombre: string
      codigo: string
    }
  }
  usuario: {
    id: string
    nombre: string
    apellidos: string | null
  } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function MovimientosPage() {
  const { data: session } = useSession()
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Filtros
  const [tipoFiltro, setTipoFiltro] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  const fetchMovimientos = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.set("page", pagination.page.toString())
      params.set("limit", pagination.limit.toString())
      if (tipoFiltro) params.set("tipo", tipoFiltro)
      if (desde) params.set("desde", desde)
      if (hasta) params.set("hasta", hasta)

      const response = await fetch(`/api/movimientos?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setMovimientos(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar movimientos")
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, tipoFiltro, desde, hasta])

  useEffect(() => {
    fetchMovimientos()
  }, [fetchMovimientos])

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "REPOSICION":
        return <ArrowUpCircle size={18} className="text-green-600" />
      case "CONSUMO":
        return <ArrowDownCircle size={18} className="text-red-600" />
      default:
        return <Settings size={18} className="text-yellow-600" />
    }
  }

  const getTipoStyle = (tipo: string) => {
    switch (tipo) {
      case "REPOSICION":
        return "bg-green-100 text-green-700"
      case "CONSUMO":
        return "bg-red-100 text-red-700"
      default:
        return "bg-yellow-100 text-yellow-700"
    }
  }

  const exportarCSV = () => {
    const headers = [
      "Fecha",
      "Producto",
      "Franquicia",
      "Tipo",
      "Cantidad",
      "Stock anterior",
      "Stock nuevo",
      "Usuario",
      "Notas",
    ]
    const rows = movimientos.map((m) => [
      new Date(m.createdAt).toLocaleString("es-ES"),
      m.inventario.producto.nombre,
      m.inventario.franquicia.nombre,
      m.tipo,
      m.cantidad,
      m.cantidadAnterior,
      m.cantidadNueva,
      m.usuario ? `${m.usuario.nombre} ${m.usuario.apellidos || ""}` : "Sistema",
      m.notas || "",
    ])

    const csv = [headers, ...rows].map((row) => row.join(";")).join("\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `movimientos_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const exportarExcel = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (tipoFiltro) params.set("tipo", tipoFiltro)
      if (desde) params.set("desde", desde)
      if (hasta) params.set("hasta", hasta)
      
      const response = await fetch(`/api/export/movimientos?${params}`)
      
      if (!response.ok) {
        throw new Error("Error al exportar")
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "movimientos.xlsx"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar")
    } finally {
      setIsExporting(false)
    }
  }

  const exportarSheets = async () => {
    try {
      const params = new URLSearchParams()
      params.set("type", "movimientos")
      if (tipoFiltro) params.set("tipo", tipoFiltro)
      if (desde) params.set("desde", desde)
      if (hasta) params.set("hasta", hasta)
      
      const response = await fetch(`/api/export/sheets/auth?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Error al conectar con Google")
      }
      
      // Abrir popup de autorización de Google
      window.open(data.authUrl, "_blank", "width=500,height=600")
    } catch (err) {
      showToast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo conectar con Google",
        type: "error",
      })
    }
  }

  if (!session) return null

  return (
    <div>
      <Header
        title="Histórico de movimientos"
        subtitle="Registro de todas las operaciones de inventario"
        user={session.user}
      />

      <div className="p-6">
        {/* Filtros */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* Tipo */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--sinvello-text-dark)] mb-1">
                Tipo de movimiento
              </label>
              <div className="relative">
                <Filter
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sinvello-text)]"
                />
                <select
                  value={tipoFiltro}
                  onChange={(e) => {
                    setTipoFiltro(e.target.value)
                    setPagination((p) => ({ ...p, page: 1 }))
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                             focus:border-[var(--sinvello-primary)] transition-all appearance-none bg-white"
                >
                  <option value="">Todos los tipos</option>
                  <option value="REPOSICION">Reposición</option>
                  <option value="CONSUMO">Consumo</option>
                  <option value="AJUSTE">Ajuste</option>
                </select>
              </div>
            </div>

            {/* Desde */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--sinvello-text-dark)] mb-1">
                Desde
              </label>
              <div className="relative">
                <Calendar
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sinvello-text)]"
                />
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => {
                    setDesde(e.target.value)
                    setPagination((p) => ({ ...p, page: 1 }))
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                             focus:border-[var(--sinvello-primary)] transition-all"
                />
              </div>
            </div>

            {/* Hasta */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--sinvello-text-dark)] mb-1">
                Hasta
              </label>
              <div className="relative">
                <Calendar
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sinvello-text)]"
                />
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => {
                    setHasta(e.target.value)
                    setPagination((p) => ({ ...p, page: 1 }))
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                             focus:border-[var(--sinvello-primary)] transition-all"
                />
              </div>
            </div>

            {/* Exportar CSV */}
            <button
              onClick={exportarCSV}
              disabled={movimientos.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg
                         border border-[var(--border)] text-[var(--foreground)]
                         bg-[var(--input)] hover:bg-[var(--muted)]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all"
            >
              <Download size={18} />
              CSV
            </button>

            {/* Exportar Excel */}
            <button
              onClick={exportarExcel}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg
                         bg-[var(--sinvello-primary)] text-white font-medium
                         hover:bg-[var(--sinvello-primary-hover)]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all"
            >
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isExporting ? "Exportando..." : "Excel"}
            </button>

            {/* Exportar Google Sheets */}
            <button
              onClick={exportarSheets}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg
                         bg-gradient-to-r from-green-500 to-green-600 text-white font-medium
                         hover:from-green-600 hover:to-green-700
                         transition-all"
            >
              <FileSpreadsheet size={18} />
              Google Sheets
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 mb-6 rounded-lg bg-red-50 border border-red-200 text-red-600">
            {error}
          </div>
        )}

        {/* Tabla */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-[var(--sinvello-primary)]" size={40} />
            </div>
          ) : movimientos.length === 0 ? (
            <div className="text-center py-20">
              <History size={48} className="mx-auto text-[var(--sinvello-text)] mb-4" />
              <p className="text-lg text-[var(--sinvello-text-dark)]">
                No hay movimientos registrados
              </p>
              <p className="text-[var(--sinvello-text)]">
                Los movimientos aparecerán aquí cuando se realicen
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--muted)]">
                    <tr>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                        Fecha
                      </th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                        Producto
                      </th>
                      {session.user.rol === Rol.CENTRAL && (
                        <th className="text-left py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                          Franquicia
                        </th>
                      )}
                      <th className="text-left py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                        Tipo
                      </th>
                      <th className="text-right py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                        Cantidad
                      </th>
                      <th className="text-right py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                        Stock
                      </th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                        Usuario
                      </th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                        Notas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((mov) => (
                      <tr
                        key={mov.id}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50"
                      >
                        <td className="py-4 px-4 text-[var(--sinvello-text)]">
                          {formatDate(mov.createdAt)}
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-[var(--sinvello-text-dark)]">
                              {mov.inventario.producto.nombre}
                            </p>
                            <p className="text-xs text-[var(--sinvello-text)]">
                              {mov.inventario.producto.categoria}
                            </p>
                          </div>
                        </td>
                        {session.user.rol === Rol.CENTRAL && (
                          <td className="py-4 px-4 text-[var(--sinvello-text)]">
                            {mov.inventario.franquicia.nombre}
                          </td>
                        )}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {getTipoIcon(mov.tipo)}
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoStyle(
                                mov.tipo
                              )}`}
                            >
                              {mov.tipo}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span
                            className={`font-medium ${
                              mov.tipo === "REPOSICION"
                                ? "text-green-600"
                                : mov.tipo === "CONSUMO"
                                ? "text-red-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {mov.tipo === "REPOSICION" ? "+" : mov.tipo === "CONSUMO" ? "-" : ""}
                            {mov.cantidad}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-[var(--sinvello-text)]">
                          {mov.cantidadAnterior} → {mov.cantidadNueva}
                        </td>
                        <td className="py-4 px-4 text-[var(--sinvello-text)]">
                          {mov.usuario
                            ? `${mov.usuario.nombre} ${mov.usuario.apellidos || ""}`
                            : "Sistema"}
                        </td>
                        <td className="py-4 px-4 text-[var(--sinvello-text)] max-w-[200px] truncate">
                          {mov.notas || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between p-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--sinvello-text)]">
                  Mostrando {(pagination.page - 1) * pagination.limit + 1} -{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
                  {pagination.total} movimientos
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                    }
                    disabled={pagination.page === 1}
                    className="p-2 rounded-lg border border-[var(--border)]
                               disabled:opacity-50 disabled:cursor-not-allowed
                               hover:bg-[var(--muted)] transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <span className="px-4 py-2 text-sm">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>

                  <button
                    onClick={() =>
                      setPagination((p) => ({
                        ...p,
                        page: Math.min(p.totalPages, p.page + 1),
                      }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 rounded-lg border border-[var(--border)]
                               disabled:opacity-50 disabled:cursor-not-allowed
                               hover:bg-[var(--muted)] transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
