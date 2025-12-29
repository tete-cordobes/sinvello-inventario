import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export function getStockStatus(actual: number, minimo: number, maximo: number): "bajo" | "ok" | "alto" {
  if (actual <= minimo) return "bajo"
  if (actual >= maximo) return "alto"
  return "ok"
}

export function getStockColor(status: "bajo" | "ok" | "alto"): string {
  switch (status) {
    case "bajo":
      return "text-red-600 bg-red-100"
    case "alto":
      return "text-blue-600 bg-blue-100"
    default:
      return "text-green-600 bg-green-100"
  }
}
