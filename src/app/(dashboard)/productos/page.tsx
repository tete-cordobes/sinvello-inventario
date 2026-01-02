"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/Header"
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  Loader2,
  X,
  Save,
  Filter,
  Image as ImageIcon,
} from "lucide-react"
import { showToast } from "@/components/ui/Toast"

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  precio: number | null
  imagenUrl: string | null
  categoria: string
  sku: string | null
  activo: boolean
  _count: {
    inventario: number
  }
}

const CATEGORIAS = [
  "Sin categoría",
  "CONSUMIBLES",
  "DESECHABLES",
  "EQUIPAMIENTO",
  "LIMPIEZA",
  "MERCH",
  "PRODUCTO",
  "TEXTIL",
]

export default function ProductosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [productos, setProductos] = useState<Producto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("")
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    imagenUrl: "",
    categoria: "Sin categoría",
    sku: "",
  })

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchProductos = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/productos")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setProductos(data)
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al cargar productos",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.rol !== "CENTRAL") {
        router.push("/dashboard")
        return
      }
      fetchProductos()
    }
  }, [status, session, router, fetchProductos])

  const openCreateModal = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      imagenUrl: "",
      categoria: "Sin categoría",
      sku: "",
    })
    setProductoEditando(null)
    setModalMode("create")
    setModalOpen(true)
  }

  const openEditModal = (producto: Producto) => {
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || "",
      precio: producto.precio?.toString() || "",
      imagenUrl: producto.imagenUrl || "",
      categoria: producto.categoria,
      sku: producto.sku || "",
    })
    setProductoEditando(producto)
    setModalMode("edit")
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = modalMode === "create" 
        ? "/api/productos" 
        : `/api/productos/${productoEditando?.id}`
      
      const response = await fetch(url, {
        method: modalMode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      showToast({
        title: modalMode === "create" ? "Producto creado" : "Producto actualizado",
        description: `${formData.nombre} se ha ${modalMode === "create" ? "creado" : "actualizado"} correctamente`,
      })

      setModalOpen(false)
      fetchProductos()
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar",
        type: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/productos/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      showToast({
        title: "Producto eliminado",
        description: data.message,
      })

      setDeleteConfirm(null)
      fetchProductos()
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar",
        type: "error",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtrar productos
  const productosFiltrados = productos.filter((p) => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.sku?.toLowerCase().includes(busqueda.toLowerCase()) ?? false)
    const matchCategoria = !categoriaFiltro || p.categoria === categoriaFiltro
    const matchActivo = mostrarInactivos || p.activo
    return matchBusqueda && matchCategoria && matchActivo
  })

  // Obtener categorías únicas de los productos
  const categoriasExistentes = [...new Set(productos.map((p) => p.categoria))].sort()

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-[var(--sinvello-primary)]" size={40} />
      </div>
    )
  }

  if (!session || session.user.rol !== "CENTRAL") {
    return null
  }

  return (
    <div>
      <Header
        title="Catálogo de Productos"
        subtitle="Gestiona los productos disponibles para todas las franquicias"
        user={session.user}
      />

      <div className="p-6">
        {/* Filtros y acciones */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sinvello-text)]"
              />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)]
                           bg-[var(--input)] text-[var(--foreground)]
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
                           appearance-none bg-[var(--input)] text-[var(--foreground)] min-w-[180px]"
              >
                <option value="">Todas las categorías</option>
                {categoriasExistentes.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Mostrar inactivos */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] text-[var(--sinvello-primary)]
                           focus:ring-[var(--sinvello-primary)]"
              />
              <span className="text-sm text-[var(--foreground)]">Mostrar inactivos</span>
            </label>

            {/* Botón crear */}
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg
                         bg-gradient-to-r from-[var(--sinvello-primary)] to-[var(--sinvello-primary-hover)]
                         text-white font-medium shadow-lg shadow-[var(--sinvello-primary)]/30
                         hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} />
              <span>Nuevo producto</span>
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-[var(--sinvello-text)]">Total productos</p>
            <p className="text-2xl font-bold text-[var(--foreground)]">{productos.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-[var(--sinvello-text)]">Activos</p>
            <p className="text-2xl font-bold text-green-600">{productos.filter(p => p.activo).length}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-[var(--sinvello-text)]">Inactivos</p>
            <p className="text-2xl font-bold text-red-600">{productos.filter(p => !p.activo).length}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-[var(--sinvello-text)]">Categorías</p>
            <p className="text-2xl font-bold text-[var(--foreground)]">{categoriasExistentes.length}</p>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="card overflow-hidden">
          {productosFiltrados.length === 0 ? (
            <div className="text-center py-20">
              <Package size={48} className="mx-auto text-[var(--sinvello-text)] mb-4" />
              <p className="text-lg text-[var(--foreground)]">
                {busqueda || categoriaFiltro ? "No se encontraron productos" : "No hay productos"}
              </p>
              <p className="text-[var(--sinvello-text)]">
                {busqueda || categoriaFiltro ? "Prueba con otros filtros" : "Crea el primer producto"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--muted)]">
                  <tr>
                    <th className="text-left py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                      Producto
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                      SKU
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                      Categoría
                    </th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                      Precio
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                      Estado
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-[var(--sinvello-text)]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((producto) => (
                    <tr
                      key={producto.id}
                      className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors
                                 ${!producto.activo ? "opacity-60" : ""}`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {producto.imagenUrl ? (
                            <img
                              src={producto.imagenUrl}
                              alt={producto.nombre}
                              className="w-10 h-10 rounded-lg object-contain bg-white"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                              <ImageIcon size={20} className="text-[var(--sinvello-text)]" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-[var(--foreground)]">{producto.nombre}</p>
                            {producto.descripcion && (
                              <p className="text-xs text-[var(--sinvello-text)] truncate max-w-[200px]">
                                {producto.descripcion}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[var(--sinvello-text)]">
                        {producto.sku || "-"}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--muted)] text-[var(--foreground)]">
                          {producto.categoria}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-[var(--foreground)]">
                        {producto.precio ? `${producto.precio.toFixed(2)} €` : "-"}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            producto.activo
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {producto.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(producto)}
                            className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(producto.id)}
                            className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative bg-[var(--card)] rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                {modalMode === "create" ? "Nuevo producto" : "Editar producto"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)]
                             bg-[var(--input)] text-[var(--foreground)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                             focus:border-[var(--sinvello-primary)] transition-all"
                />
              </div>

              {/* SKU y Precio */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)]
                               bg-[var(--input)] text-[var(--foreground)]
                               focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                               focus:border-[var(--sinvello-primary)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Precio (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)]
                               bg-[var(--input)] text-[var(--foreground)]
                               focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                               focus:border-[var(--sinvello-primary)] transition-all"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Categoría
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)]
                             bg-[var(--input)] text-[var(--foreground)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                             focus:border-[var(--sinvello-primary)] transition-all"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* URL imagen */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  URL de imagen
                </label>
                <input
                  type="url"
                  value={formData.imagenUrl}
                  onChange={(e) => setFormData({ ...formData, imagenUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)]
                             bg-[var(--input)] text-[var(--foreground)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                             focus:border-[var(--sinvello-primary)] transition-all"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)]
                             bg-[var(--input)] text-[var(--foreground)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]/20
                             focus:border-[var(--sinvello-primary)] transition-all resize-none"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)]
                             text-[var(--foreground)] hover:bg-[var(--muted)] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                             bg-gradient-to-r from-[var(--sinvello-primary)] to-[var(--sinvello-primary-hover)]
                             text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                             hover:shadow-lg transition-all"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  <span>{isSaving ? "Guardando..." : "Guardar"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-[var(--card)] rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
              ¿Eliminar producto?
            </h2>
            <p className="text-[var(--sinvello-text)] mb-6">
              Si el producto tiene historial de movimientos, se desactivará en lugar de eliminarse.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)]
                           text-[var(--foreground)] hover:bg-[var(--muted)] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                           bg-gradient-to-r from-red-500 to-red-600 text-white font-medium
                           disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
              >
                {isDeleting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Trash2 size={18} />
                )}
                <span>{isDeleting ? "Eliminando..." : "Eliminar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
