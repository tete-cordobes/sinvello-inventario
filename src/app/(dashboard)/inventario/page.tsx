"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/Header"
import ProductCard from "@/components/inventario/ProductCard"
import MovimientoModal from "@/components/inventario/MovimientoModal"
import { Search, Filter, AlertTriangle, Package, Loader2 } from "lucide-react"
import { Rol } from "@prisma/client"

interface InventarioItem {
  id: string
  cantidadActual: number
  stockMinimo: number
  stockMaximo: number
  producto: {
    id: string
    nombre: string
    imagenUrl: string | null
    categoria: string
    precio: number | null
  }
  franquicia: {
    id: string
    nombre: string
    codigo: string
  }
}

interface Categoria {
  nombre: string
  count: number
}

export default function InventarioPage() {
  const { data: session } = useSession()
  const [inventario, setInventario] = useState<InventarioItem[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Filtros
  const [busqueda, setBusqueda] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("")
  const [stockBajo, setStockBajo] = useState(false)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTipo, setModalTipo] = useState<"REPOSICION" | "CONSUMO">("REPOSICION")
  const [productoSeleccionado, setProductoSeleccionado] = useState<{
    id: string
    inventarioId: string
    nombre: string
    cantidadActual: number
    stockMaximo: number
  } | null>(null)

  const fetchInventario = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (busqueda) params.set("busqueda", busqueda)
      if (categoriaFiltro) params.set("categoria", categoriaFiltro)
      if (stockBajo) params.set("stockBajo", "true")

      const response = await fetch(`/api/inventario?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setInventario(data.data)
      setCategorias(data.categorias)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar inventario")
    } finally {
      setIsLoading(false)
    }
  }, [busqueda, categoriaFiltro, stockBajo])

  useEffect(() => {
    fetchInventario()
  }, [fetchInventario])

  const handleOpenModal = (
    tipo: "REPOSICION" | "CONSUMO",
    item: InventarioItem
  ) => {
    setModalTipo(tipo)
    setProductoSeleccionado({
      id: item.producto.id,
      inventarioId: item.id,
      nombre: item.producto.nombre,
      cantidadActual: item.cantidadActual,
      stockMaximo: item.stockMaximo,
    })
    setModalOpen(true)
  }

  const stockBajoCount = inventario.filter(
    (item) => item.cantidadActual <= item.stockMinimo
  ).length

  if (!session) return null

  return (
    <div>
      <Header
        title="Inventario"
        subtitle={
          session.user.rol === Rol.CENTRAL
            ? "Gestión de stock de todas las franquicias"
            : `Stock de ${session.user.franquiciaNombre}`
        }
        user={session.user}
      />

      <div className="p-6">
        {/* Filtros */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sinvello-text)]"
              />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                           focus:border-[var(--sinvello-primary)] transition-all"
              />
            </div>

            {/* Categoría */}
            <div className="relative">
              <Filter
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sinvello-text)]"
              />
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="pl-10 pr-8 py-2.5 rounded-lg border border-[var(--border)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                           focus:border-[var(--sinvello-primary)] transition-all
                           appearance-none bg-white min-w-[180px]"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat.nombre} value={cat.nombre}>
                    {cat.nombre} ({cat.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Stock bajo */}
            <button
              onClick={() => setStockBajo(!stockBajo)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                stockBajo
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "border-[var(--border)] text-[var(--sinvello-text-dark)] hover:bg-[var(--muted)]"
              }`}
            >
              <AlertTriangle size={18} />
              <span>Stock bajo</span>
              {stockBajoCount > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    stockBajo ? "bg-red-200 text-red-800" : "bg-red-100 text-red-700"
                  }`}
                >
                  {stockBajoCount}
                </span>
              )}
            </button>
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
        ) : inventario.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto text-[var(--sinvello-text)] mb-4" />
            <p className="text-lg text-[var(--sinvello-text-dark)]">
              No se encontraron productos
            </p>
            <p className="text-[var(--sinvello-text)]">
              Intenta con otros filtros de búsqueda
            </p>
          </div>
        ) : (
          /* Grid de productos */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {inventario.map((item) => (
              <ProductCard
                key={item.id}
                id={item.producto.id}
                nombre={item.producto.nombre}
                imagenUrl={item.producto.imagenUrl}
                categoria={item.producto.categoria}
                precio={item.producto.precio}
                cantidadActual={item.cantidadActual}
                stockMinimo={item.stockMinimo}
                stockMaximo={item.stockMaximo}
                onReposicion={() => handleOpenModal("REPOSICION", item)}
                onConsumo={() => handleOpenModal("CONSUMO", item)}
              />
            ))}
          </div>
        )}

        {/* Resumen */}
        {!isLoading && inventario.length > 0 && (
          <div className="mt-6 text-center text-[var(--sinvello-text)]">
            Mostrando {inventario.length} productos
          </div>
        )}
      </div>

      {/* Modal de movimiento */}
      {productoSeleccionado && (
        <MovimientoModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          tipo={modalTipo}
          producto={productoSeleccionado}
          onSuccess={fetchInventario}
        />
      )}
    </div>
  )
}
