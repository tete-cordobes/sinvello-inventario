import { Rol } from "@prisma/client"

// Extensión de tipos para NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      nombre: string
      apellidos?: string
      rol: Rol
      franquiciaId?: string
      franquiciaNombre?: string
    }
  }

  interface User {
    id: string
    email: string
    nombre: string
    apellidos?: string
    rol: Rol
    franquiciaId?: string
    franquiciaNombre?: string
  }
}

// JWT types are handled via type casting in auth.ts
// This avoids module resolution issues with next-auth v5

// Tipos para la API
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Tipos para filtros
export interface MovimientoFilters {
  franquiciaId?: string
  productoId?: string
  tipo?: "REPOSICION" | "CONSUMO" | "AJUSTE"
  origen?: "MANUAL" | "WEBHOOK" | "SISTEMA"
  desde?: string
  hasta?: string
}

export interface InventarioFilters {
  franquiciaId?: string
  categoria?: string
  stockBajo?: boolean
  busqueda?: string
}

// Tipos para reportes
export interface ConsumoData {
  fecha: string
  producto: string
  cantidad: number
}

export interface ProductoConsumo {
  productoId: string
  nombre: string
  totalConsumo: number
  totalReposicion: number
}

// Tipo para el webhook
export interface WebhookConsumoPayload {
  api_key: string
  franquicia_codigo: string
  consumos: {
    producto_id: string
    cantidad: number
  }[]
}
