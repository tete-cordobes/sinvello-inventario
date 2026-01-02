"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/Header"
import ProductCard from "@/components/inventario/ProductCard"
import MovimientoModal from "@/components/inventario/MovimientoModal"
import { Search, Filter, AlertTriangle, Package, Loader2, Edit3, X, Save, ArrowLeft, Store, ChevronRight } from "lucide-react"
import { Rol } from "@prisma/client"
import { PageSkeleton } from "@/components/ui/Skeleton"
import { showToast } from "@/components/ui/Toast"

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

interface ProductoGroup {
  productoId: string
  nombre: string
  imagenUrl: string | null
  categoria: string
  precio: number | null
  inventarios: InventarioItem[]
}

interface Categoria {
  nombre: string
  count: number
}

export default function InventarioPage() {
  const { data: session } = useSession()
  const [inventario, setInventario] = useState<InventarioItem[]>([])
  const [productosAgrupados, setProductosAgrupados] = useState<ProductoGroup[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [franquicias, setFranquicias] = useState<{ id: string; nombre: string; codigo: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Filtros
  const [busqueda, setBusqueda] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("")
  const [stockBajo, setStockBajo] = useState(false)
  const [franquiciaFiltro, setFranquiciaFiltro] = useState("")

  // Vista de detalle
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoGroup | null>(null)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTipo, setModalTipo] = useState<"REPOSICION" | "CONSUMO">("REPOSICION")
  const [productoSeleccionadoModal, setProductoSeleccionadoModal] = useState<{
    id: string
    inventarioId: string
    nombre: string
    cantidadActual: number
    stockMaximo: number
  } | null>(null)

  // Bulk edit mode
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [bulkChanges, setBulkChanges] = useState<Record<string, {
    cantidadActual: number
    stockMinimo?: number
    stockMaximo?: number
  }>>({})
  const [isSaving, setIsSaving] = useState(false)

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
      
      // Extraer franquicias únicas
      const franquiciasMap = new Map<string, { id: string; nombre: string; codigo: string }>()
      data.data.forEach((item: InventarioItem) => {
        if (!franquiciasMap.has(item.franquicia.id)) {
          franquiciasMap.set(item.franquicia.id, {
            id: item.franquicia.id,
            nombre: item.franquicia.nombre,
            codigo: item.franquicia.codigo
          })
        }
      })
      setFranquicias(Array.from(franquiciasMap.values()))
      
      // Agrupar productos
      const productosMap = new Map<string, ProductoGroup>()
      data.data.forEach((item: InventarioItem) => {
        if (!productosMap.has(item.producto.id)) {
          productosMap.set(item.producto.id, {
            productoId: item.producto.id,
            nombre: item.producto.nombre,
            imagenUrl: item.producto.imagenUrl,
            categoria: item.producto.categoria,
            precio: item.producto.precio,
            inventarios: []
          })
        }
        productosMap.get(item.producto.id)!.inventarios.push(item)
      })
      
      let productos = Array.from(productosMap.values())
      
      // Filtrar por categoría
      if (categoriaFiltro) {
        productos = productos.filter(p => p.categoria === categoriaFiltro)
      }
      
      // Filtrar por búsqueda
      if (busqueda) {
        productos = productos.filter(p => 
          p.nombre.toLowerCase().includes(busqueda.toLowerCase())
        )
      }
      
      // Filtrar por stock bajo (si algún inventario tiene stock bajo)
      if (stockBajo) {
        productos = productos.filter(p => 
          p.inventarios.some(inv => inv.cantidadActual <= inv.stockMinimo)
        )
      }
      
      setProductosAgrupados(productos)
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
    setProductoSeleccionadoModal({
      id: item.producto.id,
      inventarioId: item.id,
      nombre: item.producto.nombre,
      cantidadActual: item.cantidadActual,
      stockMaximo: item.stockMaximo,
    })
    setModalOpen(true)
  }

  const handleBulkChange = (inventarioId: string, field: string, value: number) => {
    setBulkChanges((prev) => ({
      ...prev,
      [inventarioId]: {
        ...prev[inventarioId],
        [field]: value,
      },
    }))
  }

  const handleBulkSave = async () => {
    setIsSaving(true)
    setError("")

    try {
      const updates = Object.entries(bulkChanges).map(([inventarioId, changes]) => ({
        inventarioId,
        ...changes,
      }))

      const response = await fetch("/api/inventario/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualizaciones: updates }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      setBulkChanges({})
      setBulkEditMode(false)
      await fetchInventario()
      showToast({
        title: "Cambios guardados",
        description: `${Object.keys(bulkChanges).length} productos actualizados`,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar cambios")
    } finally {
      setIsSaving(false)
    }
  }

  const stockBajoCount = inventario.filter(
    (item) => item.cantidadActual <= item.stockMinimo
  ).length

  // Filtrar inventario por franquicia (para bulk mode)
  const inventarioFiltrado = franquiciaFiltro 
    ? inventario.filter(item => item.franquicia.id === franquiciaFiltro)
    : inventario

  if (!session) return null

  // Vista de detalle de un producto
  if (productoSeleccionado && !bulkEditMode) {
    return (
      <div>
        <Header
          title="Inventario"
          subtitle="Stock por franquicia"
          user={session.user}
        />

        <div className="p-6">
          <button
            onClick={() => setProductoSeleccionado(null)}
            className="flex items-center gap-2 mb-6 text-[var(--sinvello-primary)] hover:text-[var(--sinvello-primary)]/80 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Volver a productos</span>
          </button>

          <div className="card p-6 mb-6 bg-gradient-to-br from-[var(--card)] to-[var(--muted)]">
            <div className="flex items-start gap-4">
              {productoSeleccionado.imagenUrl && (
                <img
                  src={productoSeleccionado.imagenUrl}
                  alt={productoSeleccionado.nombre}
                  className="w-24 h-24 rounded-lg object-contain"
                />
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                  {productoSeleccionado.nombre}
                </h2>
                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-[var(--muted)] text-[var(--foreground)]">
                    {productoSeleccionado.categoria}
                  </span>
                  {productoSeleccionado.precio && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {productoSeleccionado.precio.toFixed(2)}€
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[var(--muted)] to-[var(--border)]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--foreground)]">
                    Franquicia
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-[var(--foreground)]">
                    Stock Actual
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-[var(--foreground)]">
                    Stock Mínimo
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-[var(--foreground)]">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-[var(--foreground)]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {productoSeleccionado.inventarios.map((inv) => {
                  const esStockBajo = inv.cantidadActual <= inv.stockMinimo
                  const esStockMaximo = inv.cantidadActual >= inv.stockMaximo
                  
                  return (
                    <tr
                      key={inv.id}
                      className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors ${
                        esStockBajo ? "bg-red-50/50 dark:bg-red-900/20" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[var(--muted)] rounded-lg">
                            <Store size={18} className="text-[var(--sinvello-primary)]" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--foreground)]">
                              {inv.franquicia.nombre}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {inv.franquicia.codigo}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-lg font-bold ${
                          esStockBajo ? "text-red-600 dark:text-red-400" : "text-[var(--foreground)]"
                        }`}>
                          {inv.cantidadActual}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--muted-foreground)]">
                        {inv.stockMinimo}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {esStockBajo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <AlertTriangle size={12} />
                            Bajo
                          </span>
                        ) : esStockMaximo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Máximo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleOpenModal("REPOSICION", inv)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                          >
                            + Reposición
                          </button>
                          <button
                            onClick={() => handleOpenModal("CONSUMO", inv)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            - Consumo
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {productoSeleccionadoModal && (
          <MovimientoModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            tipo={modalTipo}
            producto={productoSeleccionadoModal}
            onSuccess={fetchInventario}
          />
        )}
      </div>
    )
  }

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
        <div className="card p-4 mb-6 bg-gradient-to-br from-[var(--card)] to-[var(--muted)]">
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
                           bg-[var(--input)] text-[var(--foreground)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                           focus:border-[var(--sinvello-primary)] transition-all
                           placeholder:text-[var(--muted-foreground)]"
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
                           appearance-none bg-[var(--input)] text-[var(--foreground)] min-w-[180px]"
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all
                         shadow-sm hover:shadow-md active:scale-95 ${
                stockBajo
                  ? "bg-gradient-to-r from-red-500 to-red-600 border-red-400 text-white"
                  : "border-[var(--border)] text-[var(--foreground)] bg-[var(--input)] hover:bg-[var(--muted)]"
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

            {/* Botón modo bulk */}
            {(session.user.rol === Rol.CENTRAL || session.user.rol === Rol.FRANQUICIADO || session.user.rol === Rol.TECNICO) && (
              <button
                onClick={() => {
                  if (bulkEditMode) {
                    setBulkEditMode(false)
                    setBulkChanges({})
                    setFranquiciaFiltro("")
                  } else {
                    setBulkEditMode(true)
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all
                           shadow-sm hover:shadow-md active:scale-95 ${
                  bulkEditMode
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 text-white"
                    : "border-[var(--border)] text-[var(--foreground)] bg-[var(--input)] hover:bg-[var(--muted)]"
                }`}
              >
                {bulkEditMode ? <X size={18} /> : <Edit3 size={18} />}
                <span>{bulkEditMode ? "Cancelar bulk" : "Edición bulk"}</span>
              </button>
            )}
          </div>

          {/* Filtro de franquicia para modo bulk (CENTRAL ve todas, otros ven sus franquicias) */}
          {bulkEditMode && franquicias.length > 0 && (
            <div className="mt-4">
              <div className="relative">
                <Store
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sinvello-text)]"
                />
                <select
                  value={franquiciaFiltro}
                  onChange={(e) => setFranquiciaFiltro(e.target.value)}
                  className="pl-10 pr-8 py-2.5 rounded-lg border border-[var(--border)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                             focus:border-[var(--sinvello-primary)] transition-all
                             appearance-none bg-[var(--input)] text-[var(--foreground)] min-w-[200px]"
                >
                  <option value="">Todas las franquicias</option>
                  {franquicias.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre} ({f.codigo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Botones de acción cuando está en modo bulk */}
          {bulkEditMode && Object.keys(bulkChanges).length > 0 && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleBulkSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg
                           hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all active:scale-95 shadow-md"
              >
                <Save size={18} />
                <span>{isSaving ? "Guardando..." : "Guardar cambios"}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {Object.keys(bulkChanges).length}
                </span>
              </button>
              <button
                onClick={() => setBulkChanges({})}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg
                           hover:from-gray-700 hover:to-gray-800 transition-all active:scale-95 shadow-md"
              >
                <X size={18} />
                <span>Descartar cambios</span>
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 mb-6 rounded-lg bg-gradient-to-r from-red-500 to-red-600 border border-red-400 text-white shadow-lg">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[var(--sinvello-primary)]" size={40} />
          </div>
         ) : productosAgrupados.length === 0 ? (
           <div className="text-center py-20">
             <Package size={48} className="mx-auto text-[var(--muted-foreground)] mb-4" />
             <p className="text-lg text-[var(--foreground)]">
               No se encontraron productos
             </p>
             <p className="text-[var(--muted-foreground)]">
               Intenta con otros filtros de búsqueda
             </p>
           </div>
           ) : (
           /* Grid de productos o tabla bulk */
           bulkEditMode ? (
             <div className="overflow-x-auto">
               <table className="w-full bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-lg">
                 <thead className="bg-gradient-to-r from-[var(--muted)] to-[var(--border)]">
                   <tr>
                     <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">
                       Producto
                     </th>
                     <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">
                       Categoría
                     </th>
                     <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">
                       Franquicia
                     </th>
                     <th className="px-4 py-3 text-right text-sm font-medium text-[var(--foreground)]">
                       Stock Actual
                     </th>
                     <th className="px-4 py-3 text-right text-sm font-medium text-[var(--foreground)]">
                       Stock Mínimo
                     </th>
                     <th className="px-4 py-3 text-right text-sm font-medium text-[var(--foreground)]">
                       Stock Máximo
                     </th>
                   </tr>
                 </thead>
                <tbody>
                  {inventarioFiltrado.map((item) => {
                    const changes = bulkChanges[item.id] || {}
                    const hasChanges = Object.keys(changes).length > 0

                     return (
                       <tr
                         key={item.id}
                         className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors ${
                           hasChanges ? "bg-blue-50 dark:bg-blue-900/30" : ""
                         }`}
                       >
                         <td className="px-4 py-3">
                           <div className="flex items-center gap-3">
                             {item.producto.imagenUrl && (
                               <img
                                 src={item.producto.imagenUrl}
                                 alt={item.producto.nombre}
                                 className="w-10 h-10 rounded object-contain"
                               />
                             )}
                             <p className="font-medium text-[var(--foreground)]">
                               {item.producto.nombre}
                             </p>
                           </div>
                         </td>
                         <td className="px-4 py-3">
                           <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[var(--muted)] text-[var(--foreground)]">
                             {item.producto.categoria}
                           </span>
                         </td>
                         <td className="px-4 py-3">
                           <div className="flex items-center gap-2">
                             <Store size={14} className="text-[var(--muted-foreground)]" />
                             <span className="text-sm text-[var(--foreground)]">
                               {item.franquicia.nombre}
                             </span>
                           </div>
                         </td>
                         <td className="px-4 py-3">
                           <input
                             type="number"
                             min="0"
                             value={changes.cantidadActual ?? item.cantidadActual}
                             onChange={(e) =>
                               handleBulkChange(item.id, "cantidadActual", parseInt(e.target.value) || 0)
                             }
                             className={`w-24 text-right px-2 py-1 rounded border transition-all
                                        focus:ring-2 focus:ring-[var(--sinvello-primary)]/20 bg-[var(--input)] text-[var(--foreground)] ${
                               hasChanges && changes.cantidadActual !== undefined
                                 ? "border-blue-300 dark:border-blue-500 focus:border-blue-500"
                                 : "border-[var(--border)] focus:border-[var(--sinvello-primary)]"
                             }`}
                           />
                         </td>
                         <td className="px-4 py-3">
                           <input
                             type="number"
                             min="0"
                             value={changes.stockMinimo ?? item.stockMinimo}
                             onChange={(e) =>
                               handleBulkChange(item.id, "stockMinimo", parseInt(e.target.value) || 0)
                             }
                             className={`w-24 text-right px-2 py-1 rounded border transition-all
                                        focus:ring-2 focus:ring-[var(--sinvello-primary)]/20 bg-[var(--input)] text-[var(--foreground)] ${
                               changes.stockMinimo !== undefined
                                 ? "border-blue-300 dark:border-blue-500 focus:border-blue-500"
                                 : "border-[var(--border)] focus:border-[var(--sinvello-primary)]"
                             }`}
                           />
                         </td>
                         <td className="px-4 py-3">
                           <input
                             type="number"
                             min="0"
                             value={changes.stockMaximo ?? item.stockMaximo}
                             onChange={(e) =>
                               handleBulkChange(item.id, "stockMaximo", parseInt(e.target.value) || 0)
                             }
                             className={`w-24 text-right px-2 py-1 rounded border transition-all
                                        focus:ring-2 focus:ring-[var(--sinvello-primary)]/20 bg-[var(--input)] text-[var(--foreground)] ${
                               changes.stockMaximo !== undefined
                                 ? "border-blue-300 dark:border-blue-500 focus:border-blue-500"
                                 : "border-[var(--border)] focus:border-[var(--sinvello-primary)]"
                             }`}
                           />
                         </td>
                       </tr>
                     )
                   })}
                 </tbody>
               </table>
             </div>
           ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {productosAgrupados.map((producto) => {
                 const stockTotal = producto.inventarios.reduce((sum, inv) => sum + inv.cantidadActual, 0)
                 const stockMinimoTotal = producto.inventarios.reduce((sum, inv) => sum + inv.stockMinimo, 0)
                 
                 return (
                   <div
                     key={producto.productoId}
                     onClick={() => setProductoSeleccionado(producto)}
                     className="card bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-lg cursor-pointer
                            hover:shadow-xl hover:border-[var(--sinvello-primary)]/50 transition-all active:scale-95 overflow-hidden"
                   >
                     <div className="aspect-square bg-[var(--muted)] flex items-center justify-center relative">
                       {producto.imagenUrl ? (
                         <img
                           src={producto.imagenUrl}
                           alt={producto.nombre}
                           className="w-full h-full object-contain p-4"
                         />
                       ) : (
                         <Package size={64} className="text-[var(--muted-foreground)]" />
                       )}
                       <div className="absolute top-2 right-2">
                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[var(--muted)]/80 backdrop-blur text-[var(--foreground)]">
                           {producto.inventarios.length} {producto.inventarios.length === 1 ? 'franquicia' : 'franquicias'}
                         </span>
                       </div>
                     </div>
                     <div className="p-4">
                       <h3 className="font-semibold text-[var(--foreground)] mb-2 line-clamp-2">
                         {producto.nombre}
                       </h3>
                       <div className="flex flex-wrap gap-2 mb-3">
                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[var(--muted)] text-[var(--foreground)]">
                           {producto.categoria}
                         </span>
                       </div>
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="text-xs text-[var(--muted-foreground)]">Stock total</p>
                           <p className="text-lg font-bold text-[var(--foreground)]">{stockTotal}</p>
                         </div>
                         <div className="flex items-center gap-1 text-[var(--sinvello-primary)]">
                           <ChevronRight size={20} />
                         </div>
                       </div>
                     </div>
                   </div>
                 )
               })}
             </div>
           )
         )}

         {/* Resumen */}
         {!isLoading && productosAgrupados.length > 0 && (
           <div className="mt-6 text-center text-[var(--muted-foreground)]">
             Mostrando {productosAgrupados.length} productos
           </div>
         )}
      </div>

      {/* Modal de movimiento */}
      {productoSeleccionadoModal && (
        <MovimientoModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          tipo={modalTipo}
          producto={productoSeleccionadoModal}
          onSuccess={fetchInventario}
        />
      )}
    </div>
  )
}
