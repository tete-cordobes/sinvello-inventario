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
      className={`card overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95
                 bg-gradient-to-br from-[var(--card)] to-[var(--muted)] ${
        isStockBajo ? "ring-2 ring-red-500 ring-offset-2" : ""
      }`}
    >
      {/* Image */}
      <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
        {imagenUrl ? (
          <Image
            src={imagenUrl}
            alt={nombre}
            fill
            className="object-contain p-2"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
            Sin imagen
          </div>
        )}

        {/* Categoria badge */}
        <span className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-[var(--sinvello-secondary)] to-[var(--sinvello-secondary-hover)] text-white text-xs rounded-full shadow-md">
          {categoria}
        </span>

        {/* Stock bajo alert */}
        {isStockBajo && (
          <div className="absolute top-2 right-2 p-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full
                     animate-pulse shadow-lg shadow-red-500/50">
            <AlertTriangle size={14} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-[var(--foreground)] line-clamp-2 min-h-[3rem]">
          {nombre}
        </h3>

        {precio !== null && (
          <p className="text-[var(--primary)] font-medium mt-1">
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
          <div className="h-2.5 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isStockBajo
                  ? "bg-gradient-to-r from-red-500 to-red-600"
                  : stockStatus === "alto"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600"
                  : "bg-gradient-to-r from-green-500 to-green-600"
              }`}
              style={{
                width: `${Math.min((cantidadActual / stockMaximo) * 100, 100)}%`,
              }}
            />
          </div>

          <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1">
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
                       bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md"
          >
            <Minus size={16} />
            <span className="text-sm font-medium">Usar</span>
          </button>

          <button
            onClick={onReposicion}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg
                       bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50
                       transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Reponer</span>
          </button>
        </div>
      </div>
    </div>
  )
}
