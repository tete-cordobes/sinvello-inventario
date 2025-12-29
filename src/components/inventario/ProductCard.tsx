"use client"

import Image from "next/image"
import { Plus, Minus, AlertTriangle } from "lucide-react"
import { formatCurrency, getStockStatus } from "@/lib/utils"

interface ProductCardProps {
  id: string
  nombre: string
  imagenUrl: string | null
  categoria: string
  precio: number | null
  cantidadActual: number
  stockMinimo: number
  stockMaximo: number
  onReposicion: () => void
  onConsumo: () => void
}

export default function ProductCard({
  nombre,
  imagenUrl,
  categoria,
  precio,
  cantidadActual,
  stockMinimo,
  stockMaximo,
  onReposicion,
  onConsumo,
}: ProductCardProps) {
  const stockStatus = getStockStatus(cantidadActual, stockMinimo, stockMaximo)
  const isStockBajo = stockStatus === "bajo"

  return (
    <div
      className={`card overflow-hidden transition-all duration-200 hover:shadow-lg ${
        isStockBajo ? "ring-2 ring-red-500" : ""
      }`}
    >
      {/* Image */}
      <div className="relative h-40 bg-gray-100">
        {imagenUrl ? (
          <Image
            src={imagenUrl}
            alt={nombre}
            fill
            className="object-contain p-2"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Sin imagen
          </div>
        )}

        {/* Categoria badge */}
        <span className="absolute top-2 left-2 px-2 py-1 bg-[var(--sinvello-secondary)] text-white text-xs rounded-full">
          {categoria}
        </span>

        {/* Stock bajo alert */}
        {isStockBajo && (
          <div className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full animate-pulse">
            <AlertTriangle size={14} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-[var(--sinvello-text-dark)] line-clamp-2 min-h-[3rem]">
          {nombre}
        </h3>

        {precio !== null && (
          <p className="text-[var(--sinvello-primary)] font-medium mt-1">
            {formatCurrency(precio)}
          </p>
        )}

        {/* Stock indicator */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-[var(--sinvello-text)]">Stock</span>
            <span
              className={`text-sm font-bold ${
                isStockBajo
                  ? "text-red-600"
                  : stockStatus === "alto"
                  ? "text-blue-600"
                  : "text-green-600"
              }`}
            >
              {cantidadActual} uds
            </span>
          </div>

          {/* Stock bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isStockBajo
                  ? "bg-red-500"
                  : stockStatus === "alto"
                  ? "bg-blue-500"
                  : "bg-green-500"
              }`}
              style={{
                width: `${Math.min((cantidadActual / stockMaximo) * 100, 100)}%`,
              }}
            />
          </div>

          <div className="flex justify-between text-xs text-[var(--sinvello-text)] mt-1">
            <span>Mín: {stockMinimo}</span>
            <span>Máx: {stockMaximo}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onConsumo}
            disabled={cantidadActual === 0}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg
                       bg-red-100 text-red-700 hover:bg-red-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200"
          >
            <Minus size={16} />
            <span className="text-sm font-medium">Usar</span>
          </button>

          <button
            onClick={onReposicion}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg
                       bg-green-100 text-green-700 hover:bg-green-200
                       transition-colors duration-200"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Reponer</span>
          </button>
        </div>
      </div>
    </div>
  )
}
