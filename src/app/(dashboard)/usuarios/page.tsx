"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/Header"
import {
  Users,
  Plus,
  Mail,
  Building2,
  Shield,
  MoreVertical,
  Pencil,
  Check,
  X,
  User,
} from "lucide-react"

interface Usuario {
  id: string
  email: string
  nombre: string
  apellidos: string | null
  rol: "CENTRAL" | "FRANQUICIADO" | "TECNICO"
  activo: boolean
  createdAt: string
  franquicia: {
    id: string
    nombre: string
    codigo: string
  } | null
}

interface Franquicia {
  id: string
  nombre: string
  codigo: string
}

const rolLabels = {
  CENTRAL: { label: "Central", color: "bg-purple-100 text-purple-700" },
  FRANQUICIADO: { label: "Franquiciado", color: "bg-blue-100 text-blue-700" },
  TECNICO: { label: "Técnico", color: "bg-green-100 text-green-700" },
}

export default function UsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [franquicias, setFranquicias] = useState<Franquicia[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nombre: "",
    apellidos: "",
    rol: "TECNICO" as "CENTRAL" | "FRANQUICIADO" | "TECNICO",
    franquiciaId: "",
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
      fetchUsuarios()
      fetchFranquicias()
    }
  }, [session])

  const fetchUsuarios = async () => {
    try {
      const res = await fetch("/api/usuarios")
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data)
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFranquicias = async () => {
    try {
      const res = await fetch("/api/franquicias")
      if (res.ok) {
        const data = await res.json()
        setFranquicias(data)
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = editingUsuario
      ? `/api/usuarios/${editingUsuario.id}`
      : "/api/usuarios"
    const method = editingUsuario ? "PATCH" : "POST"

    const payload = editingUsuario
      ? {
          nombre: formData.nombre,
          apellidos: formData.apellidos || null,
          rol: formData.rol,
          franquiciaId: formData.rol === "CENTRAL" ? null : formData.franquiciaId,
          ...(formData.password && { password: formData.password }),
        }
      : formData

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingUsuario(null)
        setFormData({
          email: "",
          password: "",
          nombre: "",
          apellidos: "",
          rol: "TECNICO",
          franquiciaId: "",
        })
        fetchUsuarios()
      } else {
        const error = await res.json()
        alert(error.error || "Error al guardar")
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario)
    setFormData({
      email: usuario.email,
      password: "",
      nombre: usuario.nombre,
      apellidos: usuario.apellidos || "",
      rol: usuario.rol,
      franquiciaId: usuario.franquicia?.id || "",
    })
    setShowModal(true)
    setMenuOpen(null)
  }

  const handleToggleActive = async (usuario: Usuario) => {
    try {
      await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !usuario.activo }),
      })
      fetchUsuarios()
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
        title="Usuarios"
        subtitle="Gestión de usuarios del sistema"
      />

      {/* Botón agregar */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingUsuario(null)
            setFormData({
              email: "",
              password: "",
              nombre: "",
              apellidos: "",
              rol: "TECNICO",
              franquiciaId: "",
            })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Franquicia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {usuarios.map((usuario) => (
              <tr
                key={usuario.id}
                className={!usuario.activo ? "bg-gray-50 opacity-60" : ""}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="text-primary" size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {usuario.nombre} {usuario.apellidos}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={16} className="text-gray-400" />
                    {usuario.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      rolLabels[usuario.rol].color
                    }`}
                  >
                    <Shield size={12} />
                    {rolLabels[usuario.rol].label}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {usuario.franquicia ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 size={16} className="text-gray-400" />
                      {usuario.franquicia.nombre}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {usuario.activo ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      <Check size={12} />
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                      <X size={12} />
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setMenuOpen(menuOpen === usuario.id ? null : usuario.id)
                      }
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical size={20} className="text-gray-400" />
                    </button>
                    {menuOpen === usuario.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
                        <button
                          onClick={() => handleEdit(usuario)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Pencil size={16} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(usuario)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          {usuario.activo ? (
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {usuarios.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            No hay usuarios registrados
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingUsuario ? "Editar Usuario" : "Nuevo Usuario"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="usuario@sinvello.es"
                  required
                  disabled={!!editingUsuario}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUsuario ? "Nueva Contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="••••••••"
                  required={!editingUsuario}
                  minLength={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Juan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) =>
                      setFormData({ ...formData, apellidos: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="García"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rol: e.target.value as "CENTRAL" | "FRANQUICIADO" | "TECNICO",
                      franquiciaId: e.target.value === "CENTRAL" ? "" : formData.franquiciaId,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="CENTRAL">Central (acceso total)</option>
                  <option value="FRANQUICIADO">Franquiciado (su franquicia)</option>
                  <option value="TECNICO">Técnico (solo inventario)</option>
                </select>
              </div>
              {formData.rol !== "CENTRAL" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Franquicia *
                  </label>
                  <select
                    value={formData.franquiciaId}
                    onChange={(e) =>
                      setFormData({ ...formData, franquiciaId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required={formData.rol !== "CENTRAL"}
                  >
                    <option value="">Seleccionar franquicia</option>
                    {franquicias.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre} ({f.codigo})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingUsuario(null)
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  {editingUsuario ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
