import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { TipoMovimiento, OrigenMovimiento } from "@prisma/client"

interface ConsumoItem {
  producto_sku: string
  cantidad: number
}

interface WebhookPayload {
  api_key: string
  franquicia_codigo: string
  consumos: ConsumoItem[]
}

export async function POST(request: NextRequest) {
  try {
    const body: WebhookPayload = await request.json()
    const { api_key, franquicia_codigo, consumos } = body

    // Validar API key
    if (!api_key) {
      return NextResponse.json(
        { error: "API key requerida" },
        { status: 401 }
      )
    }

    const webhookConfig = await prisma.webhookConfig.findUnique({
      where: { apiKey: api_key },
    })

    if (!webhookConfig || !webhookConfig.activo) {
      return NextResponse.json(
        { error: "API key inválida o desactivada" },
        { status: 401 }
      )
    }

    // Validar franquicia
    if (!franquicia_codigo) {
      return NextResponse.json(
        { error: "Código de franquicia requerido" },
        { status: 400 }
      )
    }

    const franquicia = await prisma.franquicia.findUnique({
      where: { codigo: franquicia_codigo },
    })

    if (!franquicia || !franquicia.activo) {
      return NextResponse.json(
        { error: "Franquicia no encontrada o inactiva" },
        { status: 404 }
      )
    }

    // Validar consumos
    if (!consumos || !Array.isArray(consumos) || consumos.length === 0) {
      return NextResponse.json(
        { error: "Lista de consumos requerida" },
        { status: 400 }
      )
    }

    // Procesar cada consumo
    const resultados: {
      sku: string
      success: boolean
      mensaje: string
      cantidadAnterior?: number
      cantidadNueva?: number
    }[] = []

    for (const consumo of consumos) {
      try {
        if (!consumo.producto_sku || !consumo.cantidad || consumo.cantidad < 1) {
          resultados.push({
            sku: consumo.producto_sku || "desconocido",
            success: false,
            mensaje: "SKU o cantidad inválida",
          })
          continue
        }

        // Buscar producto
        const producto = await prisma.producto.findUnique({
          where: { sku: consumo.producto_sku },
        })

        if (!producto) {
          resultados.push({
            sku: consumo.producto_sku,
            success: false,
            mensaje: "Producto no encontrado",
          })
          continue
        }

        // Buscar inventario de la franquicia
        const inventario = await prisma.inventario.findUnique({
          where: {
            franquiciaId_productoId: {
              franquiciaId: franquicia.id,
              productoId: producto.id,
            },
          },
        })

        if (!inventario) {
          resultados.push({
            sku: consumo.producto_sku,
            success: false,
            mensaje: "Producto no encontrado en inventario de la franquicia",
          })
          continue
        }

        // Verificar stock suficiente
        if (inventario.cantidadActual < consumo.cantidad) {
          resultados.push({
            sku: consumo.producto_sku,
            success: false,
            mensaje: `Stock insuficiente (actual: ${inventario.cantidadActual})`,
          })
          continue
        }

        // Realizar consumo
        const cantidadAnterior = inventario.cantidadActual
        const cantidadNueva = cantidadAnterior - consumo.cantidad

        await prisma.$transaction([
          prisma.inventario.update({
            where: { id: inventario.id },
            data: { cantidadActual: cantidadNueva },
          }),
          prisma.movimiento.create({
            data: {
              tipo: TipoMovimiento.CONSUMO,
              cantidad: consumo.cantidad,
              cantidadAnterior,
              cantidadNueva,
              notas: "Consumo automático vía webhook semanal",
              origen: OrigenMovimiento.WEBHOOK,
              inventarioId: inventario.id,
              usuarioId: null, // No hay usuario asociado
            },
          }),
        ])

        resultados.push({
          sku: consumo.producto_sku,
          success: true,
          mensaje: "Consumo registrado",
          cantidadAnterior,
          cantidadNueva,
        })
      } catch (err) {
        resultados.push({
          sku: consumo.producto_sku,
          success: false,
          mensaje: err instanceof Error ? err.message : "Error desconocido",
        })
      }
    }

    const exitosos = resultados.filter((r) => r.success).length
    const fallidos = resultados.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      mensaje: `Procesados ${exitosos} consumos exitosamente, ${fallidos} fallidos`,
      franquicia: franquicia.nombre,
      resultados,
    })
  } catch (error) {
    console.error("Error en webhook consumo-semanal:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// GET para verificar estado del webhook
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhook/consumo-semanal",
    metodo: "POST",
    descripcion: "Endpoint para registrar consumos semanales automáticos",
    payload: {
      api_key: "string (requerido)",
      franquicia_codigo: "string (requerido)",
      consumos: [
        {
          producto_sku: "string (requerido)",
          cantidad: "number (requerido)",
        },
      ],
    },
  })
}
