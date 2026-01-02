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
  ChevronDown,
  ChevronUp,
  Store,
} from "lucide-react"
import { Rol } from "@prisma/client"

interface Usuario {
  id: string
  email: string
  gmail: string | null
  nombre: string
  apellidos: string | null
  rol: "CENTRAL" | "FRANQUICIADO" | "TECNICO"
  activo: boolean
  createdAt: string
  franquicias: Array<{
    id: string
    nombre: string
    codigo: string
  }>
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
  const [misFranquicias, setMisFranquicias] = useState<Franquicia[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [franquiciasDropdown, setFranquiciasDropdown] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nombre: "",
    apellidos: "",
    gmail: "",
    rol: "TECNICO" as "CENTRAL" | "FRANQUICIADO" | "TECNICO",
    franquiciasIds: [] as string[],
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      // CENTRAL puede ver todos los usuarios y franquicias
      if (session.user.rol === "CENTRAL") {
        fetchUsuarios()
        fetchFranquicias()
      }
      // FRANQUICIADO puede ver usuarios y crear técnicos para sus franquicias
      else if (session.user.rol === "FRANQUICIADO") {
        fetchUsuarios()
        fetchMisFranquicias()
      }
      // TECNICO no tiene acceso
      else {
        router.push("/dashboard")
      }
    }
  }, [session, router])

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

  const fetchMisFranquicias = async () => {
    try {
      const res = await fetch("/api/usuarios/me")
      if (res.ok) {
        const data = await res.json()
        setMisFranquicias(data.franquicias || [])
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

    // Validar franquicias según el rol
    let franquiciasIds = formData.franquiciasIds
    if (formData.rol === "CENTRAL") {
      franquiciasIds = []
    } else if (franquiciasIds.length === 0) {
      alert("Debes seleccionar al menos una franquicia")
      return
    }

    const payload = editingUsuario
      ? {
          nombre: formData.nombre,
          apellidos: formData.apellidos || null,
          gmail: formData.gmail || null,
          rol: formData.rol,
          franquiciasIds: formData.rol === "CENTRAL" ? [] : franquiciasIds,
          ...(formData.password && { password: formData.password }),
        }
      : {
          ...formData,
          gmail: formData.gmail || null,
          franquiciasIds: formData.rol === "CENTRAL" ? [] : franquiciasIds,
        }

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
          gmail: "",
          rol: "TECNICO",
          franquiciasIds: [],
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
      gmail: usuario.gmail || "",
      rol: usuario.rol,
      franquiciasIds: usuario.franquicias.map((f) => f.id),
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

  const toggleFranquicia = (franquiciaId: string) => {
    setFormData((prev) => {
      const newIds = prev.franquiciasIds.includes(franquiciaId)
        ? prev.franquiciasIds.filter((id) => id !== franquiciaId)
        : [...prev.franquiciasIds, franquiciaId]
      return { ...prev, franquiciasIds: newIds }
    })
  }

  const getAvailableFranquicias = () => {
    if (session?.user?.rol === "CENTRAL") {
      return franquicias
    } else {
      return misFranquicias
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (session?.user?.rol === "TECNICO") {
    return null
  }

  const availableRoles = session?.user?.rol === "FRANQUICIADO"
    ? [{ value: "TECNICO", label: "Técnico (solo inventario)" }]
    : [
        { value: "CENTRAL", label: "Central (acceso total)" },
        { value: "FRANQUICIADO", label: "Franquiciado (múltiples franquicias)" },
        { value: "TECNICO", label: "Técnico (solo inventario)" },
      ]

  return (
    <div className="space-y-6">
      <Header
        title="Usuarios"
        subtitle={
          session?.user?.rol === "CENTRAL"
            ? "Gestión de usuarios del sistema"
            : "Gestión de técnicos de tus franquicias"
        }
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
              gmail: "",
              rol: session?.user?.rol === "FRANQUICIADO" ? "TECNICO" : "TECNICO",
              franquiciasIds: [],
            })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--sinvello-primary)] text-white rounded-lg hover:bg-[var(--sinvello-primary)]/90 transition-colors"
        >
          <Plus size={20} />
          Nuevo {session?.user?.rol === "FRANQUICIADO" ? "Técnico" : "Usuario"}
        </button>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">
                Franquicias
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[var(--foreground)] uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {usuarios.map((usuario) => (
              <tr
                key={usuario.id}
                className={!usuario.activo ? "bg-[var(--muted)]/50 opacity-60" : ""}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--sinvello-primary)]/10 rounded-full flex items-center justify-center">
                      <User className="text-[var(--sinvello-primary)]" size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-[var(--foreground)]">
                        {usuario.nombre} {usuario.apellidos}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Mail size={16} className="text-[var(--muted-foreground)]" />
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
                  {usuario.franquicias.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {usuario.franquicias.slice(0, 2).map((f) => (
                        <span
                          key={f.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--muted)] text-[var(--foreground)]"
                        >
                          <Store size={12} />
                          {f.nombre}
                        </span>
                      ))}
                      {usuario.franquicias.length > 2 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs text-[var(--muted-foreground)]">
                          +{usuario.franquicias.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[var(--muted-foreground)]">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {usuario.activo ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                      <Check size={12} />
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs">
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
                      className="p-1 hover:bg-[var(--muted)] rounded"
                    >
                      <MoreVertical size={20} className="text-[var(--muted-foreground)]" />
                    </button>
                    {menuOpen === usuario.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-[var(--card)] rounded-lg shadow-lg border border-[var(--border)] py-1 z-10">
                        <button
                          onClick={() => handleEdit(usuario)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--muted)] flex items-center gap-2"
                        >
                          <Pencil size={16} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(usuario)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--muted)] flex items-center gap-2"
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
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            No hay usuarios registrados
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">
              {editingUsuario ? "Editar Usuario" : "Nuevo Usuario"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--sinvello-primary)] focus:border-[var(--sinvello-primary)] bg-[var(--input)] text-[var(--foreground)]"
                  placeholder="usuario@sinvello.es"
                  required
                  disabled={!!editingUsuario}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  {editingUsuario ? "Nueva Contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--sinvello-primary)] focus:border-[var(--sinvello-primary)] bg-[var(--input)] text-[var(--foreground)]"
                  placeholder="••••••••"
                  required={!editingUsuario}
                  minLength={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--sinvello-primary)] focus:border-[var(--sinvello-primary)] bg-[var(--input)] text-[var(--foreground)]"
                    placeholder="Juan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) =>
                      setFormData({ ...formData, apellidos: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--sinvello-primary)] focus:border-[var(--sinvello-primary)] bg-[var(--input)] text-[var(--foreground)]"
                    placeholder="García"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Gmail (para Google Sheets)
                </label>
                <input
                  type="email"
                  value={formData.gmail}
                  onChange={(e) =>
                    setFormData({ ...formData, gmail: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--sinvello-primary)] focus:border-[var(--sinvello-primary)] bg-[var(--input)] text-[var(--foreground)]"
                  placeholder="usuario@gmail.com"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Email de Google para login y exportar a Sheets
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Rol *
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rol: e.target.value as "CENTRAL" | "FRANQUICIADO" | "TECNICO",
                      franquiciasIds: [],
                    })
                  }
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--sinvello-primary)] focus:border-[var(--sinvello-primary)] bg-[var(--input)] text-[var(--foreground)]"
                  required
                >
                  {availableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              {formData.rol !== "CENTRAL" && (
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Franquicias *
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setFranquiciasDropdown(!franquiciasDropdown)}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--sinvello-primary)] focus:border-[var(--sinvello-primary)] bg-[var(--input)] text-[var(--foreground)] text-left flex items-center justify-between"
                    >
                      <span>
                        {formData.franquiciasIds.length === 0
                          ? "Seleccionar franquicias"
                          : `${formData.franquiciasIds.length} seleccionada(s)`}
                      </span>
                      {franquiciasDropdown ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>
                    {franquiciasDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {getAvailableFranquicias().map((f) => (
                          <label
                            key={f.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--muted)] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.franquiciasIds.includes(f.id)}
                              onChange={() => toggleFranquicia(f.id)}
                              className="rounded border-[var(--border)] text-[var(--sinvello-primary)] focus:ring-[var(--sinvello-primary)]"
                            />
                            <span className="text-sm text-[var(--foreground)]">
                              {f.nombre} ({f.codigo})
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.franquiciasIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.franquiciasIds.map((fid) => {
                        const f = getAvailableFranquicias().find((fr) => fr.id === fid)
                        return f ? (
                          <span
                            key={fid}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--muted)] text-[var(--foreground)]"
                          >
                            {f.nombre}
                            <button
                              type="button"
                              onClick={() => toggleFranquicia(fid)}
                              className="hover:text-red-500"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingUsuario(null)
                    setFranquiciasDropdown(false)
                  }}
                  className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] text-[var(--foreground)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[var(--sinvello-primary)] text-white rounded-lg hover:bg-[var(--sinvello-primary)]/90"
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
