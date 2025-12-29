"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/Header"
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Users,
  Package,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react"

interface Franquicia {
  id: string
  codigo: string
  nombre: string
  direccion: string | null
  telefono: string | null
  email: string | null
  activo: boolean
  createdAt: string
  _count: {
    usuarios: number
    inventario: number
  }
}

export default function FranquiciasPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [franquicias, setFranquicias] = useState<Franquicia[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingFranquicia, setEditingFranquicia] = useState<Franquicia | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    direccion: "",
    telefono: "",
    email: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (session?.user?.rol !== "CENTRAL") {
      router.push("/dashboard")
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user?.rol === "CENTRAL") {
      fetchFranquicias()
    }
  }, [session])

  const fetchFranquicias = async () => {
    try {
      const res = await fetch("/api/franquicias")
      if (res.ok) {
        const data = await res.json()
        setFranquicias(data)
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = editingFranquicia
      ? `/api/franquicias/${editingFranquicia.id}`
      : "/api/franquicias"
    const method = editingFranquicia ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingFranquicia(null)
        setFormData({ codigo: "", nombre: "", direccion: "", telefono: "", email: "" })
        fetchFranquicias()
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleEdit = (franquicia: Franquicia) => {
    setEditingFranquicia(franquicia)
    setFormData({
      codigo: franquicia.codigo,
      nombre: franquicia.nombre,
      direccion: franquicia.direccion || "",
      telefono: franquicia.telefono || "",
      email: franquicia.email || "",
    })
    setShowModal(true)
    setMenuOpen(null)
  }

  const handleToggleActive = async (franquicia: Franquicia) => {
    try {
      await fetch(`/api/franquicias/${franquicia.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !franquicia.activo }),
      })
      fetchFranquicias()
    } catch (error) {
      console.error("Error:", error)
    }
    setMenuOpen(null)
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (session?.user?.rol !== "CENTRAL") {
    return null
  }

  return (
    <div className="space-y-6">
      <Header
        title="Franquicias"
        subtitle="Gestión de franquicias SinVello"
      />

      {/* Botón agregar */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingFranquicia(null)
            setFormData({ codigo: "", nombre: "", direccion: "", telefono: "", email: "" })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Nueva Franquicia
        </button>
      </div>

      {/* Grid de franquicias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {franquicias.map((franquicia) => (
          <div
            key={franquicia.id}
            className={`bg-white rounded-xl shadow-sm border p-6 ${
              !franquicia.activo ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{franquicia.nombre}</h3>
                  <span className="text-sm text-gray-500">{franquicia.codigo}</span>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === franquicia.id ? null : franquicia.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <MoreVertical size={20} className="text-gray-400" />
                </button>
                {menuOpen === franquicia.id && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
                    <button
                      onClick={() => handleEdit(franquicia)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Pencil size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(franquicia)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      {franquicia.activo ? (
                        <>
                          <X size={16} />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Activar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {franquicia.direccion && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  {franquicia.direccion}
                </div>
              )}
              {franquicia.telefono && (
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  {franquicia.telefono}
                </div>
              )}
              {franquicia.email && (
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  {franquicia.email}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 pt-4 border-t">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Users size={16} />
                {franquicia._count.usuarios} usuarios
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Package size={16} />
                {franquicia._count.inventario} productos
              </div>
            </div>

            {!franquicia.activo && (
              <div className="mt-3 px-2 py-1 bg-red-100 text-red-700 text-xs rounded text-center">
                Inactiva
              </div>
            )}
          </div>
        ))}
      </div>

      {franquicias.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          No hay franquicias registradas
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">
              {editingFranquicia ? "Editar Franquicia" : "Nueva Franquicia"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="MAD001"
                  required
                  disabled={!!editingFranquicia}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="SinVello Madrid Centro"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Calle Gran Vía 123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="912 345 678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="madrid@sinvello.es"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingFranquicia(null)
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  {editingFranquicia ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
