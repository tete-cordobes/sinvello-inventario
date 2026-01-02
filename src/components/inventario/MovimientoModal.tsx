"use client"

import { useState } from "react"
import { X, Plus, Minus, Loader2 } from "lucide-react"

interface MovimientoModalProps {
  isOpen: boolean
  onClose: () => void
  tipo: "REPOSICION" | "CONSUMO"
  producto: {
    id: string
    inventarioId: string
    nombre: string
    cantidadActual: number
    stockMaximo: number
    franquiciaId?: string
    productoId?: string
  }
  onSuccess: () => void
}

export default function MovimientoModal({
  isOpen,
  onClose,
  tipo,
  producto,
  onSuccess,
}: MovimientoModalProps) {
  const [cantidad, setCantidad] = useState(1)
  const [notas, setNotas] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const esReposicion = tipo === "REPOSICION"
  const maxCantidad = esReposicion
    ? producto.stockMaximo - producto.cantidadActual
    : producto.cantidadActual

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const esNuevo = producto.inventarioId.startsWith("nuevo_")
      const response = await fetch(
        `/api/inventario/${producto.inventarioId}/movimiento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo,
            cantidad,
            notas: notas.trim() || undefined,
            // Enviar franquiciaId y productoId si es nuevo inventario
            ...(esNuevo && {
              franquiciaId: producto.franquiciaId,
              productoId: producto.productoId,
            }),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al registrar movimiento")
      }

      onSuccess()
      onClose()
      setCantidad(1)
      setNotas("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-fadeIn">
        {/* Header */}
        <div
          className={`p-6 rounded-t-2xl ${
            esReposicion
              ? "bg-gradient-to-r from-green-500 to-green-600"
              : "bg-gradient-to-r from-red-500 to-red-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              {esReposicion ? <Plus size={24} /> : <Minus size={24} />}
              <h2 className="text-xl font-bold">
                {esReposicion ? "Reponer stock" : "Registrar consumo"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Producto info */}
          <div className="p-4 bg-[var(--muted)] rounded-lg">
            <p className="font-medium text-[var(--sinvello-text-dark)]">
              {producto.nombre}
            </p>
            <p className="text-sm text-[var(--sinvello-text)] mt-1">
              Stock actual: <strong>{producto.cantidadActual} unidades</strong>
            </p>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium text-[var(--sinvello-text-dark)] mb-2">
              Cantidad a {esReposicion ? "reponer" : "consumir"}
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                className="p-3 rounded-lg bg-[var(--muted)] hover:bg-gray-200 transition-colors"
              >
                <Minus size={20} />
              </button>

              <input
                type="number"
                min={1}
                max={maxCantidad}
                value={cantidad}
                onChange={(e) =>
                  setCantidad(
                    Math.min(Math.max(1, parseInt(e.target.value) || 1), maxCantidad)
                  )
                }
                className="flex-1 text-center text-2xl font-bold py-3 rounded-lg border
                           border-[var(--border)] focus:outline-none focus:ring-2
                           focus:ring-[var(--sinvello-primary)]"
              />

              <button
                type="button"
                onClick={() => setCantidad(Math.min(maxCantidad, cantidad + 1))}
                className="p-3 rounded-lg bg-[var(--muted)] hover:bg-gray-200 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            <p className="text-xs text-[var(--sinvello-text)] mt-2 text-center">
              {esReposicion
                ? `Máximo: ${maxCantidad} (hasta ${producto.stockMaximo} total)`
                : `Disponible: ${producto.cantidadActual}`}
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-[var(--sinvello-text-dark)] mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder={
                esReposicion
                  ? "Ej: Pedido recibido el 15/01..."
                  : "Ej: Usado en cliente María García..."
              }
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--sinvello-primary)]
                         resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Preview */}
          <div className="p-4 rounded-lg border border-dashed border-[var(--border)]">
            <p className="text-sm text-[var(--sinvello-text)]">
              Stock después del movimiento:
            </p>
            <p className="text-2xl font-bold text-[var(--sinvello-text-dark)] mt-1">
              {esReposicion
                ? producto.cantidadActual + cantidad
                : producto.cantidadActual - cantidad}{" "}
              <span className="text-base font-normal text-[var(--sinvello-text)]">
                unidades
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-lg border border-[var(--border)]
                         text-[var(--sinvello-text-dark)] font-medium
                         hover:bg-[var(--muted)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || cantidad < 1}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white
                         flex items-center justify-center gap-2 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed ${
                           esReposicion
                             ? "bg-green-500 hover:bg-green-600"
                             : "bg-red-500 hover:bg-red-600"
                         }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Procesando...
                </>
              ) : (
                <>
                  {esReposicion ? <Plus size={18} /> : <Minus size={18} />}
                  Confirmar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
